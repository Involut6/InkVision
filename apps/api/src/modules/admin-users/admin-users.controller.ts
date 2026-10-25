import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AdminUserDto } from '@inkvision/shared-types';

import { CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { AdminUsersService } from './admin-users.service.js';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto.js';

@ApiTags('Admin · Team')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @RequirePermissions('user:read')
  async list() {
    return this.users.list();
  }

  @Post()
  @RequirePermissions('user:write')
  @ApiOperation({
    summary: 'Invite a team member.',
    description:
      'Returns a single-use temporary password that must be changed at first sign-in. It is shown exactly once and is not recoverable.',
  })
  @ApiResponse({ status: 409, description: 'That email address already has an account.' })
  async create(@Body() dto: CreateAdminUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('user:write')
  @ApiOperation({
    summary: 'Update a team member’s name, role or active state.',
    description:
      'Deactivating an account or changing its role revokes every session for that account immediately.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    return this.users.update(id, dto, user);
  }

  @Post(':id/reset-password')
  @RequirePermissions('user:write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue a new temporary password and revoke all sessions.' })
  async resetPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.resetPassword(id, user);
  }
}
