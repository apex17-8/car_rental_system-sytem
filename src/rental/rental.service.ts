import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rental, RentalStatus } from './entities/rental.entity';
import {
  Reservation,
  ReservationStatus,
} from './../reservation/entities/reservation.entity';
import { Car, CarAvailability } from './../car/entities/car.entity';
import { CreateRentalDto } from './dto/create-rental.dto';
import { UpdateRentalDto } from './dto/update-rental.dto';
import { LoggerService } from './../logger/services/logger.service';
import { UserRole } from './../user/entities/user.entity';

@Injectable()
export class RentalService {
  constructor(
    @InjectRepository(Rental)
    private rentalRepository: Repository<Rental>,
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Car)
    private carRepository: Repository<Car>,
    private readonly logger: LoggerService,
  ) {}

  async createFromReservation(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Rental> {
    try {
      // Only employees, managers, and admins can create rentals from reservations
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException('Only staff members can create rentals');
      }

      const reservation = await this.reservationRepository.findOne({
        where: { reservation_id },
        relations: ['car', 'customer'],
      });

      if (!reservation) {
        throw new NotFoundException('Reservation not found');
      }

      // Check if reservation can be converted to rental
      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new BadRequestException(
          'Only confirmed reservations can be converted to rentals',
        );
      }

      // Check if car is available
      if (reservation.car.availability !== CarAvailability.RESERVED) {
        throw new ConflictException('Car is not available for rental');
      }

      // Calculate rental period and amount
      const rentalDays = Math.ceil(
        (new Date(reservation.return_date).getTime() -
          new Date(reservation.pickup_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalAmount = this.calculateTotalAmount(
        rentalDays,
        reservation.car.rental_rate,
      );

      const rental = this.rentalRepository.create({
        car_id: reservation.car_id,
        customer_id: reservation.customer_id,
        rental_start_date: reservation.pickup_date,
        rental_end_date: reservation.return_date,
        pickup_location_id: reservation.pickup_location_id,
        return_location_id: reservation.return_location_id,
        reservation_id: reservation.reservation_id,
        total_amount: totalAmount,
        late_fee: 0,
        status: RentalStatus.ACTIVE,
      });

      const savedRental = await this.rentalRepository.save(rental);

      // Update reservation status
      await this.reservationRepository.update(reservation_id, {
        status: ReservationStatus.COMPLETED,
      });

      // Update car status to rented
      await this.carRepository.update(reservation.car_id, {
        availability: CarAvailability.RENTED,
        updated_at: new Date(),
      });

      this.logger.log(
        `Rental created from reservation successfully - Rental ID: ${savedRental.rental_id}, Reservation ID: ${reservation_id}`,
      );

      return savedRental;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to create rental from reservation', error);
      throw new HttpException(
        'Failed to create rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createDirect(
    createRentalDto: CreateRentalDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Rental> {
    try {
      // Only employees, managers, and admins can create direct rentals
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException(
          'Only staff members can create direct rentals',
        );
      }

      const { car_id, rental_start_date, rental_end_date, customer_id } =
        createRentalDto;

      // Validate rental dates
      if (rental_start_date >= rental_end_date) {
        throw new BadRequestException(
          'Rental end date must be after start date',
        );
      }

      if (new Date(rental_start_date) < new Date()) {
        throw new BadRequestException(
          'Rental start date cannot be in the past',
        );
      }

      // Verify car exists and is available
      const car = await this.carRepository.findOne({
        where: { car_id: car_id, is_active: true },
      });

      if (!car) {
        throw new NotFoundException('Car not found');
      }

      if (car.availability !== CarAvailability.AVAILABLE) {
        throw new ConflictException('Car is not available for rental');
      }

      // Check for overlapping rentals
      const hasOverlap = await this.checkOverlappingRentals(
        car_id,
        rental_start_date,
        rental_end_date,
      );
      if (hasOverlap) {
        throw new ConflictException(
          'Car is already rented for the selected dates',
        );
      }

      // Calculate total amount
      const rentalDays = Math.ceil(
        (new Date(rental_end_date).getTime() -
          new Date(rental_start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const totalAmount = this.calculateTotalAmount(
        rentalDays,
        car.rental_rate,
      );

      const rental = this.rentalRepository.create({
        ...createRentalDto,
        total_amount: totalAmount,
        late_fee: 0,
        status: RentalStatus.ACTIVE,
      });

      const savedRental = await this.rentalRepository.save(rental);

      // Update car status to rented
      await this.carRepository.update(car_id, {
        availability: CarAvailability.RENTED,
        updated_at: new Date(),
      });

      this.logger.log(
        `Direct rental created successfully - Rental ID: ${savedRental.rental_id}, Car ID: ${car_id}`,
      );

      return savedRental;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to create direct rental', error);
      throw new HttpException(
        'Failed to create rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Rental[]> {
    try {
      const whereCondition: any = {};

      // Authorization logic
      if (userRole === UserRole.CUSTOMER) {
        // Customers can only see their own rentals
        whereCondition.customer_id = customerId || userId;
      }
      // Employees, Managers, and Admins can see all rentals

      return await this.rentalRepository.find({
        where: whereCondition,
        relations: [
          'car',
          'customer',
          'pickup_location',
          'return_location',
          'reservation',
        ],
        order: { rental_start_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding rentals', error);
      throw new HttpException(
        'Error finding rentals',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(
    rental_id: number,
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Rental> {
    try {
      const rental = await this.rentalRepository.findOne({
        where: { rental_id },
        relations: [
          'car',
          'customer',
          'pickup_location',
          'return_location',
          'reservation',
          'payments',
        ],
      });

      if (!rental) {
        throw new NotFoundException(`Rental with id ${rental_id} not found`);
      }

      // Authorization: Customers can only view their own rentals
      if (userRole === UserRole.CUSTOMER && rental.customer_id !== customerId) {
        throw new ForbiddenException('Access denied to this rental');
      }

      return rental;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error finding rental with id ${rental_id}`, error);
      throw new HttpException(
        'Error while finding rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    rental_id: number,
    updateRentalDto: UpdateRentalDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Rental> {
    try {
      const rental = await this.findOne(rental_id, userId, userRole);

      // Only staff members can update rentals
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException('Only staff members can update rentals');
      }

      await this.rentalRepository.update(rental_id, updateRentalDto);

      const updatedRental = await this.rentalRepository.findOne({
        where: { rental_id },
        relations: ['car', 'customer'],
      });

      if (!updatedRental) {
        throw new NotFoundException(
          `Rental with ID ${rental_id} not found after update`,
        );
      }

      this.logger.log(
        `Rental updated successfully - ID: ${updatedRental.rental_id}`,
      );
      return updatedRental;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error updating rental with id ${rental_id}`, error);
      throw new HttpException(
        'Error while updating rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    rental_id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    try {
      const rental = await this.findOne(rental_id, userId, userRole);

      // Only admins can delete rentals
      if (userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('Only administrators can delete rentals');
      }

      // Cannot delete active rentals
      if (rental.status === RentalStatus.ACTIVE) {
        throw new BadRequestException('Cannot delete active rental');
      }

      const result = await this.rentalRepository.delete(rental_id);
      if (result.affected === 0) {
        throw new NotFoundException(`Rental with ID ${rental_id} not found`);
      }

      this.logger.log(`Rental deleted successfully - ID: ${rental_id}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error deleting rental with id ${rental_id}`, error);
      throw new HttpException(
        'Error while deleting rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async completeRental(
    rental_id: number,
    actual_return_date: Date,
    userId: number,
    userRole: UserRole,
  ): Promise<Rental> {
    try {
      // Only employees, managers, and admins can complete rentals
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException('Only staff members can complete rentals');
      }

      const rental = await this.rentalRepository.findOne({
        where: { rental_id },
        relations: ['car'],
      });

      if (!rental) {
        throw new NotFoundException('Rental not found');
      }

      // Can only complete active rentals
      if (rental.status !== RentalStatus.ACTIVE) {
        throw new BadRequestException('Only active rentals can be completed');
      }

      // Return date cannot be before start date
      if (new Date(actual_return_date) < new Date(rental.rental_start_date)) {
        throw new BadRequestException(
          'Return date cannot be before rental start date',
        );
      }

      // Calculate late fee if applicable
      const lateFee = await this.calculateLateFee(
        rental_id,
        actual_return_date,
      );

      await this.rentalRepository.update(rental_id, {
        status: RentalStatus.COMPLETED,
        actual_return_date: actual_return_date,
        late_fee: lateFee,
        total_amount: rental.total_amount + lateFee,
      });

      // Update car status back to available
      await this.carRepository.update(rental.car_id, {
        availability: CarAvailability.AVAILABLE,
        updated_at: new Date(),
      });

      const updatedRental = await this.rentalRepository.findOne({
        where: { rental_id },
        relations: ['car', 'customer'],
      });

      if (!updatedRental) {
        throw new NotFoundException(
          `Rental with ID ${rental_id} not found after completion`,
        );
      }

      this.logger.log(
        `Rental ${rental_id} completed successfully - Late Fee: $${updatedRental.late_fee}, Total Amount: $${updatedRental.total_amount}`,
      );
      return updatedRental;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Error completing rental with id ${rental_id}`, error);
      throw new HttpException(
        'Error while completing rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private calculateTotalAmount(rentalDays: number, dailyRate: number): number {
    let total = rentalDays * dailyRate;

    // Business rule: Weekly discount
    if (rentalDays >= 7) {
      total *= 0.9; // 10% discount for 7+ days
    }
    if (rentalDays >= 30) {
      total *= 0.8; // 20% discount for 30+ days
    }

    return Number(total.toFixed(2));
  }

  private async calculateLateFee(
    rental_id: number,
    actualReturnDate: Date,
  ): Promise<number> {
    try {
      const rental = await this.rentalRepository.findOne({
        where: { rental_id },
      });

      if (!rental || rental.status !== RentalStatus.ACTIVE) {
        return 0;
      }

      const actualReturn = new Date(actualReturnDate);
      const scheduledReturn = new Date(rental.rental_end_date);

      if (actualReturn <= scheduledReturn) {
        return 0;
      }

      // $50 per day late fee
      const daysLate = Math.ceil(
        (actualReturn.getTime() - scheduledReturn.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysLate * 50;
    } catch (error) {
      this.logger.error(
        `Error calculating late fee for rental ${rental_id}`,
        error,
      );
      return 0;
    }
  }

  private async checkOverlappingRentals(
    car_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    try {
      const overlappingRental = await this.rentalRepository
        .createQueryBuilder('rental')
        .where('rental.car_id = :carId', { carId: car_id })
        .andWhere('rental.status = :activeStatus', {
          activeStatus: RentalStatus.ACTIVE,
        })
        .andWhere(
          `(rental.rental_start_date BETWEEN :startDate AND :endDate OR
           rental.rental_end_date BETWEEN :startDate AND :endDate OR
           (rental.rental_start_date <= :startDate AND rental.rental_end_date >= :endDate))`,
        )
        .setParameters({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .getOne();

      return !!overlappingRental;
    } catch (error) {
      this.logger.error('Error checking overlapping rentals', error);
      return true; // Assume overlap if error occurs
    }
  }
}
