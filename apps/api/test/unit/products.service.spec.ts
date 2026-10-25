import { describe, expect, it, vi } from 'vitest';

import { ProductsService } from '../../src/modules/products/products.service.js';
import type { AppConfigService } from '../../src/config/configuration.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import type { AuditService } from '../../src/modules/audit/audit.service.js';

/**
 * `isPurchasable` is the single rule that decides whether money can change
 * hands for a product. Every branch is covered, because a false positive here
 * means offering something the system cannot deliver.
 */
function makeService(commerceEnabled: boolean): ProductsService {
  const config = {
    commerce: { enabled: commerceEnabled },
    publicApiUrl: 'http://localhost:4000',
    globalPrefix: 'api',
  } as unknown as AppConfigService;

  return new ProductsService({} as PrismaService, config, {
    record: vi.fn(),
  } as unknown as AuditService);
}

const deliverable = { kind: 'DELIVERABLE', isCurrent: true };

describe('ProductsService.isPurchasable', () => {
  it('is true only when every condition holds', () => {
    expect(
      makeService(true).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: 950_000,
        currency: 'NGN',
        assets: [deliverable],
      } as never),
    ).toBe(true);
  });

  it('is false when commerce is disabled for the deployment', () => {
    expect(
      makeService(false).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: 950_000,
        currency: 'NGN',
        assets: [deliverable],
      } as never),
    ).toBe(false);
  });

  it.each([['DRAFT'], ['COMING_SOON'], ['ARCHIVED']] as const)(
    'is false when the product status is %s',
    (status) => {
      expect(
        makeService(true).isPurchasable({
          status,
          priceAmountMinor: 950_000,
          currency: 'NGN',
          assets: [deliverable],
        } as never),
      ).toBe(false);
    },
  );

  it('is false without a price', () => {
    expect(
      makeService(true).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: null,
        currency: 'NGN',
        assets: [deliverable],
      } as never),
    ).toBe(false);
  });

  it('is false for a zero or negative price', () => {
    for (const priceAmountMinor of [0, -100]) {
      expect(
        makeService(true).isPurchasable({
          status: 'ACTIVE',
          priceAmountMinor,
          currency: 'NGN',
          assets: [deliverable],
        } as never),
      ).toBe(false);
    }
  });

  it('is false without a currency', () => {
    expect(
      makeService(true).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: 950_000,
        currency: null,
        assets: [deliverable],
      } as never),
    ).toBe(false);
  });

  it('is false with no deliverable file attached', () => {
    expect(
      makeService(true).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: 950_000,
        currency: 'NGN',
        assets: [{ kind: 'COVER', isCurrent: true }],
      } as never),
    ).toBe(false);
  });

  it('is false when the only deliverable is a superseded version', () => {
    expect(
      makeService(true).isPurchasable({
        status: 'ACTIVE',
        priceAmountMinor: 950_000,
        currency: 'NGN',
        assets: [{ kind: 'DELIVERABLE', isCurrent: false }],
      } as never),
    ).toBe(false);
  });
});
