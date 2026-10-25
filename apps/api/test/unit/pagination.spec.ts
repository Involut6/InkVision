import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  buildPaginationMeta,
  paginate,
  resolvePagination,
} from '../../src/common/dto/pagination.dto.js';

describe('resolvePagination', () => {
  it('applies the defaults when nothing is supplied', () => {
    expect(resolvePagination({})).toEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      skip: 0,
      take: DEFAULT_PER_PAGE,
    });
  });

  it('computes the offset from page and size', () => {
    expect(resolvePagination({ page: 3, perPage: 10 })).toMatchObject({ skip: 20, take: 10 });
  });

  it('clamps an over-large page size, so a response can never be unbounded', () => {
    expect(resolvePagination({ perPage: 100_000 }).perPage).toBe(MAX_PER_PAGE);
  });

  it('clamps nonsensical values rather than producing a negative offset', () => {
    expect(resolvePagination({ page: 0, perPage: 0 })).toMatchObject({
      page: 1,
      perPage: 1,
      skip: 0,
    });
    expect(resolvePagination({ page: -5 }).skip).toBe(0);
  });

  it('truncates a fractional page number', () => {
    expect(resolvePagination({ page: 2.9, perPage: 10 })).toMatchObject({ page: 2, skip: 10 });
  });
});

describe('buildPaginationMeta', () => {
  it('describes a middle page correctly', () => {
    expect(buildPaginationMeta(25, { page: 2, perPage: 10 })).toEqual({
      page: 2,
      perPage: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('reports no pages and no navigation for an empty result', () => {
    expect(buildPaginationMeta(0, { page: 1, perPage: 10 })).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('marks the last page as having no next page', () => {
    expect(buildPaginationMeta(20, { page: 2, perPage: 10 })).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});

describe('paginate', () => {
  it('wraps rows with their metadata', () => {
    const result = paginate(['a', 'b'], 2, { page: 1, perPage: 10 });
    expect(result.data).toEqual(['a', 'b']);
    expect(result.meta.total).toBe(2);
  });
});
