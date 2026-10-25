import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PUBLICATION_STATUSES, type PublicationStatus } from '@inkvision/shared-types';

export class ServiceComponentInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(600)
  description!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class ServiceProcessStageInputDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(400)
  summary!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(1200)
  detail!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class FaqItemInputDto {
  @IsString()
  @MinLength(5)
  @MaxLength(300)
  question!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  answer!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  tagline?: string;

  @ApiPropertyOptional({ description: 'The business need this service addresses.' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(600)
  businessNeed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(600)
  audience?: string;

  @ApiPropertyOptional({ description: 'Rich text. Sanitised server-side on write.' })
  @IsOptional()
  @IsString()
  @MaxLength(30_000)
  problemHtml?: string;

  @ApiPropertyOptional({ description: 'Rich text. Sanitised server-side on write.' })
  @IsOptional()
  @IsString()
  @MaxLength(30_000)
  approachHtml?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ type: [ServiceComponentInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceComponentInputDto)
  components?: ServiceComponentInputDto[];

  @ApiPropertyOptional({ type: [ServiceProcessStageInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceProcessStageInputDto)
  processStages?: ServiceProcessStageInputDto[];

  @ApiPropertyOptional({ type: [FaqItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemInputDto)
  faqs?: FaqItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ctaHeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  ctaBody?: string;

  @ApiPropertyOptional({ description: 'Lucide icon name used on service cards.' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoDescription?: string;

  @ApiPropertyOptional({ enum: PUBLICATION_STATUSES })
  @IsOptional()
  @IsIn(PUBLICATION_STATUSES)
  status?: PublicationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}
