// src/user/controllers/user.controller.ts
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
import { UsersService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './../auth/guards/jwt-auth.guard';
import { RolesGuard } from './../auth/guards/roles.guard';
import { Roles } from './../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { GetUser } from './../auth/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('profile')
  async getProfile(@GetUser() user: any) {
    return await this.usersService.findOne(user.user_id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOne(id);
  }

  @Get('email/:email')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findByEmail(@Param('email') email: string) {
    return await this.usersService.findByEmail(email);
  }

  @Patch('profile')
  async updateProfile(
    @GetUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(user.user_id, updateUserDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return await this.usersService.updateRole(id, updateRoleDto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return await this.usersService.updateStatus(id, updateStatusDto);
  }

  @Patch('change-password')
  async changePassword(
    @GetUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.user_id, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    const message = await this.usersService.remove(id);
    return { message };
  }

  // Additional useful endpoints
  @Get('role/:role')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findByRole(@Param('role') role: UserRole) {
    return await this.usersService.findByRole(role);
  }

  @Get('stats/count')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async getUserStats() {
    return await this.usersService.getUserStats();
  }
}
