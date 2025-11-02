import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Car } from '../../car/entities/car.entity';
import { Rental } from '../../rental/entities/rental.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';

@Entity('locations', { schema: 'dbo' })
export class Location {
  @PrimaryGeneratedColumn()
  location_id: number;

  @Column({ type: 'varchar', length: 255 })
  location_name: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20 })
  contact_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  manager_name: string;

  @Column({ type: 'time', nullable: true })
  opening_time: string;

  @Column({ type: 'time', nullable: true })
  closing_time: string;

  @Column({ type: 'bit', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  updated_at: Date;

  // Relationships
  @OneToMany(() => Car, (car) => car.current_location)
  cars: Car[];

  @OneToMany(() => Rental, (rental) => rental.pickup_location)
  pickup_rentals: Rental[];

  @OneToMany(() => Rental, (rental) => rental.return_location)
  return_rentals: Rental[];

  @OneToMany(() => Reservation, (reservation) => reservation.pickup_location)
  pickup_reservations: Reservation[];

  @OneToMany(() => Reservation, (reservation) => reservation.return_location)
  return_reservations: Reservation[];
}
