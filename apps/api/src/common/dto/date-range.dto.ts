import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive lower bound, ISO-8601.' })
  @IsOptional()
  @IsISO8601({}, { message: 'from must be an ISO-8601 date' })
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive upper bound, ISO-8601.' })
  @IsOptional()
  @IsISO8601({}, { message: 'to must be an ISO-8601 date' })
  to?: string;
}

export interface ResolvedDateRange {
  readonly from: Date;
  readonly to: Date;
}

/** Defaults to the trailing 30 days when neither bound is supplied. */
export function resolveDateRange(
  query: DateRangeQueryDto,
  defaultDays = 30,
  now: Date = new Date(),
): ResolvedDateRange {
  const to = query.to ? new Date(query.to) : now;
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - defaultDays * 24 * 60 * 60 * 1000);

  // Tolerate a reversed range rather than erroring in a dashboard query.
  return from <= to ? { from, to } : { from: to, to: from };
}
