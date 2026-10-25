import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  ENQUIRY_TIMELINES,
  SERVICE_INTERESTS,
  type EnquiryTimeline,
  type ServiceInterest,
} from '@inkvision/shared-types';

import { NormaliseEmail, TrimString } from '../../../common/dto/transforms.js';

/**
 * The public enquiry payload.
 *
 * Validation here mirrors the Zod schema the website uses, so a visitor gets
 * the same messages client-side and the server never relies on the browser
 * having checked anything.
 */
export class CreateEnquiryDto {
  @ApiProperty({ example: 'Adaeze Okonkwo' })
  @IsString()
  @TrimString()
  @MinLength(2, { message: 'Please enter your full name.' })
  @MaxLength(120, { message: 'Your name must be 120 characters or fewer.' })
  fullName!: string;

  @ApiProperty({ example: 'adaeze@example.com' })
  @IsEmail({}, { message: 'Please enter a valid work email address.' })
  @MaxLength(254)
  @NormaliseEmail()
  workEmail!: string;

  @ApiPropertyOptional({ example: 'Director of Operations, Meridian Group' })
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(200)
  organisationOrRole?: string;

  @ApiProperty({ enum: SERVICE_INTERESTS })
  @IsIn(SERVICE_INTERESTS, { message: 'Please choose the service you are interested in.' })
  serviceInterest!: ServiceInterest;

  @ApiProperty({ description: 'The challenge or requirement, in the visitor’s own words.' })
  @IsString()
  @TrimString()
  @MinLength(20, { message: 'Please tell us a little more — at least 20 characters.' })
  @MaxLength(5000, { message: 'Please keep your message under 5,000 characters.' })
  message!: string;

  @ApiProperty({ enum: ENQUIRY_TIMELINES })
  @IsIn(ENQUIRY_TIMELINES, { message: 'Please choose a timeline.' })
  timeline!: EnquiryTimeline;

  @ApiPropertyOptional({ description: 'Free text; no fixed bands are imposed.' })
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(120)
  budgetRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @TrimString()
  @MaxLength(200)
  referralSource?: string;

  @ApiProperty({
    description: 'Consent to be contacted about this enquiry. Must be true.',
  })
  @IsBoolean()
  @Equals(true, {
    message: 'Please confirm you are happy for us to contact you about this enquiry.',
  })
  consent!: boolean;

  @ApiPropertyOptional({
    description:
      'Honeypot. Hidden from sighted and assistive-technology users alike; a real visitor never fills it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
