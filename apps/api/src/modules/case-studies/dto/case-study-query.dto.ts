import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import {
  PUBLICATION_STATUSES,
  WORK_KINDS,
  type PublicationStatus,
  type WorkKind,
} from '@inkvision/shared-types';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

export class CaseStudyListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Portfolio category slug.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    enum: WORK_KINDS,
    description: 'Filter by how the work came about. Sample work is labelled as such.',
  })
  @IsOptional()
  @IsIn(WORK_KINDS)
  kind?: WorkKind;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;
}

export class AdminCaseStudyListQueryDto extends CaseStudyListQueryDto {
  @ApiPropertyOptional({ enum: PUBLICATION_STATUSES })
  @IsOptional()
  @IsIn(PUBLICATION_STATUSES)
  status?: PublicationStatus;
}
