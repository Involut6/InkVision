import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  ENQUIRY_STATUSES,
  SERVICE_INTERESTS,
  type EnquiryStatus,
  type ServiceInterest,
} from '@inkvision/shared-types';

import { DateRangeQueryDto } from '../../../common/dto/date-range.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class EnquiryListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ENQUIRY_STATUSES })
  @IsOptional()
  @IsIn(ENQUIRY_STATUSES)
  status?: EnquiryStatus;

  @ApiPropertyOptional({ enum: SERVICE_INTERESTS })
  @IsOptional()
  @IsIn(SERVICE_INTERESTS)
  serviceInterest?: ServiceInterest;

  @ApiPropertyOptional({ description: 'Matches name, email, organisation or reference.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'updatedAt', 'status'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'status'])
  sort?: 'createdAt' | 'updatedAt' | 'status';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc';
}

export class UpdateEnquiryDto {
  @ApiPropertyOptional({ enum: ENQUIRY_STATUSES })
  @IsOptional()
  @IsIn(ENQUIRY_STATUSES)
  status?: EnquiryStatus;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  followUpAt?: string | null;

  @ApiPropertyOptional({ description: 'Recorded alongside the status change.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  statusReason?: string;
}

export class CreateEnquiryNoteDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1, { message: 'A note cannot be empty.' })
  @MaxLength(5000)
  body!: string;
}

export class EnquiryExportQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: ENQUIRY_STATUSES })
  @IsOptional()
  @IsIn(ENQUIRY_STATUSES)
  status?: EnquiryStatus;

  @ApiPropertyOptional({ enum: SERVICE_INTERESTS })
  @IsOptional()
  @IsIn(SERVICE_INTERESTS)
  serviceInterest?: ServiceInterest;
}
