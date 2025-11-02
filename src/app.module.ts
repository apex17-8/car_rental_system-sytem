// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CarModule } from './car/car.module';
import { CustomerModule } from './customer/customer.module';
import { RentalModule } from './rental/rental.module';
import { PaymentModule } from './payment/payment.module';
import { InsuranceModule } from './insurance/insurance.module';
import { LocationModule } from './location/location.module';
import { ReservationModule } from './reservation/reservation.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './database/database.config';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger/logger.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    DatabaseModule,
    LoggerModule,
    CarModule,
    CustomerModule,
    RentalModule,
    PaymentModule,
    InsuranceModule,
    LocationModule,
    ReservationModule,
    MaintenanceModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
