import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ADMIN_ROLES, type AdminRole } from '@inkvision/shared-types';

import { NormaliseEmail } from '../../../common/dto/transforms.js';

/**
 * Note the absence of a password field: an administrator never sets another
 * person's password. The API generates a single-use temporary one and requires
 * it to be changed at first sign-in.
 */
export class CreateAdminUserDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(254)
  @NormaliseEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ enum: ADMIN_ROLES })
  @IsIn(ADMIN_ROLES)
  role!: AdminRole;
}

export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ enum: ADMIN_ROLES })
  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: AdminRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
