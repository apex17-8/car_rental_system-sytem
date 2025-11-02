import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
// REMOVE: import { addDays, addMinutes } from 'date-fns';

import { User, UserRole } from '../../user/entities/user.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { UsersService } from '../../user/user.service';
import { CustomerService } from '../../customer/customer.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { LoggerService } from '../../logger/services/logger.service';
import { TokenPayload } from '../interfaces/token-payload.interface';
import { RefreshToken } from '../entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private usersService: UsersService,
    private customerService: CustomerService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addMinutes(date: Date, minutes: number): Date {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  async register(registerDto: RegisterDto) {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: registerDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // For public registration, always create as CUSTOMER
      if (registerDto.role && ['admin', 'manager'].includes(registerDto.role)) {
        throw new BadRequestException(
          'Cannot register with admin or manager role',
        );
      }

      // Create customer first
      const customer = this.customerRepository.create({
        first_name: registerDto.first_name,
        last_name: registerDto.last_name,
        phone_number: registerDto.phone_number,
        address: registerDto.address,
        driver_license: registerDto.driver_license,
      });

      const savedCustomer = await this.customerRepository.save(customer);

      // Create user linked to customer
      const user = await this.usersService.create({
        email: registerDto.email,
        password: registerDto.password,
        role: UserRole.CUSTOMER,
        customer_id: savedCustomer.customer_id,
        is_active: true,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);
      await this.saveRefreshToken(user.user_id, tokens.refresh_token);

      this.logger.log(
        `Customer registered successfully - User ID: ${user.user_id}, Email: ${user.email}, Role: ${user.role}`,
      );

      return {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          customer_id: user.customer_id,
        },
        customer: {
          customer_id: savedCustomer.customer_id,
          first_name: savedCustomer.first_name,
          last_name: savedCustomer.last_name,
        },
        ...tokens,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to register user', error);
      throw new HttpException(
        'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.is_active) {
        throw new ForbiddenException('Account is deactivated');
      }

      const tokens = await this.generateTokens(user);
      await this.saveRefreshToken(user.user_id, tokens.refresh_token);

      this.logger.log(
        `User logged in successfully - User ID: ${user.user_id}, Email: ${user.email}`,
      );

      return {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          customer_id: user.customer_id,
        },
        ...tokens,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to login user', error);
      throw new HttpException(
        'Failed to login user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        // Remove specific refresh token
        await this.refreshTokenRepository.delete({
          user_id: userId,
          token: await this.hashRefreshToken(refreshToken),
        });
      } else {
        // Remove all refresh tokens for user
        await this.refreshTokenRepository.delete({ user_id: userId });
      }

      this.logger.log(`User logged out successfully - User ID: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to logout user', error);
      throw new HttpException(
        'Failed to logout user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async refreshTokens(userId: number, refreshToken: string) {
    try {
      // Find the refresh token in database
      const hashedToken = await this.hashRefreshToken(refreshToken);
      const storedToken = await this.refreshTokenRepository.findOne({
        where: {
          user_id: userId,
          token: hashedToken,
          is_revoked: false,
        },
        relations: ['user'],
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > storedToken.expires_at) {
        // Remove expired token
        await this.refreshTokenRepository.delete({ id: storedToken.id });
        throw new UnauthorizedException('Refresh token expired');
      }

      const user = storedToken.user;

      if (!user.is_active) {
        throw new ForbiddenException('Account is deactivated');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Revoke old refresh token and save new one
      await this.refreshTokenRepository.update(storedToken.id, {
        is_revoked: true,
        revoked_at: new Date(),
      });

      await this.saveRefreshToken(user.user_id, tokens.refresh_token);

      this.logger.log(`Tokens refreshed successfully - User ID: ${userId}`);

      return {
        user: {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          customer_id: user.customer_id,
        },
        ...tokens,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Failed to refresh tokens', error);
      throw new HttpException(
        'Failed to refresh tokens',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        relations: ['customer'],
      });

      if (user && (await user.validatePassword(password))) {
        return user;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error validating user with email ${email}`, error);
      return null;
    }
  }

  async forgotPassword(email: string) {
    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists for security
        return {
          message:
            'If the email exists, password reset instructions have been sent',
        };
      }

      // Generate reset token
      const resetToken = uuidv4();
      const resetTokenExpiry = this.addMinutes(new Date(), 15); // 15 minutes expiry

      // Store reset token in database
      await this.userRepository.update(user.user_id, {
        password_reset_token: await bcrypt.hash(resetToken, 12),
        password_reset_expires: resetTokenExpiry,
      });

      this.logger.log(
        `Password reset requested - User ID: ${user.user_id}, Email: ${user.email}`,
      );

      return {
        message:
          'If the email exists, password reset instructions have been sent',
        // return the token for testing
        reset_token:
          process.env.NODE_ENV === 'development' ? resetToken : undefined,
      };
    } catch (error) {
      // Don't reveal if email exists or not for security
      this.logger.error('Failed to process forgot password request', error);
      return {
        message:
          'If the email exists, password reset instructions have been sent',
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Find user with valid reset token
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.password_reset_expires > :now', { now: new Date() })
        .getMany();

      let user: User | null = null;
      for (const u of users) {
        if (
          u.password_reset_token &&
          (await bcrypt.compare(token, u.password_reset_token))
        ) {
          user = u;
          break;
        }
      }

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      await this.userRepository.update(user.user_id, {
        password: newPassword,
        password_reset_token: null as any, 
        password_reset_expires: null as any, 
      });

      // Revoke all existing refresh tokens for security
      await this.refreshTokenRepository.update(
        { user_id: user.user_id },
        { is_revoked: true, revoked_at: new Date() },
      );

      this.logger.log(`Password reset successfully - User ID: ${user.user_id}`);

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      this.logger.error('Failed to reset password', error);
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  private async generateTokens(user: User) {
    const payload: TokenPayload = {
      email: user.email,
      sub: user.user_id,
      role: user.role,
      customer_id: user.customer_id,
      type: 'access_token',
    };

    const refreshPayload: TokenPayload = {
      ...payload,
      type: 'refresh_token',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes in seconds
    };
  }

  private async saveRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedToken = await this.hashRefreshToken(refreshToken);
    const expiresAt = this.addDays(new Date(), 7); // 7 days expiry

    const refreshTokenEntity = this.refreshTokenRepository.create({
      user_id: userId,
      token: hashedToken,
      expires_at: expiresAt,
      is_revoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return bcrypt.hash(token, 12);
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.refreshTokenRepository
        .createQueryBuilder()
        .delete()
        .where('expires_at < :now OR is_revoked = :revoked', {
          now: new Date(),
          revoked: true,
        })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }
}
