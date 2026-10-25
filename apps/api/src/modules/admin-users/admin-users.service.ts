import { Injectable } from '@nestjs/common';

import { type AdminUserDto, ROLE_PERMISSIONS } from '@inkvision/shared-types';

import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AccessDeniedException,
  ResourceConflictException,
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { randomToken } from '../../common/utils/crypto.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PasswordService } from '../auth/password.service.js';
import { TokenService } from '../auth/token.service.js';

import type { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto.js';

const SAFE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  mustChangePassword: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<(AdminUserDto & { mustChangePassword: boolean })[]> {
    const rows = await this.prisma.adminUser.findMany({
      select: SAFE_SELECT,
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }],
    });

    return rows.map((row) => ({
      ...toDto(row),
      mustChangePassword: row.mustChangePassword,
    }));
  }

  /**
   * Invites a team member.
   *
   * No password is accepted or chosen here. A single-use temporary password is
   * generated, returned exactly once to the inviting administrator, and the
   * account is flagged to force a change at first sign-in. Nothing in the
   * repository or the seed data ever holds a usable credential.
   */
  async create(
    dto: CreateAdminUserDto,
    actor: AuthenticatedUser,
  ): Promise<{ user: AdminUserDto; temporaryPassword: string }> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new ResourceConflictException('An account with that email address already exists.');
    }

    // 24 random bytes, base64url: long enough that the temporary window is not
    // a weakness, and it must be changed on first use anyway.
    const temporaryPassword = randomToken(24);

    const created = await this.prisma.adminUser.create({
      data: {
        email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash: await this.passwords.hash(temporaryPassword),
        mustChangePassword: true,
      },
      select: SAFE_SELECT,
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'admin_user.created',
      entityType: 'AdminUser',
      entityId: created.id,
      summary: `${actor.email} created ${email} with role ${dto.role}`,
    });

    return { user: toDto(created), temporaryPassword };
  }

  async update(
    id: string,
    dto: UpdateAdminUserDto,
    actor: AuthenticatedUser,
  ): Promise<AdminUserDto> {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Administrator', id);

    // An operator must not be able to lock themselves out, or quietly grant
    // themselves a higher role.
    if (existing.id === actor.id) {
      if (dto.isActive === false) {
        throw new AccessDeniedException('You cannot deactivate your own account.');
      }
      if (dto.role !== undefined && dto.role !== existing.role) {
        throw new AccessDeniedException('You cannot change your own role.');
      }
    }

    if (existing.role === 'OWNER' && dto.role !== undefined && dto.role !== 'OWNER') {
      const owners = await this.prisma.adminUser.count({
        where: { role: 'OWNER', isActive: true },
      });
      if (owners <= 1) {
        throw new ValidationFailedException({
          role: ['There must always be at least one active owner.'],
        });
      }
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: SAFE_SELECT,
    });

    // Deactivation or a role change must take effect now, not when the token
    // happens to expire.
    if (dto.isActive === false || (dto.role !== undefined && dto.role !== existing.role)) {
      await this.tokens.revokeAllForUser(id);
    }

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'admin_user.updated',
      entityType: 'AdminUser',
      entityId: id,
      summary: `${actor.email} updated ${existing.email}`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return toDto(updated);
  }

  /** Issues a new temporary password and ends every existing session. */
  async resetPassword(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<{ temporaryPassword: string }> {
    const existing = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Administrator', id);

    const temporaryPassword = randomToken(24);

    await this.prisma.adminUser.update({
      where: { id },
      data: {
        passwordHash: await this.passwords.hash(temporaryPassword),
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.tokens.revokeAllForUser(id);

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'admin_user.password_reset',
      entityType: 'AdminUser',
      entityId: id,
      summary: `${actor.email} reset the password for ${existing.email}; all sessions revoked`,
    });

    return { temporaryPassword };
  }
}

function toDto(row: {
  id: string;
  email: string;
  fullName: string;
  role: AdminUserDto['role'];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}): AdminUserDto {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    permissions: ROLE_PERMISSIONS[row.role],
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
