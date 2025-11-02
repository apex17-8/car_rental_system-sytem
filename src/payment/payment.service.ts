import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentMethod,
} from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private readonly logger: LoggerService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      const payment = this.paymentRepository.create(createPaymentDto);
      const savedPayment = await this.paymentRepository.save(payment);
      this.logger.log(
        `Payment created successfully - ID: ${savedPayment.payment_id}, Amount: ${savedPayment.amount}`,
      );
      return savedPayment;
    } catch (error) {
      this.logger.error('Failed to create payment', error);
      throw new HttpException(
        'Failed to create payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Payment[]> {
    try {
      return await this.paymentRepository.find({
        relations: ['rental'],
        order: { payment_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Error finding payments', error);
      throw new HttpException(
        'Error finding payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(payment_id: number): Promise<Payment> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { payment_id },
        relations: ['rental'],
      });

      if (!payment) {
        throw new NotFoundException(`Payment with id ${payment_id} not found`);
      }
      return payment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error finding payment with id ${payment_id}`, error);
      throw new HttpException(
        'Error while finding payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByRental(rental_id: number): Promise<Payment[]> {
    try {
      return await this.paymentRepository.find({
        where: { rental_id },
        relations: ['rental'],
        order: { payment_date: 'DESC' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding payments for rental ${rental_id}`,
        error,
      );
      throw new HttpException(
        'Error finding rental payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    payment_id: number,
    updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    try {
      const existingPayment = await this.paymentRepository.findOne({
        where: { payment_id },
      });

      if (!existingPayment) {
        throw new NotFoundException(`Payment with id ${payment_id} not found`);
      }

      await this.paymentRepository.update(payment_id, updatePaymentDto);

      const updatedPayment = await this.paymentRepository.findOne({
        where: { payment_id },
        relations: ['rental'],
      });

      if (!updatedPayment) {
        throw new NotFoundException(
          `Payment with id ${payment_id} not found after update`,
        );
      }

      this.logger.log(
        `Payment updated successfully - ID: ${updatedPayment.payment_id}`,
      );
      return updatedPayment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error updating payment with id ${payment_id}`, error);
      throw new HttpException(
        'Error while updating payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(payment_id: number): Promise<void> {
    try {
      const payment = await this.findOne(payment_id);

      const result = await this.paymentRepository.delete(payment_id);
      if (result.affected === 0) {
        throw new NotFoundException(`Payment with ID ${payment_id} not found`);
      }

      this.logger.log(
        `Payment deleted successfully - ID: ${payment_id}, Amount: ${payment.amount}`,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting payment with id ${payment_id}`, error);
      throw new HttpException(
        'Error while deleting payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processPayment(
    rental_id: number,
    amount: number,
    payment_method: PaymentMethod,
    transaction_id?: string,
  ): Promise<Payment> {
    try {
      // Payment amount must be positive
      if (amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      const payment = this.paymentRepository.create({
        rental_id,
        amount,
        payment_method,
        transaction_id,
        payment_date: new Date(),
        status: PaymentStatus.PENDING,
      });

      // Simulate payment processing for now
      await this.simulatePaymentProcessing(payment);

      const savedPayment = await this.paymentRepository.save(payment);
      this.logger.log(
        `Payment processed successfully - ID: ${savedPayment.payment_id}, Amount: $${savedPayment.amount}, Status: ${savedPayment.status}`,
      );

      return savedPayment;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to process payment', error);
      throw new HttpException(
        'Failed to process payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStatus(
    payment_id: number,
    status: PaymentStatus,
  ): Promise<Payment> {
    try {
      const payment = await this.findOne(payment_id);

      // Cannot change status of completed payments to pending
      if (
        payment.status === PaymentStatus.COMPLETED &&
        status === PaymentStatus.PENDING
      ) {
        throw new BadRequestException(
          'Cannot set completed payment back to pending',
        );
      }

      // Cannot refund a payment that wasn't completed
      if (
        status === PaymentStatus.REFUNDED &&
        payment.status !== PaymentStatus.COMPLETED
      ) {
        throw new BadRequestException('Can only refund completed payments');
      }

      await this.paymentRepository.update(payment_id, { status });

      const updatedPayment = await this.findOne(payment_id);
      this.logger.log(`Payment ${payment_id} status updated to ${status}`);
      return updatedPayment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating payment status with id ${payment_id}`,
        error,
      );
      throw new HttpException(
        'Error while updating payment status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async processRefund(
    payment_id: number,
    amount: number,
    reason: string,
  ): Promise<Payment> {
    try {
      const payment = await this.findOne(payment_id);

      // Can only refund completed payments
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Can only refund completed payments');
      }

      // Refund amount cannot exceed original amount
      if (amount > payment.amount) {
        throw new BadRequestException(
          'Refund amount cannot exceed original payment amount',
        );
      }

      await this.paymentRepository.update(payment_id, {
        status: PaymentStatus.REFUNDED,
        notes: `Refunded: $${amount}. Reason: ${reason}`,
      });

      const updatedPayment = await this.findOne(payment_id);
      this.logger.log(
        `Payment ${payment_id} refunded successfully - Amount: $${amount}`,
      );
      return updatedPayment;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error processing refund for payment ${payment_id}`,
        error,
      );
      throw new HttpException(
        'Error while processing refund',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async simulatePaymentProcessing(payment: Payment): Promise<void> {
    // Simulate payment gateway processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For now and for demo purposes, simulate successful payment
    payment.status = PaymentStatus.COMPLETED;
  }
}
