// src/reservation/reservation.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUser() user: any,
  ) {
    // For customers, auto-set the customer_id to their own ID
    if (user.role === UserRole.CUSTOMER) {
      createReservationDto.customer_id = user.customer_id;
    }

    return await this.reservationService.create(
      createReservationDto,
      user.user_id,
      user.role,
    );
  }

  @Get()
  async findAll(
    @GetUser() user: any,
    @Query('customer_id') customerId?: number,
  ) {
    return await this.reservationService.findAll(
      user.user_id,
      user.role,
      user.customer_id,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return await this.reservationService.findOne(
      id,
      user.user_id,
      user.role,
      user.customer_id,
    );
  }

  @Get('customer/:customer_id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CUSTOMER)
  async findByCustomer(
    @Param('customer_id', ParseIntPipe) customerId: number,
    @GetUser() user: any,
  ) {
    return await this.reservationService.findByCustomer(
      customerId,
      user.user_id,
      user.role,
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async cancel(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return await this.reservationService.cancel(
      id,
      user.user_id,
      user.role,
      user.customer_id,
    );
  }

  @Patch(':id/confirm')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async confirm(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return await this.reservationService.confirm(id, user.user_id, user.role);
  }

  @Post(':id/convert-to-rental')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async convertToRental(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    return await this.reservationService.convertToRental(
      id,
      user.user_id,
      user.role,
    );
  }

  @Public()
  @Get('availability/:car_id')
  async checkAvailability(
    @Param('car_id', ParseIntPipe) carId: number,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    // This endpoint is public - no auth required
    const isAvailable = true;
    return { available: isAvailable };
  }
}
