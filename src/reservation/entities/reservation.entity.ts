import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Car } from '../../car/entities/car.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Location } from '../../location/entities/location.entity';
import { Rental } from '../../rental/entities/rental.entity';
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('reservations', { schema: 'dbo' })
export class Reservation {
  @PrimaryGeneratedColumn()
  reservation_id: number;

  @Column({ type: 'datetime2', default: () => 'GETDATE()' })
  reservation_date: Date;

  @Column({ type: 'datetime2' })
  pickup_date: Date;

  @Column({ type: 'datetime2' })
  return_date: Date;

  @Column({ type: 'varchar', length: 20, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  advance_payment: number;

  @Column({ type: 'int' })
  car_id: number;

  @Column({ type: 'int' })
  customer_id: number;

  @Column({ type: 'int' })
  pickup_location_id: number;

  @Column({ type: 'int' })
  return_location_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  // Relationships
  @ManyToOne(() => Car, (car) => car.reservations)
  @JoinColumn({ name: 'car_id' })
  car: Car;

  @ManyToOne(() => Customer, (customer) => customer.reservations)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'pickup_location_id' })
  pickup_location: Location;

  @ManyToOne(() => Location)
  @JoinColumn({ name: 'return_location_id' })
  return_location: Location;
  @OneToMany(() => Rental, (rental) => rental.reservation)
  rentals: Rental[];
}
