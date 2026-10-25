import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

import { NormaliseEmail, TrimString } from '../../../common/dto/transforms.js';

export class NewsletterSubscribeDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @MaxLength(254)
  @NormaliseEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @TrimString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Where the subscription came from, e.g. `footer`.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  source?: string;

  @ApiProperty({ description: 'Explicit consent. Must be true.' })
  @IsBoolean()
  @Equals(true, { message: 'Please confirm you would like to receive these emails.' })
  consent!: boolean;
}

export class NewsletterUnsubscribeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  token!: string;
}
