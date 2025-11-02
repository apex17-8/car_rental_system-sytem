import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Car } from '../../car/entities/car.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Location } from '../../location/entities/location.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';
export enum RentalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

@Entity('rentals', { schema: 'dbo' })
export class Rental {
  @PrimaryGeneratedColumn()
  rental_id: number;

  @Column({ type: 'datetime2' })
  rental_start_date: Date;

  @Column({ type: 'datetime2' })
  rental_end_date: Date;

  @Column({ type: 'datetime2', nullable: true })
  actual_return_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  late_fee: number;

  @Column({ type: 'varchar', length: 20, default: RentalStatus.ACTIVE })
  status: RentalStatus;

  @Column({ type: 'int' })
  pickup_location_id: number;

  @Column({ type: 'int' })
  return_location_id: number;

  @Column({ type: 'int' })
  car_id: number;

  @Column({ type: 'int' })
  customer_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;
  @Column({ type: 'int', nullable: true })
  reservation_id: number;

  // Relationships
  @ManyToOne(() => Reservation, (reservation) => reservation.rentals, {
    nullable: true,
  })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @ManyToOne(() => Car, (car) => car.rentals)
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @ManyToOne(() => Customer, (customer) => customer.rentals)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => Payment, (payment) => payment.rental)
  payments: Payment[];

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'pickup_location_id' })
  pickup_location: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'return_location_id' })
  return_location: Location;
}
