import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SocialProfileInputDto {
  @IsString()
  @MaxLength(40)
  platform!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  url!: string;

  @IsString()
  @MaxLength(80)
  label!: string;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) siteName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) supportingStatement?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid contact email address.' })
  @MaxLength(254)
  contactEmail?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  addressLines?: string[];

  @ApiPropertyOptional({ type: [SocialProfileInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SocialProfileInputDto)
  socialProfiles?: SocialProfileInputDto[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() newsletterEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) newsletterHeadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(600) newsletterBody?: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Where new-enquiry notifications should go. EMAIL_NOTIFICATIONS_TO takes precedence at runtime.',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  notificationEmail?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Only surfaced when a scheduling provider is also configured in the environment.',
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  schedulingUrl?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(70) defaultSeoTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(180) defaultSeoDescription?: string;

  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() logoId?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsUUID() defaultOgImageId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'The registered legal identity. Left unset until the business supplies it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalEntityName?: string | null;
}
