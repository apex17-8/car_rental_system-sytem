import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { Rental } from '../../rental/entities/rental.entity';
import { Insurance } from '../../insurance/entities/insurance.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { Maintenance } from '../../maintenance/entities/maintenance.entity';
import { Location } from '../../location/entities/location.entity';

export enum CarAvailability {
  AVAILABLE = 'Available',
  RENTED = 'Rented',
  MAINTENANCE = 'Maintenance',
  RESERVED = 'Reserved',
}

export enum CarType {
  SEDAN = 'Sedan',
  SUV = 'SUV',
  HATCHBACK = 'Hatchback',
  COUPE = 'Coupe',
  CONVERTIBLE = 'Convertible',
  MINIVAN = 'Minivan',
  TRUCK = 'Truck',
  LUXURY = 'Luxury',
}

export enum FuelType {
  PETROL = 'Petrol',
  DIESEL = 'Diesel',
  ELECTRIC = 'Electric',
  HYBRID = 'Hybrid',
}

@Entity('cars', { schema: 'dbo' })
@Index('IDX_cars_availability', ['availability'])
@Index('IDX_cars_license_plate', ['license_plate'])
@Index('IDX_cars_type', ['car_type'])
export class Car {
  @PrimaryGeneratedColumn()
  car_id: number;

  @Column({ type: 'varchar', length: 100 })
  car_model: string;

  @Column({ type: 'varchar', length: 100 })
  car_manufacturer: string;

  @Column({ type: 'varchar', length: 4 })
  year: string;

  @Column({ type: 'varchar', length: 50 })
  color: string;

  @Column({ 
    type: 'varchar',
    length: 20,
    default: CarType.SEDAN,
  })
  car_type: CarType;

  @Column({
    type: 'varchar',
    length: 20,
    default: FuelType.PETROL,
  })
  fuel_type: FuelType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rental_rate: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: CarAvailability.AVAILABLE,
  })
  availability: CarAvailability;

  @Column({ type: 'int', nullable: true })
  current_location_id: number;

  @Column({ type: 'int', default: 0 })
  mileage: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  license_plate: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  transmission: string;

  @Column({ type: 'int', nullable: true })
  seats: number;

  @Column({ type: 'int', nullable: true })
  doors: number;

  @Column({ type: 'decimal', precision: 5, scale: 1, nullable: true })
  engine_size: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  features: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  image_url: string;

  @Column({ type: 'bit', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  updated_at: Date;
  maintenance: any;

  @OneToMany(() => Rental, (rental) => rental.car)
  rentals: Rental[];

  @OneToMany(() => Insurance, (insurance) => insurance.car)
  insurances: Insurance[];

  @OneToMany(() => Reservation, (reservation) => reservation.car)
  reservations: Reservation[];

  @OneToMany(() => Maintenance, (maintenance) => maintenance.car)
  maintenances: Maintenance[];

  @ManyToOne(() => Location, (location) => location.cars)
  @JoinColumn({ name: 'current_location_id' })
  current_location: Location;
}
