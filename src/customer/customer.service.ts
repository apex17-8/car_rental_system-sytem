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
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private readonly logger: LoggerService,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      // Validate phone number format
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(createCustomerDto.phone_number)) {
        throw new BadRequestException('Invalid phone number format');
      }

      // Check for duplicate driver license
      if (createCustomerDto.driver_license) {
        const existingCustomer = await this.customerRepository.findOne({
          where: { driver_license: createCustomerDto.driver_license },
        });
        if (existingCustomer) {
          throw new ConflictException('Driver license already registered');
        }
      }

      const customer = this.customerRepository.create(createCustomerDto);
      const savedCustomer = await this.customerRepository.save(customer);

      this.logger.log(
        `Customer created successfully - ID: ${savedCustomer.customer_id}, Name: ${savedCustomer.first_name} ${savedCustomer.last_name}`,
      );
      return savedCustomer;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to create customer', error);
      throw new HttpException(
        'Failed to create customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Customer[]> {
    try {
      return await this.customerRepository.find({
        relations: ['user'],
        order: { first_name: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error finding customers', error);
      throw new HttpException(
        'Error finding customers',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(customer_id: number): Promise<Customer> {
    try {
      const customer = await this.customerRepository.findOne({
        where: { customer_id },
        relations: ['user', 'rentals', 'reservations'],
      });

      if (!customer) {
        throw new NotFoundException(
          `Customer with id ${customer_id} not found`,
        );
      }
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding customer with id ${customer_id}`, error);
      throw new HttpException(
        'Error while finding customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByUserId(user_id: number): Promise<Customer> {
    try {
      const customer = await this.customerRepository.findOne({
        where: { user_id },
        relations: ['user'],
      });

      if (!customer) {
        throw new NotFoundException(
          `Customer with user id ${user_id} not found`,
        );
      }
      return customer;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error finding customer with user id ${user_id}`,
        error,
      );
      throw new HttpException(
        'Error while finding customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    customer_id: number,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    try {
      const existingCustomer = await this.customerRepository.findOne({
        where: { customer_id },
      });

      if (!existingCustomer) {
        throw new NotFoundException(
          `Customer with id ${customer_id} not found`,
        );
      }

      // Validate phone number if being updated
      if (updateCustomerDto.phone_number) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(updateCustomerDto.phone_number)) {
          throw new BadRequestException('Invalid phone number format');
        }
      }

      // Check for duplicate driver license
      if (
        updateCustomerDto.driver_license &&
        updateCustomerDto.driver_license !== existingCustomer.driver_license
      ) {
        const existingCustomerWithLicense =
          await this.customerRepository.findOne({
            where: { driver_license: updateCustomerDto.driver_license },
          });
        if (existingCustomerWithLicense) {
          throw new ConflictException(
            'Driver license already registered to another customer',
          );
        }
      }

      await this.customerRepository.update(customer_id, {
        ...updateCustomerDto,
        updated_at: new Date(),
      });

      const updatedCustomer = await this.customerRepository.findOne({
        where: { customer_id },
        relations: ['user'],
      });

      if (!updatedCustomer) {
        throw new NotFoundException(
          `Customer with id ${customer_id} not found after update`,
        );
      }

      this.logger.log(
        `Customer updated successfully - ID: ${updatedCustomer.customer_id}, Name: ${updatedCustomer.first_name} ${updatedCustomer.last_name}`,
      );
      return updatedCustomer;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating customer with id ${customer_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(customer_id: number): Promise<void> {
    try {
      const customer = await this.findOne(customer_id);

      // should check for active rentals/reservations
      // before allowing deletion, or implement soft delete

      const result = await this.customerRepository.delete(customer_id);
      if (result.affected === 0) {
        throw new NotFoundException(
          `Customer with ID ${customer_id} not found`,
        );
      }

      this.logger.log(`Customer deleted successfully - ID: ${customer_id}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting customer with id ${customer_id}`,
        error,
      );
      throw new HttpException(
        'Error while deleting customer',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateDriverLicense(customer_id: number): Promise<boolean> {
    try {
      const customer = await this.findOne(customer_id);

      // Customer must have a driver license to rent cars
      if (!customer.driver_license) {
        return false;
      }

      // Basic license validation
      return customer.driver_license.length >= 5;
    } catch (error) {
      this.logger.error(
        `Error validating driver license for customer ${customer_id}`,
        error,
      );
      return false;
    }
  }
}
