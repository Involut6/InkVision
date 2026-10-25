import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const LEGAL_PAGE_SLUGS = ['privacy', 'terms', 'refund-policy'] as const;

export class UpdateLegalPageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ description: 'Rich text. Sanitised server-side.' })
  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  bodyHtml?: string;

  @ApiPropertyOptional({
    description:
      'Clear this once the business or its legal adviser has reviewed the page. While set, the website shows a visible "awaiting review" notice.',
  })
  @IsOptional()
  @IsBoolean()
  awaitingReview?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  effectiveAt?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(70) seoTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) seoDescription?: string;
}

export class LegalPageSlugParamDto {
  @IsIn(LEGAL_PAGE_SLUGS)
  slug!: (typeof LEGAL_PAGE_SLUGS)[number];
}
