import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PUBLICATION_STATUSES, type PublicationStatus } from '@inkvision/shared-types';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

/** Query strings arrive as text; `"true"`/`"false"` become booleans here. */
const toOptionalBoolean = ({ value }: { value: unknown }) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

export class ArticleListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Category slug.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ description: 'Tag slug.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag?: string;

  @ApiPropertyOptional({ description: 'Free-text search over title, summary and body.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: ['publishedAt', 'title'], default: 'publishedAt' })
  @IsOptional()
  @IsIn(['publishedAt', 'title'])
  sort?: 'publishedAt' | 'title';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc';
}

export class AdminArticleListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PUBLICATION_STATUSES })
  @IsOptional()
  @IsIn(PUBLICATION_STATUSES)
  status?: PublicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class SlugParamDto {
  @IsString()
  @MaxLength(120)
  @Type(() => String)
  slug!: string;
}
