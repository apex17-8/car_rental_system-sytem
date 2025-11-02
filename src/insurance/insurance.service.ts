import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Insurance } from './entities/insurance.entity';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class InsuranceService {
  constructor(
    @InjectRepository(Insurance)
    private insuranceRepository: Repository<Insurance>,
    private readonly logger: LoggerService,
  ) {}

  async create(createInsuranceDto: CreateInsuranceDto): Promise<Insurance> {
    try {
      const { car_id, policy_number, start_date, end_date, premium_amount } =
        createInsuranceDto;

      // Validate dates
      if (new Date(start_date) >= new Date(end_date)) {
        throw new BadRequestException('End date must be after start date');
      }

      // Premium must be positive
      if (premium_amount <= 0) {
        throw new BadRequestException('Premium amount must be positive');
      }

      // Check for duplicate policy number
      const existingInsurance = await this.insuranceRepository.findOne({
        where: { policy_number },
      });
      if (existingInsurance) {
        throw new ConflictException('Policy number already exists');
      }

      // Check for overlapping insurance for the same car
      const overlappingInsurance = await this.insuranceRepository
        .createQueryBuilder('insurance')
        .where('insurance.car_id = :carId', { carId: car_id })
        .andWhere('insurance.status = :activeStatus', {
          activeStatus: 'active',
        })
        .andWhere(
          `(insurance.start_date BETWEEN :startDate AND :endDate OR
           insurance.end_date BETWEEN :startDate AND :endDate OR
           (insurance.start_date <= :startDate AND insurance.end_date >= :endDate))`,
        )
        .setParameters({
          startDate: start_date.toISOString(),
          endDate: end_date.toISOString(),
        })
        .getOne();

      if (overlappingInsurance) {
        throw new ConflictException(
          'Car already has active insurance for this period',
        );
      }

      const insurance = this.insuranceRepository.create({
        ...createInsuranceDto,
        status: 'active',
      });

      const savedInsurance = await this.insuranceRepository.save(insurance);
      this.logger.log(
        `Insurance created successfully - ID: ${savedInsurance.insurance_id}, Policy: ${savedInsurance.policy_number}, Car ID: ${savedInsurance.car_id}`,
      );

      return savedInsurance;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create insurance', error);
      throw new HttpException(
        'Failed to create insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Insurance[]> {
    try {
      return await this.insuranceRepository.find({
        relations: ['car'],
        order: { start_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding insurance records', error);
      throw new HttpException(
        'Error finding insurance records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(insurance_id: number): Promise<Insurance> {
    try {
      const insurance = await this.insuranceRepository.findOne({
        where: { insurance_id },
        relations: ['car'],
      });

      if (!insurance) {
        throw new NotFoundException(
          `Insurance with id ${insurance_id} not found`,
        );
      }
      return insurance;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding insurance with id ${insurance_id}`,
        error,
      );
      throw new HttpException(
        'Error while finding insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByCar(car_id: number): Promise<Insurance[]> {
    try {
      return await this.insuranceRepository.find({
        where: { car_id },
        relations: ['car'],
        order: { start_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Error finding insurance for car ${car_id}`, error);
      throw new HttpException(
        'Error finding car insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findActive(): Promise<Insurance[]> {
    try {
      const now = new Date();
      return await this.insuranceRepository.find({
        where: {
          status: 'active',
          start_date: LessThanOrEqual(now),
          end_date: MoreThanOrEqual(now),
        },
        relations: ['car'],
      });
    } catch (error) {
      this.logger.error('Error finding active insurance', error);
      throw new HttpException(
        'Error finding active insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    insurance_id: number,
    updateInsuranceDto: UpdateInsuranceDto,
  ): Promise<Insurance> {
    try {
      const existingInsurance = await this.insuranceRepository.findOne({
        where: { insurance_id },
      });

      if (!existingInsurance) {
        throw new NotFoundException(
          `Insurance with id ${insurance_id} not found`,
        );
      }

      // Cannot update expired insurance
      if (existingInsurance.status === 'expired') {
        throw new BadRequestException('Cannot update expired insurance');
      }

      // Validate dates if being updated
      if (updateInsuranceDto.start_date && updateInsuranceDto.end_date) {
        if (
          new Date(updateInsuranceDto.start_date) >=
          new Date(updateInsuranceDto.end_date)
        ) {
          throw new BadRequestException('End date must be after start date');
        }
      }

      // Validate premium
      if (
        updateInsuranceDto.premium_amount &&
        updateInsuranceDto.premium_amount <= 0
      ) {
        throw new BadRequestException('Premium amount must be positive');
      }

      await this.insuranceRepository.update(insurance_id, {
        ...updateInsuranceDto,
        updated_at: new Date(),
      });

      const updatedInsurance = await this.insuranceRepository.findOne({
        where: { insurance_id },
        relations: ['car'],
      });

      if (!updatedInsurance) {
        throw new NotFoundException(
          `Insurance with id ${insurance_id} not found after update`,
        );
      }

      this.logger.log(
        `Insurance updated successfully - ID: ${updatedInsurance.insurance_id}, Policy: ${updatedInsurance.policy_number}`,
      );
      return updatedInsurance;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating insurance with id ${insurance_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(insurance_id: number): Promise<void> {
    try {
      const insurance = await this.findOne(insurance_id);

      // i should implement soft delete or archive instead(later)
      const result = await this.insuranceRepository.delete(insurance_id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Insurance with ID ${insurance_id} not found`,
        );
      }

      this.logger.log(
        `Insurance deleted successfully - ID: ${insurance_id}, Policy: ${insurance.policy_number}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting insurance with id ${insurance_id}`,
        error,
      );
      throw new HttpException(
        'Error while deleting insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async renew(
    insurance_id: number,
    new_end_date: Date,
    new_premium?: number,
  ): Promise<Insurance> {
    try {
      const insurance = await this.findOne(insurance_id);

      // Can only renew active or expiring insurance
      if (insurance.status === 'expired') {
        throw new BadRequestException('Cannot renew expired insurance');
      }

      // New end date must be after current end date
      if (new Date(new_end_date) <= new Date(insurance.end_date)) {
        throw new BadRequestException(
          'New end date must be after current end date',
        );
      }

      const updateData: any = {
        end_date: new_end_date,
        status: 'active',
        updated_at: new Date(),
      };

      if (new_premium) updateData.premium_amount = new_premium;

      await this.insuranceRepository.update(insurance_id, updateData);

      const updatedInsurance = await this.findOne(insurance_id);
      this.logger.log(
        `Insurance ${insurance_id} renewed successfully - New End Date: ${new_end_date}`,
      );
      return updatedInsurance;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error renewing insurance with id ${insurance_id}`,
        error,
      );
      throw new HttpException(
        'Error while renewing insurance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
