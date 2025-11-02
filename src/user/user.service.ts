// src/user/services/user.service.ts
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
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoggerService } from './../logger/services/logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

      const user = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
        is_active: createUserDto.is_active ?? true,
      });

      const savedUser = await this.userRepository.save(user);

      // Don't log the password
      const { password, ...userWithoutPassword } = savedUser;
      this.logger.log(
        'User created successfully',
        'UserService',
        userWithoutPassword,
      );

      return savedUser;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.logError(error, 'UserService');
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<Partial<User>[]> {
    try {
      return await this.userRepository.find({
        select: {
          user_id: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
          customer_id: true,
        },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.logError(error, 'UserService');
      throw new HttpException(
        'Error finding users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(user_id: number): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id },
        relations: ['customer'],
      });

      if (!user) {
        throw new NotFoundException(`User with id ${user_id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error while finding user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['customer'],
      });

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { email });
      throw new HttpException(
        'Error while finding user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(user_id: number, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { user_id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with id ${user_id} not found`);
      }

      // Check if email is being changed to an existing one
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const userWithEmail = await this.userRepository.findOne({
          where: { email: updateUserDto.email },
        });
        if (userWithEmail) {
          throw new ConflictException('Email already in use by another user');
        }
      }

      // Hash password if it's being updated
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
      }

      await this.userRepository.update(user_id, {
        ...updateUserDto,
        updated_at: new Date(),
      });

      const updatedUser = await this.userRepository.findOne({
        where: { user_id },
        relations: ['customer'],
      });

      if (!updatedUser) {
        throw new NotFoundException(
          `User with id ${user_id} not found after update`,
        );
      }

      const { password, ...userWithoutPassword } = updatedUser;
      this.logger.log(
        'User updated successfully',
        'UserService',
        userWithoutPassword,
      );
      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error while updating user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateRole(
    user_id: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<User> {
    try {
      const user = await this.findOne(user_id);

      // Business rule: Prevent demoting the last admin
      if (
        user.role === UserRole.ADMIN &&
        updateRoleDto.role !== UserRole.ADMIN
      ) {
        const adminCount = await this.userRepository.count({
          where: { role: UserRole.ADMIN, is_active: true },
        });

        if (adminCount <= 1) {
          throw new BadRequestException('Cannot demote the last active admin');
        }
      }

      await this.userRepository.update(user_id, {
        role: updateRoleDto.role,
        updated_at: new Date(),
      });

      const updatedUser = await this.findOne(user_id);
      this.logger.log(
        `User role updated to ${updateRoleDto.role}`,
        'UserService',
        {
          user_id,
          new_role: updateRoleDto.role,
        },
      );
      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error while updating user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateStatus(
    user_id: number,
    updateStatusDto: UpdateStatusDto,
  ): Promise<User> {
    try {
      const user = await this.findOne(user_id);

      // Business rule: Prevent deactivating the last admin
      if (user.role === UserRole.ADMIN && !updateStatusDto.is_active) {
        const activeAdminCount = await this.userRepository.count({
          where: { role: UserRole.ADMIN, is_active: true },
        });

        if (activeAdminCount <= 1) {
          throw new BadRequestException(
            'Cannot deactivate the last active admin',
          );
        }
      }

      await this.userRepository.update(user_id, {
        is_active: updateStatusDto.is_active,
        updated_at: new Date(),
      });

      const updatedUser = await this.findOne(user_id);
      this.logger.log(
        `User status updated to ${updateStatusDto.is_active ? 'active' : 'inactive'}`,
        'UserService',
        {
          user_id,
          new_status: updateStatusDto.is_active,
        },
      );
      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error while updating user status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async changePassword(
    user_id: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    try {
      const user = await this.findOne(user_id);

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.current_password,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(
        changePasswordDto.new_password,
        12,
      );

      await this.userRepository.update(user_id, {
        password: hashedNewPassword,
        updated_at: new Date(),
      });

      this.logger.log('User password changed successfully', 'UserService', {
        user_id,
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error while changing password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email, is_active: true },
        relations: ['customer'],
      });

      if (user && (await bcrypt.compare(password, user.password))) {
        return user;
      }
      return null;
    } catch (error) {
      this.logger.logError(error, 'UserService', { email });
      return null;
    }
  }

  async remove(user_id: number): Promise<string> {
    try {
      const existingUser = await this.userRepository.findOne({
        where: { user_id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with id ${user_id} not found`);
      }

      // Business rule: Prevent deleting the last admin
      if (existingUser.role === UserRole.ADMIN) {
        const adminCount = await this.userRepository.count({
          where: { role: UserRole.ADMIN, is_active: true },
        });

        if (adminCount <= 1) {
          throw new BadRequestException('Cannot delete the last active admin');
        }
      }

      const result = await this.userRepository.delete(user_id);
      if (result.affected === 0) {
        throw new NotFoundException(`User not found`);
      }

      this.logger.log(
        `User with id ${user_id} deleted successfully`,
        'UserService',
      );
      return 'User deleted successfully';
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.logError(error, 'UserService', { user_id });
      throw new HttpException(
        'Error deleting user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { role },
        select: {
          user_id: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
          customer_id: true,
        },
      });
    } catch (error) {
      this.logger.logError(error, 'UserService', { role });
      throw new HttpException(
        'Error finding users by role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUserStats(): Promise<any> {
    try {
      const totalUsers = await this.userRepository.count();
      const activeUsers = await this.userRepository.count({
        where: { is_active: true },
      });
      const usersByRole = await this.userRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany();

      return {
        total_users: totalUsers,
        active_users: activeUsers,
        users_by_role: usersByRole,
      };
    } catch (error) {
      this.logger.logError(error, 'UserService');
      throw new HttpException(
        'Error getting user statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
