import { Injectable, Logger } from '@nestjs/common';

import type { AuditLogDto, Paginated } from '@inkvision/shared-types';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  paginate,
  resolvePagination,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto.js';

export interface AuditEntry {
  readonly actorId?: string | null;
  readonly actorEmail?: string | null;
  /** Dotted action name, e.g. `article.published`. */
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly summary: string;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string | null;
}

/** Keys never written to the audit trail, whatever a caller passes. */
const REDACTED_METADATA_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'tokenhash',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
]);

/**
 * Append-only record of consequential administrative actions.
 *
 * Writing an audit row must never be the reason a legitimate operation fails,
 * so failures here are logged and swallowed. Nothing in the application reads
 * the trail to make a decision.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          actorEmail: entry.actorEmail ?? null,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          summary: entry.summary,
          metadata: entry.metadata ? (redact(entry.metadata) as Prisma.InputJsonObject) : undefined,
          ipAddress: entry.ipAddress ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        { action: entry.action, entityType: entry.entityType, err: describe(error) },
        'Failed to write audit log entry',
      );
    }
  }

  async list(
    query: PaginationQueryDto & { entityType?: string; actorId?: string },
  ): Promise<Paginated<AuditLogDto>> {
    const pagination = resolvePagination(query);

    const where = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(rows.map(toDto), total, pagination);
  }

  async recent(limit: number): Promise<AuditLogDto[]> {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return rows.map(toDto);
  }
}

function toDto(row: {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  summary: string;
  createdAt: Date;
}): AuditLogDto {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    summary: row.summary,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Shallow redaction of sensitive keys before metadata is persisted. */
function redact(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    result[key] = REDACTED_METADATA_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  }
  return result;
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
