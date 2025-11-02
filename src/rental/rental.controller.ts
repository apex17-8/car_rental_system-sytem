// src/rental/controllers/rental.controller.ts
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
} from '@nestjs/common';
import { RentalService } from './rental.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { CompleteRentalDto } from './dto/complete-rental.dto';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { Roles } from './../auth/decorators/roles.decorator';
import { UserRole } from '../user/dto/create-user.dto';
import { GetUser } from './../auth/decorators/get-user.decorator';

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalController {
  constructor(private readonly rentalService: RentalService) {}

  @Post('from-reservation/:reservation_id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async createFromReservation(
    @Param('reservation_id', ParseIntPipe) reservationId: number,
    @GetUser() user: any,
  ) {
    return await this.rentalService.createFromReservation(
      reservationId,
      user.user_id,
      user.role,
    );
  }

  @Post('direct')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  @HttpCode(HttpStatus.CREATED)
  async createDirect(
    @Body() createRentalDto: CreateRentalDto,
    @GetUser() user: any,
  ) {
    return await this.rentalService.createDirect(
      createRentalDto,
      user.user_id,
      user.role,
    );
  }

  @Get()
  async findAll(@GetUser() user: any) {
    return await this.rentalService.findAll(
      user.user_id,
      user.role,
      user.customer_id,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return await this.rentalService.findOne(
      id,
      user.user_id,
      user.role,
      user.customer_id,
    );
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async completeRental(
    @Param('id', ParseIntPipe) id: number,
    @Body() completeRentalDto: CompleteRentalDto,
    @GetUser() user: any,
  ) {
    return await this.rentalService.completeRental(
      id,
      completeRentalDto.actual_return_date,
      user.user_id,
      user.role,
    );
  }

  @Get('customer/:customer_id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CUSTOMER)
  async findByCustomer(
    @Param('customer_id', ParseIntPipe) customerId: number,
    @GetUser() user: any,
  ) {
    // Authorization handled in service
    return await this.rentalService.findAll(
      user.user_id,
      user.role,
      customerId,
    );
  }
}
