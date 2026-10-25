import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { NormaliseEmail, TrimString } from '../../../common/dto/transforms.js';

/**
 * Note what is absent: there is no price field.
 *
 * The server looks the price up from the product on every checkout, so the
 * browser has nothing to tamper with. A payload that tried to send one would be
 * rejected outright by the global `forbidNonWhitelisted` validation setting.
 */
export class CheckoutDto {
  @ApiProperty({ example: 'personal-branding-blueprint-for-corporate-professionals' })
  @IsString()
  @MaxLength(120)
  productSlug!: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Please enter a valid email address so we can deliver your purchase.' })
  @MaxLength(254)
  @NormaliseEmail()
  customerEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @TrimString()
  customerName!: string;

  @ApiPropertyOptional({
    description: 'Client-generated key making a retried checkout safe to repeat.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}

export class OrderAccessQueryDto {
  @ApiProperty({ description: 'The opaque token from the confirmation link.' })
  @IsString()
  @MaxLength(200)
  token!: string;
}

export class DownloadQueryDto {
  @ApiProperty({ description: 'Expiry, as epoch milliseconds. Covered by the signature.' })
  @IsString()
  @MaxLength(20)
  expires!: string;

  @ApiProperty({ description: 'HMAC over the delivery id and expiry.' })
  @IsString()
  @MaxLength(128)
  signature!: string;
}
