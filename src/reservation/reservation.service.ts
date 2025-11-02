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
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Car, CarAvailability } from './../car/entities/car.entity';
import { Customer } from './../customer/entities/customer.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { LoggerService } from './../logger/services/logger.service';
import { UserRole } from './../user/entities/user.entity';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private reservationRepository: Repository<Reservation>,
    @InjectRepository(Car)
    private carRepository: Repository<Car>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private readonly logger: LoggerService,
  ) {}

  async create(
    createReservationDto: CreateReservationDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Reservation> {
    try {
      const { car_id, pickup_date, return_date, customer_id } =
        createReservationDto;

      // Authorization: Customers can only create reservations for themselves
      if (userRole === UserRole.CUSTOMER && customer_id !== userId) {
        throw new ForbiddenException(
          'You can only create reservations for yourself',
        );
      }

      // Validate dates
      if (pickup_date >= return_date) {
        throw new BadRequestException('Return date must be after pickup date');
      }

      if (new Date(pickup_date) < new Date()) {
        throw new BadRequestException('Pickup date cannot be in the past');
      }

      // Reservation must be at least 1 hour in advance
      const minPickupTime = new Date(Date.now() + 60 * 60 * 1000);
      if (new Date(pickup_date) < minPickupTime) {
        throw new BadRequestException(
          'Reservation must be made at least 1 hour in advance',
        );
      }

      // Maximum rental duration is 30 days
      const rentalDuration =
        (new Date(return_date).getTime() - new Date(pickup_date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (rentalDuration > 30) {
        throw new BadRequestException('Maximum rental duration is 30 days');
      }

      // Verify car exists and is available
      const car = await this.carRepository.findOne({
        where: { car_id: car_id, is_active: true },
      });

      if (!car) {
        throw new NotFoundException('Car not found');
      }

      if (car.availability !== CarAvailability.AVAILABLE) {
        throw new ConflictException('Car is not available for reservation');
      }

      // Verify customer exists
      const customer = await this.customerRepository.findOne({
        where: { customer_id: customer_id },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      // Check if customer has valid driver license
      if (!customer.driver_license) {
        throw new BadRequestException(
          'Customer must have a valid driver license to make reservations',
        );
      }

      // Check car availability for dates
      const isAvailable = await this.checkCarAvailability(
        car_id,
        pickup_date,
        return_date,
      );
      if (!isAvailable) {
        throw new ConflictException(
          'Car is not available for the selected dates',
        );
      }

      const reservation = this.reservationRepository.create({
        ...createReservationDto,
        reservation_date: new Date(),
        status: ReservationStatus.PENDING,
      });

      const savedReservation =
        await this.reservationRepository.save(reservation);

      // Update car status to reserved
      await this.carRepository.update(car_id, {
        availability: CarAvailability.RESERVED,
        updated_at: new Date(),
      });

      this.logger.log(
        `Reservation created successfully - Reservation ID: ${savedReservation.reservation_id}, Customer ID: ${customer_id}, Car ID: ${car_id}`,
      );

      return savedReservation;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to create reservation', error);
      throw new HttpException(
        'Failed to create reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Reservation[]> {
    try {
      const whereCondition: any = {};

      // Authorization logic
      if (userRole === UserRole.CUSTOMER) {
        // Customers can only see their own reservations
        whereCondition.customer_id = customerId || userId;
      }
      // Employees, Managers, and Admins can see all reservations

      return await this.reservationRepository.find({
        where: whereCondition,
        relations: ['car', 'customer', 'pickup_location', 'return_location'],
        order: { reservation_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding reservations', error);
      throw new HttpException(
        'Error finding reservations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Reservation> {
    try {
      const reservation = await this.reservationRepository.findOne({
        where: { reservation_id },
        relations: ['car', 'customer', 'pickup_location', 'return_location'],
      });

      if (!reservation) {
        throw new NotFoundException(
          `Reservation with id ${reservation_id} not found`,
        );
      }

      // Authorization: Customers can only view their own reservations
      if (
        userRole === UserRole.CUSTOMER &&
        reservation.customer_id !== customerId
      ) {
        throw new ForbiddenException('Access denied to this reservation');
      }

      return reservation;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error finding reservation with id ${reservation_id}`,
        error,
      );
      throw new HttpException(
        'Error while finding reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    reservation_id: number,
    updateReservationDto: UpdateReservationDto,
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Reservation> {
    try {
      const reservation = await this.findOne(
        reservation_id,
        userId,
        userRole,
        customerId,
      );

      // Authorization: Customers can only update their own reservations
      if (
        userRole === UserRole.CUSTOMER &&
        reservation.customer_id !== customerId
      ) {
        throw new ForbiddenException(
          'You can only update your own reservations',
        );
      }

      // Cannot update completed or cancelled reservations
      if (
        reservation.status === ReservationStatus.COMPLETED ||
        reservation.status === ReservationStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot update completed or cancelled reservations',
        );
      }

      await this.reservationRepository.update(
        reservation_id,
        updateReservationDto,
      );

      const updatedReservation = await this.reservationRepository.findOne({
        where: { reservation_id },
        relations: ['car', 'customer'],
      });

      if (!updatedReservation) {
        throw new NotFoundException(
          `Reservation with ID ${reservation_id} not found after update`,
        );
      }

      this.logger.log(
        `Reservation updated successfully - ID: ${updatedReservation.reservation_id}`,
      );
      return updatedReservation;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating reservation with id ${reservation_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<void> {
    try {
      const reservation = await this.findOne(
        reservation_id,
        userId,
        userRole,
        customerId,
      );

      // Authorization: Customers can only delete their own reservations
      if (
        userRole === UserRole.CUSTOMER &&
        reservation.customer_id !== customerId
      ) {
        throw new ForbiddenException(
          'You can only delete your own reservations',
        );
      }

      // Cannot delete completed reservations
      if (reservation.status === ReservationStatus.COMPLETED) {
        throw new BadRequestException('Cannot delete completed reservation');
      }

      const result = await this.reservationRepository.delete(reservation_id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Reservation with ID ${reservation_id} not found`,
        );
      }

      // Update car status back to available if reservation was active
      if (
        reservation.status === ReservationStatus.PENDING ||
        reservation.status === ReservationStatus.CONFIRMED
      ) {
        await this.carRepository.update(reservation.car_id, {
          availability: CarAvailability.AVAILABLE,
          updated_at: new Date(),
        });
      }

      this.logger.log(
        `Reservation deleted successfully - ID: ${reservation_id}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error deleting reservation with id ${reservation_id}`,
        error,
      );
      throw new HttpException(
        'Error while deleting reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCustomer(
    customer_id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Reservation[]> {
    try {
      // Authorization: Customers can only view their own reservations
      if (userRole === UserRole.CUSTOMER && customer_id !== userId) {
        throw new ForbiddenException('You can only view your own reservations');
      }

      return await this.reservationRepository.find({
        where: { customer_id },
        relations: ['car', 'pickup_location', 'return_location'],
        order: { reservation_date: 'DESC' },
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(
        `Error finding reservations for customer ${customer_id}`,
        error,
      );
      throw new HttpException(
        'Error finding customer reservations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async cancel(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
    customerId?: number,
  ): Promise<Reservation> {
    try {
      const reservation = await this.findOne(
        reservation_id,
        userId,
        userRole,
        customerId,
      );

      // Authorization: Customers can only cancel their own reservations
      if (
        userRole === UserRole.CUSTOMER &&
        reservation.customer_id !== customerId
      ) {
        throw new ForbiddenException(
          'You can only cancel your own reservations',
        );
      }

      // Check cancellation policy (24 hours)
      const hoursUntilPickup =
        (new Date(reservation.pickup_date).getTime() - Date.now()) /
        (1000 * 60 * 60);

      if (hoursUntilPickup < 24) {
        throw new BadRequestException(
          'Reservation cannot be cancelled within 24 hours of pickup',
        );
      }

      // Cannot cancel completed reservations
      if (reservation.status === ReservationStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel a completed reservation');
      }

      await this.reservationRepository.update(reservation_id, {
        status: ReservationStatus.CANCELLED,
      });

      // Update car status back to available
      await this.carRepository.update(reservation.car_id, {
        availability: CarAvailability.AVAILABLE,
        updated_at: new Date(),
      });

      const updatedReservation = await this.findOne(
        reservation_id,
        userId,
        userRole,
        customerId,
      );
      this.logger.log(`Reservation ${reservation_id} cancelled successfully`);
      return updatedReservation;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error cancelling reservation with id ${reservation_id}`,
        error,
      );
      throw new HttpException(
        'Error while cancelling reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirm(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<Reservation> {
    try {
      const reservation = await this.findOne(reservation_id, userId, userRole);

      // Only employees, managers, and admins can confirm reservations
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException(
          'Only staff members can confirm reservations',
        );
      }

      // Only pending reservations can be confirmed
      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          'Only pending reservations can be confirmed',
        );
      }

      // Check if car is still available
      const isAvailable = await this.checkCarAvailability(
        reservation.car_id,
        reservation.pickup_date,
        reservation.return_date,
      );

      if (!isAvailable) {
        throw new ConflictException(
          'Car is no longer available for the selected dates',
        );
      }

      await this.reservationRepository.update(reservation_id, {
        status: ReservationStatus.CONFIRMED,
      });

      const updatedReservation = await this.findOne(
        reservation_id,
        userId,
        userRole,
      );
      this.logger.log(`Reservation ${reservation_id} confirmed successfully`);
      return updatedReservation;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error confirming reservation with id ${reservation_id}`,
        error,
      );
      throw new HttpException(
        'Error while confirming reservation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async convertToRental(
    reservation_id: number,
    userId: number,
    userRole: UserRole,
  ): Promise<any> {
    try {
      const reservation = await this.findOne(reservation_id, userId, userRole);

      // Only employees, managers, and admins can convert reservations to rentals
      if (userRole === UserRole.CUSTOMER) {
        throw new ForbiddenException(
          'Only staff members can convert reservations to rentals',
        );
      }

      // Only confirmed reservations can be converted to rentals
      if (reservation.status !== ReservationStatus.CONFIRMED) {
        throw new BadRequestException(
          'Only confirmed reservations can be converted to rentals',
        );
      }

      // Check if pickup date has arrived
      if (new Date(reservation.pickup_date) > new Date()) {
        throw new BadRequestException(
          'Cannot convert reservation to rental before pickup date',
        );
      }

      return {
        reservation_id: reservation.reservation_id,
        car_id: reservation.car_id,
        customer_id: reservation.customer_id,
        pickup_date: reservation.pickup_date,
        return_date: reservation.return_date,
        pickup_location_id: reservation.pickup_location_id,
        return_location_id: reservation.return_location_id,
        advance_payment: reservation.advance_payment,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Error converting reservation ${reservation_id} to rental`,
        error,
      );
      throw new HttpException(
        'Error while converting reservation to rental',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async checkCarAvailability(
    car_id: number,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    try {
      const conflictingReservations = await this.reservationRepository
        .createQueryBuilder('reservation')
        .where('reservation.car_id = :carId', { carId: car_id })
        .andWhere('reservation.status NOT IN (:...cancelledStatus)', {
          cancelledStatus: [ReservationStatus.CANCELLED],
        })
        .andWhere(
          `(reservation.pickup_date BETWEEN :startDate AND :endDate OR
           reservation.return_date BETWEEN :startDate AND :endDate OR
           (reservation.pickup_date <= :startDate AND reservation.return_date >= :endDate))`,
        )
        .setParameters({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .getMany();

      return conflictingReservations.length === 0;
    } catch (error) {
      this.logger.error('Error checking car availability', error);
      return false;
    }
  }
}
