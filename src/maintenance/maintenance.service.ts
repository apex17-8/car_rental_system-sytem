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
import {
  Maintenance,
  MaintenanceType,
  MaintenanceStatus,
} from './entities/maintenance.entity';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(Maintenance)
    private maintenanceRepository: Repository<Maintenance>,
    private readonly logger: LoggerService,
  ) {}

  async create(
    createMaintenanceDto: CreateMaintenanceDto,
  ): Promise<Maintenance> {
    try {
      const { car_id, maintenance_date, cost, type } = createMaintenanceDto;

      // Maintenance date cannot be in the past for scheduled maintenance
      if (
        type === MaintenanceType.ROUTINE &&
        new Date(maintenance_date) < new Date()
      ) {
        throw new BadRequestException(
          'Routine maintenance cannot be scheduled in the past',
        );
      }

      // Cost must be positive
      if (cost <= 0) {
        throw new BadRequestException('Maintenance cost must be positive');
      }

      // Check for overlapping maintenance for the same car
      const overlappingMaintenance = await this.maintenanceRepository
        .createQueryBuilder('maintenance')
        .where('maintenance.car_id = :carId', { carId: car_id })
        .andWhere('maintenance.status NOT IN (:...completedStatus)', {
          completedStatus: [
            MaintenanceStatus.COMPLETED,
            MaintenanceStatus.CANCELLED,
          ],
        })
        .andWhere(
          'DATE(maintenance.maintenance_date) = DATE(:maintenanceDate)',
          {
            maintenanceDate: maintenance_date,
          },
        )
        .getOne();

      if (overlappingMaintenance) {
        throw new ConflictException(
          'Car already has maintenance scheduled for this date',
        );
      }

      const maintenance = this.maintenanceRepository.create({
        ...createMaintenanceDto,
        status: MaintenanceStatus.SCHEDULED,
      });

      const savedMaintenance =
        await this.maintenanceRepository.save(maintenance);
      this.logger.log(
        `Maintenance created successfully - ID: ${savedMaintenance.maintenance_id}, Type: ${savedMaintenance.type}, Car ID: ${savedMaintenance.car_id}, Date: ${savedMaintenance.maintenance_date}`,
      );

      return savedMaintenance;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create maintenance', error);
      throw new HttpException(
        'Failed to create maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Maintenance[]> {
    try {
      return await this.maintenanceRepository.find({
        relations: ['car'],
        order: { maintenance_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding maintenance records', error);
      throw new HttpException(
        'Error finding maintenance records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(maintenance_id: number): Promise<Maintenance> {
    try {
      const maintenance = await this.maintenanceRepository.findOne({
        where: { maintenance_id },
        relations: ['car'],
      });

      if (!maintenance) {
        throw new NotFoundException(
          `Maintenance record with id ${maintenance_id} not found`,
        );
      }
      return maintenance;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding maintenance with id ${maintenance_id}`,
        error,
      );
      throw new HttpException(
        'Error while finding maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCar(car_id: number): Promise<Maintenance[]> {
    try {
      return await this.maintenanceRepository.find({
        where: { car_id },
        relations: ['car'],
        order: { maintenance_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error finding maintenance for car ${car_id}`, error);
      throw new HttpException(
        'Error finding car maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    maintenance_id: number,
    updateMaintenanceDto: UpdateMaintenanceDto,
  ): Promise<Maintenance> {
    try {
      const existingMaintenance = await this.maintenanceRepository.findOne({
        where: { maintenance_id },
      });

      if (!existingMaintenance) {
        throw new NotFoundException(
          `Maintenance with id ${maintenance_id} not found`,
        );
      }

      // Cannot update completed or cancelled maintenance
      if (
        existingMaintenance.status === MaintenanceStatus.COMPLETED ||
        existingMaintenance.status === MaintenanceStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot update completed or cancelled maintenance',
        );
      }

      // Simple merge and save - handles type conversion automatically
      const updatedMaintenance = this.maintenanceRepository.merge(
        existingMaintenance,
        updateMaintenanceDto,
      );

      const savedMaintenance =
        await this.maintenanceRepository.save(updatedMaintenance);

      this.logger.log(
        `Maintenance updated successfully - ID: ${savedMaintenance.maintenance_id}, Status: ${savedMaintenance.status}`,
      );
      return savedMaintenance;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating maintenance with id ${maintenance_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(maintenance_id: number): Promise<void> {
    try {
      const maintenance = await this.findOne(maintenance_id);

      const result = await this.maintenanceRepository.delete(maintenance_id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Maintenance with ID ${maintenance_id} not found`,
        );
      }

      this.logger.log(
        `Maintenance deleted successfully - ID: ${maintenance_id}, Car ID: ${maintenance.car_id}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting maintenance with id ${maintenance_id}`,
        error,
      );
      throw new HttpException(
        'Error while deleting maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStatus(
    maintenance_id: number,
    updateStatusDto: UpdateMaintenanceStatusDto,
  ): Promise<Maintenance> {
    try {
      const maintenance = await this.findOne(maintenance_id);

      if (
        maintenance.status === MaintenanceStatus.COMPLETED ||
        maintenance.status === MaintenanceStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot update completed or cancelled maintenance',
        );
      }

      await this.maintenanceRepository.update(maintenance_id, {
        status: updateStatusDto.status,
      });

      const updatedMaintenance = await this.findOne(maintenance_id);
      this.logger.log(
        `Maintenance ${maintenance_id} status updated to ${updateStatusDto.status}`,
      );
      return updatedMaintenance;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating maintenance status with id ${maintenance_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating maintenance status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async completeMaintenance(
    maintenance_id: number,
    completeMaintenanceDto: CompleteMaintenanceDto,
  ): Promise<Maintenance> {
    try {
      const maintenance = await this.findOne(maintenance_id);

      // Can only complete in-progress maintenance
      if (maintenance.status !== MaintenanceStatus.IN_PROGRESS) {
        throw new BadRequestException(
          'Can only complete maintenance that is in progress',
        );
      }

      const updateData: Partial<Maintenance> = {
        status: MaintenanceStatus.COMPLETED,
        completed_date: new Date(),
      };

      if (completeMaintenanceDto.actual_cost !== undefined) {
        updateData.cost = completeMaintenanceDto.actual_cost;
      }
      if (completeMaintenanceDto.notes !== undefined) {
        updateData.notes = completeMaintenanceDto.notes;
      }

      await this.maintenanceRepository.update(maintenance_id, updateData);

      const updatedMaintenance = await this.findOne(maintenance_id);
      this.logger.log(
        `Maintenance ${maintenance_id} completed successfully - Cost: ${completeMaintenanceDto.actual_cost || updatedMaintenance.cost}`,
      );
      return updatedMaintenance;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error completing maintenance with id ${maintenance_id}`,
        error,
      );
      throw new HttpException(
        'Error while completing maintenance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
