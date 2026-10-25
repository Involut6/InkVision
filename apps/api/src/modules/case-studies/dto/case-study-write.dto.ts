import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { WORK_KINDS, type WorkKind } from '@inkvision/shared-types';

export class CaseStudyExcerptInputDto {
  @ApiProperty({ description: 'What the excerpt is, e.g. "Opening paragraph".' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  label!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateCaseStudyDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  summary!: string;

  @ApiProperty({
    enum: WORK_KINDS,
    description:
      'COMMISSIONED is real client work and requires client approval to publish. SAMPLE and CONCEPT are illustrative and are labelled as such on the site.',
  })
  @IsIn(WORK_KINDS)
  kind!: WorkKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Only published when clientApproved is true.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  industry?: string;

  @ApiProperty({ description: 'The communication challenge. Rich text.' })
  @IsString()
  @MaxLength(30_000)
  challengeHtml!: string;

  @ApiProperty({ description: 'The objective. Rich text.' })
  @IsString()
  @MaxLength(30_000)
  objectiveHtml!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  strategicQuestion?: string;

  @ApiProperty({ description: 'Research approach. Rich text.' })
  @IsString()
  @MaxLength(30_000)
  researchApproachHtml!: string;

  @ApiProperty({ description: 'Editorial approach. Rich text.' })
  @IsString()
  @MaxLength(30_000)
  editorialApproachHtml!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  deliverables?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Published only when outcomesVerified is true.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  outcomes?: string[];

  @ApiPropertyOptional({ description: 'Set only when the outcomes have been verified.' })
  @IsOptional()
  @IsBoolean()
  outcomesVerified?: boolean;

  @ApiPropertyOptional({ description: 'Set only when the client has approved publication.' })
  @IsOptional()
  @IsBoolean()
  clientApproved?: boolean;

  @ApiPropertyOptional({ type: [CaseStudyExcerptInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CaseStudyExcerptInputDto)
  excerpts?: CaseStudyExcerptInputDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coverImageId?: string;

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
}

export class UpdateCaseStudyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(20) @MaxLength(500) summary?: string;
  @ApiPropertyOptional({ enum: WORK_KINDS }) @IsOptional() @IsIn(WORK_KINDS) kind?: WorkKind;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() categoryId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(200) clientName?:
    string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(160) industry?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30_000) challengeHtml?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30_000) objectiveHtml?: string;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  strategicQuestion?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30_000) researchApproachHtml?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30_000)
  editorialApproachHtml?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(400, { each: true })
  outcomes?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() outcomesVerified?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() clientApproved?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: [CaseStudyExcerptInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => CaseStudyExcerptInputDto)
  excerpts?: CaseStudyExcerptInputDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUUID('4', { each: true })
  serviceIds?: string[];

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() coverImageId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) seoDescription?: string;
}
