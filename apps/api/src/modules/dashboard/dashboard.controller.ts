import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AdminDashboardDto, AuditLogDto, Paginated } from '@inkvision/shared-types';

import { RequirePermissions } from '../../common/decorators/index.js';
import { DateRangeQueryDto } from '../../common/dto/date-range.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { AuditService } from '../audit/audit.service.js';

import { DashboardService } from './dashboard.service.js';

@ApiTags('Admin · Dashboard')
@Controller('admin')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly audit: AuditService,
  ) {}

  @Get('dashboard')
  // Readable by anyone who can see enquiries; content counts carry no detail
  // beyond totals.
  @RequirePermissions('enquiry:read')
  @ApiOperation({
    summary: 'Dashboard figures.',
    description: 'Defaults to the trailing 30 days; pass `from` and `to` to change the window.',
  })
  async get(@Query() query: DateRangeQueryDto): Promise<AdminDashboardDto> {
    return this.dashboard.build(query);
  }

  @Get('audit-log')
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'Administrative audit trail.' })
  async auditLog(@Query() query: PaginationQueryDto): Promise<Paginated<AuditLogDto>> {
    return this.audit.list(query);
  }
}
