import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Reservation } from '../../reservation/entities/reservation.entity';
import { Rental } from '../../rental/entities/rental.entity';
@Entity('customers', { schema: 'dbo' })
export class Customer {
  @PrimaryGeneratedColumn()
  customer_id: number;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 15 })
  phone_number: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  driver_license: string;

  @Column({ type: 'int', nullable: true })
  user_id: number;

  @CreateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2', default: () => 'GETDATE()' })
  updated_at: Date;

  @OneToOne(() => User, (user) => user.customer)
  @JoinColumn({ name: 'user_id' })
  user: User;
  @OneToMany(() => Rental, (rental) => rental.customer)
  rentals: Rental[];
  @OneToMany(() => Reservation, (reservation) => reservation.customer)
  reservations: Reservation[];
}
