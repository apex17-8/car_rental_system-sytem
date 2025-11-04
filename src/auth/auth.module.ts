import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { User } from '../user/entities/user.entity';
import { Customer } from '../customer/entities/customer.entity';
import { RefreshToken } from './entities/refresh-token.entity'; // Add this import
import { UsersService } from '../user/user.service';
import { CustomerService } from '../customer/customer.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LoggerModule } from '../logger/logger.module';
import { UserModule } from '../user/user.module';
import { CustomerModule } from '../customer/customer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Customer, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'fallback-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    UserModule,
    CustomerModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    CustomerService,
    JwtStrategy,
    LocalStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
