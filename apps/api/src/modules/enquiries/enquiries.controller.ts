import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import type {
  CreateEnquiryResponse,
  EnquiryDto,
  EnquirySummaryDto,
  Paginated,
} from '@inkvision/shared-types';

import { Client, CurrentUser, Public, RequirePermissions } from '../../common/decorators/index.js';
import type { ClientContext } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

import { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import {
  CreateEnquiryNoteDto,
  EnquiryExportQueryDto,
  EnquiryListQueryDto,
  UpdateEnquiryDto,
} from './dto/enquiry-admin.dto.js';
import { EnquiriesService } from './enquiries.service.js';

@ApiTags('Enquiries')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Public()
  // Five submissions per minute per IP. Generous for a person, restrictive for
  // a script; the honeypot and dedupe window cover the rest.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit an enquiry.',
    description:
      'The enquiry is persisted before any email is attempted, so notification problems never lose a submission. Repeating an identical submission within ten minutes returns the original reference instead of creating a duplicate.',
  })
  @ApiResponse({ status: 201, description: 'Enquiry received.' })
  @ApiResponse({ status: 400, description: 'Validation failed; `details` is keyed by field.' })
  @ApiResponse({ status: 429, description: 'Too many submissions from this address.' })
  async create(
    @Body() dto: CreateEnquiryDto,
    @Client() client: ClientContext,
  ): Promise<CreateEnquiryResponse> {
    return this.enquiries.create(dto, client);
  }
}

@ApiTags('Admin · Enquiries')
@Controller('admin/enquiries')
export class AdminEnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Get()
  @RequirePermissions('enquiry:read')
  @ApiOperation({ summary: 'Search and filter enquiries.' })
  async list(@Query() query: EnquiryListQueryDto): Promise<Paginated<EnquirySummaryDto>> {
    return this.enquiries.list(query);
  }

  @Get('export')
  @RequirePermissions('enquiry:export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="inkvision-enquiries.csv"')
  // Exports move personal data out of the system, so they need their own
  // permission and are recorded in the audit trail.
  @ApiOperation({ summary: 'Export the filtered enquiries as CSV.' })
  async exportCsv(
    @Query() query: EnquiryExportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<string> {
    return this.enquiries.exportCsv(query, user);
  }

  @Get(':id')
  @RequirePermissions('enquiry:read')
  @ApiOperation({ summary: 'Full enquiry with notes and status history.' })
  async findOne(@Param('id') id: string): Promise<EnquiryDto> {
    return this.enquiries.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('enquiry:write')
  @ApiOperation({ summary: 'Change status, assignment or follow-up date.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnquiryDto> {
    return this.enquiries.update(id, dto, user);
  }

  @Post(':id/notes')
  @RequirePermissions('enquiry:write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an internal note. Notes are never shown publicly.' })
  async addNote(
    @Param('id') id: string,
    @Body() dto: CreateEnquiryNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnquiryDto> {
    return this.enquiries.addNote(id, dto, user);
  }
}
