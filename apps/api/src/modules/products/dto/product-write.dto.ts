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
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PRODUCT_STATUSES, type ProductStatus } from '@inkvision/shared-types';

import { UppercaseCode } from '../../../common/dto/transforms.js';

export class CreateProductDto {
  @ApiProperty({ example: 'Personal Branding Blueprint for Corporate Professionals' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(500)
  summary!: string;

  @ApiProperty({ description: 'Rich text. Sanitised server-side.' })
  @IsString()
  @MaxLength(60_000)
  descriptionHtml!: string;

  @ApiProperty({ description: 'Who the resource is for.' })
  @IsString()
  @MinLength(10)
  @MaxLength(600)
  intendedAudience!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  benefits?: string[];

  @ApiPropertyOptional({ type: [String], description: 'What is inside the resource.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  contents?: string[];

  @ApiPropertyOptional({
    description: 'Price in integer minor units — 950000 means ₦9,500.00. Never a decimal.',
    example: 950000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'priceAmountMinor must be a whole number of minor units.' })
  @Min(0)
  priceAmountMinor?: number;

  @ApiPropertyOptional({ description: 'ISO-4217 code, e.g. NGN, GBP, USD.', example: 'NGN' })
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'currency must be a three-letter ISO-4217 code.' })
  @UppercaseCode()
  currency?: string;

  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  fileFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  deliveryMethod?: string;

  @ApiPropertyOptional({ description: 'Required before a product can be made available.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  refundTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  updatePolicy?: string;

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

export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) slug?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(200) subtitle?:
    string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(20) @MaxLength(500) summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60_000) descriptionHtml?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(600)
  intendedAudience?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  benefits?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  contents?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceAmountMinor?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  @UppercaseCode()
  currency?: string | null;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(40) fileFormat?:
    string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fileSizeBytes?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageCount?: number | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryMethod?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(2000) refundTerms?:
    string | null;
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  updatePolicy?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) seoDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class SetProductStatusDto {
  @ApiProperty({
    enum: PRODUCT_STATUSES,
    description:
      'Moving to ACTIVE requires a price, a currency, refund terms and an attached deliverable file.',
  })
  @IsIn(PRODUCT_STATUSES)
  status!: ProductStatus;
}
