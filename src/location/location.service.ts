import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class LocationService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    private readonly logger: LoggerService,
  ) {}

  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    try {
      // Validate phone number
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(createLocationDto.contact_number)) {
        throw new BadRequestException('Invalid contact number format');
      }

      // Validate operating hours
      if (createLocationDto.opening_time && createLocationDto.closing_time) {
        if (createLocationDto.opening_time >= createLocationDto.closing_time) {
          throw new BadRequestException(
            'Opening time must be before closing time',
          );
        }
      }

      const location = this.locationRepository.create({
        ...createLocationDto,
        is_active: true,
      });

      const savedLocation = await this.locationRepository.save(location);
      this.logger.log(
        `Location created successfully - ID: ${savedLocation.location_id}, Name: ${savedLocation.location_name}, Address: ${savedLocation.address}`,
      );

      return savedLocation;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create location', error);
      throw new HttpException(
        'Failed to create location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Location[]> {
    try {
      return await this.locationRepository.find({
        order: { location_name: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error finding locations', error);
      throw new HttpException(
        'Error finding locations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findActive(): Promise<Location[]> {
    try {
      return await this.locationRepository.find({
        where: { is_active: true },
        order: { location_name: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error finding active locations', error);
      throw new HttpException(
        'Error finding active locations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(location_id: number): Promise<Location> {
    try {
      const location = await this.locationRepository.findOne({
        where: { location_id },
      });

      if (!location) {
        throw new NotFoundException(
          `Location with id ${location_id} not found`,
        );
      }
      return location;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding location with id ${location_id}`, error);
      throw new HttpException(
        'Error while finding location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    location_id: number,
    updateLocationDto: UpdateLocationDto,
  ): Promise<Location> {
    try {
      const existingLocation = await this.locationRepository.findOne({
        where: { location_id },
      });

      if (!existingLocation) {
        throw new NotFoundException(
          `Location with id ${location_id} not found`,
        );
      }

      // Validate phone number if being updated
      if (updateLocationDto.contact_number) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(updateLocationDto.contact_number)) {
          throw new BadRequestException('Invalid contact number format');
        }
      }

      // Validate operating hours
      if (updateLocationDto.opening_time && updateLocationDto.closing_time) {
        if (updateLocationDto.opening_time >= updateLocationDto.closing_time) {
          throw new BadRequestException(
            'Opening time must be before closing time',
          );
        }
      }

      await this.locationRepository.update(location_id, {
        ...updateLocationDto,
        updated_at: new Date(),
      });

      const updatedLocation = await this.locationRepository.findOne({
        where: { location_id },
      });

      if (!updatedLocation) {
        throw new NotFoundException(
          `Location with id ${location_id} not found after update`,
        );
      }

      this.logger.log(
        `Location updated successfully - ID: ${updatedLocation.location_id}, Name: ${updatedLocation.location_name}`,
      );
      return updatedLocation;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating location with id ${location_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(location_id: number): Promise<void> {
    try {
      const location = await this.findOne(location_id);

      // Instead of hard delete, you might want to set is_active to false
      const result = await this.locationRepository.delete(location_id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Location with ID ${location_id} not found`,
        );
      }

      this.logger.log(
        `Location deleted successfully - ID: ${location_id}, Name: ${location.location_name}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting location with id ${location_id}`,
        error,
      );
      throw new HttpException(
        'Error while deleting location',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async toggleActive(location_id: number): Promise<Location> {
    try {
      const location = await this.findOne(location_id);

      await this.locationRepository.update(location_id, {
        is_active: !location.is_active,
        updated_at: new Date(),
      });

      const updatedLocation = await this.findOne(location_id);
      this.logger.log(
        `Location ${location_id} active status toggled to ${updatedLocation.is_active}`,
      );
      return updatedLocation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error toggling location active status with id ${location_id}`,
        error,
      );
      throw new HttpException(
        'Error while toggling location status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
