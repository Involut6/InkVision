import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import type { Paginated, PaginationMeta } from '@inkvision/shared-types';

/** Hard ceiling on page size. Prevents unbounded responses. */
export const MAX_PER_PAGE = 100;
export const DEFAULT_PER_PAGE = 12;

export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: 'One-based page number.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be 1 or greater' })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PER_PAGE,
    default: DEFAULT_PER_PAGE,
    description: `Items per page. Capped at ${MAX_PER_PAGE}.`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'perPage must be an integer' })
  @Min(1, { message: 'perPage must be 1 or greater' })
  @Max(MAX_PER_PAGE, { message: `perPage must not exceed ${MAX_PER_PAGE}` })
  perPage?: number;
}

export class SortQueryDto {
  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'direction must be asc or desc' })
  direction?: 'asc' | 'desc';
}

export interface ResolvedPagination {
  readonly page: number;
  readonly perPage: number;
  readonly skip: number;
  readonly take: number;
}

/** Normalises possibly-absent query values into safe Prisma arguments. */
export function resolvePagination(query: PaginationQueryDto): ResolvedPagination {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, Math.trunc(query.perPage ?? DEFAULT_PER_PAGE)),
  );
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function buildPaginationMeta(
  total: number,
  { page, perPage }: Pick<ResolvedPagination, 'page' | 'perPage'>,
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
  return {
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

export function paginate<T>(
  data: readonly T[],
  total: number,
  pagination: Pick<ResolvedPagination, 'page' | 'perPage'>,
): Paginated<T> {
  return { data, meta: buildPaginationMeta(total, pagination) };
}
