import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto } from './dto/create-insurance.dto';
import { UpdateInsuranceDto } from './dto/update-insurance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';
import { RenewInsuranceDto } from './dto/renew-insurance.dto';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createInsuranceDto: CreateInsuranceDto) {
    return this.insuranceService.create(createInsuranceDto);
  }

  @Get()
  @Public()
  findAll() {
    return this.insuranceService.findAll();
  }

  @Get('active')
  @Public()
  findActive() {
    return this.insuranceService.findActive();
  }

  @Get('car/:carId')
  @Public()
  findByCar(@Param('carId', ParseIntPipe) carId: number) {
    return this.insuranceService.findByCar(carId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.insuranceService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInsuranceDto: UpdateInsuranceDto,
  ) {
    return this.insuranceService.update(id, updateInsuranceDto);
  }

  @Post(':id/renew')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() renewInsuranceDto: RenewInsuranceDto,
  ) {
    return this.insuranceService.renew(
      id,
      renewInsuranceDto.new_end_date,
      renewInsuranceDto.new_premium,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.insuranceService.remove(id);
  }
}
