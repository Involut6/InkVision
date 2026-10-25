import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

import { MIN_PASSWORD_LENGTH } from '../password.service.js';

import { NormaliseEmail } from '../../../common/dto/transforms.js';

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  @NormaliseEmail()
  email!: string;

  @ApiProperty({ minLength: 1, writeOnly: true })
  @IsString()
  // No minimum here on purpose: the login endpoint must not advertise the
  // password policy. Strength is enforced when a password is *set*.
  @MinLength(1, { message: 'Enter your password.' })
  @MaxLength(256)
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1, { message: 'Enter your current password.' })
  @MaxLength(256)
  currentPassword!: string;

  @ApiProperty({ writeOnly: true, minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Your new password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
  })
  @MaxLength(256)
  newPassword!: string;
}
