import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Rental } from '../../rental/entities/rental.entity';

export enum PaymentMethod {
  CASH = 'Cash',
  CREDIT_CARD = 'Credit Card',
  DEBIT_CARD = 'Debit Card',
  MPESA = 'Mpesa',
  PAYPAL = 'Paypal',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments', { schema: 'dbo' })
export class Payment {
  @PrimaryGeneratedColumn()
  payment_id: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  payment_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentMethod.CASH,
  })
  payment_method: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  transaction_id: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int' })
  rental_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Rental, (rental) => rental.payments)
  @JoinColumn({ name: 'rental_id' })
  rental: Rental;
}
