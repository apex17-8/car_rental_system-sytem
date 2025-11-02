import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car, CarAvailability } from './entities/car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class CarService {
  constructor(
    @InjectRepository(Car)
    private carRepository: Repository<Car>,
    private readonly logger: LoggerService,
  ) {}

  async create(createCarDto: CreateCarDto): Promise<Car> {
    try {
      // Check if car with license plate already exists
      const existingCar = await this.carRepository.findOne({
        where: { license_plate: createCarDto.license_plate },
      });

      if (existingCar) {
        throw new ConflictException(
          'Car with this license plate already exists',
        );
      }

      // Validate year
      const currentYear = new Date().getFullYear();
      const carYear = parseInt(createCarDto.year);
      if (carYear < 2000 || carYear > currentYear + 1) {
        throw new BadRequestException('Invalid car year');
      }

      const car = this.carRepository.create({
        ...createCarDto,
        is_active: true,
        availability: CarAvailability.AVAILABLE,
        mileage: createCarDto.mileage || 0,
      });

      const savedCar = await this.carRepository.save(car);
      this.logger.log(
        `Car created successfully - ID: ${savedCar.car_id}, License Plate: ${savedCar.license_plate}, Model: ${savedCar.car_model}`,
      );

      return savedCar;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to create car',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Car[]> {
    try {
      return await this.carRepository.find({
        where: { is_active: true },
        relations: ['current_location'],
        order: { car_id: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error finding cars', error);
      throw new HttpException(
        'Error finding cars',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAvailable(): Promise<Car[]> {
    try {
      return await this.carRepository.find({
        where: {
          availability: CarAvailability.AVAILABLE,
          is_active: true,
        },
        relations: ['current_location'],
        order: { car_model: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error finding available cars', error);
      throw new HttpException(
        'Error finding available cars',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(car_id: number): Promise<Car> {
    try {
      const car = await this.carRepository.findOne({
        where: { car_id, is_active: true },
        relations: ['current_location', 'insurances', 'maintenances'],
      });

      if (!car) {
        throw new NotFoundException(`Car with id ${car_id} not found`);
      }
      return car;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding car with id ${car_id}`, error);
      throw new HttpException(
        'Error while finding car',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByLicensePlate(license_plate: string): Promise<Car> {
    try {
      const car = await this.carRepository.findOne({
        where: { license_plate, is_active: true },
      });

      if (!car) {
        throw new NotFoundException(
          `Car with license plate ${license_plate} not found`,
        );
      }
      return car;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding car with license plate ${license_plate}`,
        error,
      );
      throw new HttpException(
        'Error while finding car',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(car_id: number, updateCarDto: UpdateCarDto): Promise<Car> {
    try {
      const existingCar = await this.carRepository.findOne({
        where: { car_id, is_active: true },
      });

      if (!existingCar) {
        throw new NotFoundException(`Car with id ${car_id} not found`);
      }

      // Check if license plate is being changed to an existing one
      if (
        updateCarDto.license_plate &&
        updateCarDto.license_plate !== existingCar.license_plate
      ) {
        const carWithSamePlate = await this.carRepository.findOne({
          where: { license_plate: updateCarDto.license_plate },
        });
        if (carWithSamePlate) {
          throw new ConflictException(
            'Another car with this license plate already exists',
          );
        }
      }

      // Prevent updating rental rate for rented cars
      if (
        updateCarDto.rental_rate &&
        existingCar.availability === CarAvailability.RENTED
      ) {
        throw new BadRequestException(
          'Cannot update rental rate for a rented car',
        );
      }

      await this.carRepository.update(car_id, {
        ...updateCarDto,
        updated_at: new Date(),
      });

      const updatedCar = await this.carRepository.findOne({
        where: { car_id },
        relations: ['current_location'],
      });

      if (!updatedCar) {
        throw new NotFoundException(
          `Car with id ${car_id} not found after update`,
        );
      }

      this.logger.log(
        `Car updated successfully - ID: ${updatedCar.car_id}, License Plate: ${updatedCar.license_plate}`,
      );
      return updatedCar;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error updating car with id ${car_id}`, error);
      throw new HttpException(
        'Error while updating car',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAvailability(
    car_id: number,
    availability: CarAvailability,
  ): Promise<Car> {
    try {
      const car = await this.findOne(car_id);

      // Validate state transitions
      if (
        car.availability === CarAvailability.RENTED &&
        availability !== CarAvailability.AVAILABLE
      ) {
        throw new BadRequestException(
          'Rented car can only be set to available after return',
        );
      }

      await this.carRepository.update(car_id, {
        availability,
        updated_at: new Date(),
      });

      const updatedCar = await this.findOne(car_id);
      this.logger.log(
        `Car availability updated to ${availability} - ID: ${updatedCar.car_id}`,
      );
      return updatedCar;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating car availability with id ${car_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating car availability',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(car_id: number): Promise<string> {
    try {
      const existingCar = await this.carRepository.findOne({
        where: { car_id, is_active: true },
      });

      if (!existingCar) {
        throw new NotFoundException(`Car with id ${car_id} not found`);
      }

      // Cannot delete rented or reserved cars
      if (existingCar.availability === CarAvailability.RENTED) {
        throw new BadRequestException('Cannot delete a rented car');
      }

      if (existingCar.availability === CarAvailability.RESERVED) {
        throw new BadRequestException('Cannot delete a reserved car');
      }

      // Soft delete
      await this.carRepository.update(car_id, {
        is_active: false,
        availability: CarAvailability.MAINTENANCE,
        updated_at: new Date(),
      });

      this.logger.log(`Car with id ${car_id} deleted successfully`);
      return 'Car deleted successfully';
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Error deleting car with id ${car_id}`, error);
      throw new HttpException(
        'Error deleting car',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAvailableByDates(startDate: Date, endDate: Date): Promise<Car[]> {
    try {
      const availableCars = await this.carRepository
        .createQueryBuilder('car')
        .leftJoinAndSelect('car.current_location', 'location')
        .leftJoinAndSelect(
          'car.reservations',
          'reservation',
          'reservation.status NOT IN (:...cancelledStatus) AND ' +
            '(reservation.pickup_date BETWEEN :startDate AND :endDate OR ' +
            'reservation.return_date BETWEEN :startDate AND :endDate OR ' +
            '(reservation.pickup_date <= :startDate AND reservation.return_date >= :endDate))',
        )
        .leftJoinAndSelect(
          'car.rentals',
          'rental',
          'rental.status = :activeStatus AND ' +
            '(rental.rental_start_date BETWEEN :startDate AND :endDate OR ' +
            'rental.rental_end_date BETWEEN :startDate AND :endDate OR ' +
            '(rental.rental_start_date <= :startDate AND rental.rental_end_date >= :endDate))',
        )
        .where('car.availability = :availability', {
          availability: CarAvailability.AVAILABLE,
        })
        .andWhere('car.is_active = :isActive', { isActive: true })
        .andWhere('reservation.reservation_id IS NULL')
        .andWhere('rental.rental_id IS NULL')
        .setParameters({
          cancelledStatus: ['cancelled'],
          activeStatus: 'active',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        })
        .getMany();

      return availableCars;
    } catch (error) {
      this.logger.error('Error finding available cars by dates', error);
      throw new HttpException(
        'Error finding available cars',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
