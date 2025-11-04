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

export enum MaintenanceType {
  ROUTINE = 'routine',
  REPAIR = 'repair',
  ACCIDENT = 'accident',
  UPGRADE = 'upgrade',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('maintenances', { schema: 'dbo' })
export class Maintenance {
  @PrimaryGeneratedColumn()
  maintenance_id: number;

  @Column({ type: 'datetime2' })
  maintenance_date: Date;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cost: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: MaintenanceType.ROUTINE,
  })
  type: MaintenanceType;

  @Column({
    type: 'varchar',
    length: 20,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ type: 'datetime2', nullable: true })
  completed_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int' })
  car_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Car, (car) => car.maintenances)
  @JoinColumn({ name: 'car_id' })
  car: Car;
}
