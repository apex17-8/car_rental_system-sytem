import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Car } from '../../car/entities/car.entity';

@Entity('insurances', { schema: 'dbo' })
export class Insurance {
  @PrimaryGeneratedColumn()
  insurance_id: number;

  @Column({ type: 'varchar', length: 255 })
  insurance_provider: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  policy_number: string;

  @Column({ type: 'datetime2' })
  start_date: Date;

  @Column({ type: 'datetime2' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  premium_amount: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'text', nullable: true })
  coverage_details: string;

  @Column({ type: 'int' })
  car_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Car, (car) => car.insurances)
  @JoinColumn({ name: 'car_id' })
  car: Car;
}
