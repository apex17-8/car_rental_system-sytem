import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CarService } from './car.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('cars')
export class CarController {
  constructor(private readonly carService: CarService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createCar(@Body() createCarDto: CreateCarDto) {
    return this.carService.create(createCarDto);
  }

  @Get()
  @Public()
  async getAllCars() {
    return this.carService.findAll();
  }

  @Get('available')
  @Public()
  async getAvailableCars() {
    return this.carService.findAvailable();
  }

  @Get('available-by-dates')
  @Public()
  async getAvailableByDates(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.carService.findAvailableByDates(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':id')
  @Public()
  async getCarById(@Param('id', ParseIntPipe) id: number) {
    // FIXED: Change findById to findOne
    return this.carService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateCar(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    return this.carService.update(id, updateCarDto);
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE)
  async updateCarAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    return this.carService.updateAvailability(id, updateDto.availability);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCar(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.carService.remove(id);
  }
}
