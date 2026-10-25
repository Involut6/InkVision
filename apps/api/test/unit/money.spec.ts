import { describe, expect, it } from 'vitest';

import {
  addMoney,
  assertSameCurrency,
  formatMoney,
  minorUnitExponent,
  multiplyMoney,
  toMoney,
} from '../../src/common/utils/money.js';

/**
 * `Intl.NumberFormat` separates a currency code from the amount with a
 * non-breaking space, and which space it uses varies by ICU version. The exact
 * character is an implementation detail, so assertions normalise it rather
 * than pinning the suite to one Node build.
 */
const normalise = (value: string) => value.replace(/\u00a0|\u202f/g, ' ');

describe('money', () => {
  it('uses two minor-unit digits by default', () => {
    expect(minorUnitExponent('NGN')).toBe(2);
    expect(minorUnitExponent('gbp')).toBe(2);
  });

  it('knows the currencies with no minor unit', () => {
    expect(minorUnitExponent('JPY')).toBe(0);
    expect(minorUnitExponent('KRW')).toBe(0);
  });

  it('knows the three-digit minor units', () => {
    expect(minorUnitExponent('KWD')).toBe(3);
  });

  it('returns null unless both amount and currency are present', () => {
    expect(toMoney(null, 'NGN')).toBeNull();
    expect(toMoney(1000, null)).toBeNull();
    expect(toMoney(1000, 'ngn')).toEqual({ amountMinor: 1000, currency: 'NGN' });
  });

  it('formats minor units as a major-unit amount', () => {
    expect(normalise(formatMoney({ amountMinor: 950_000, currency: 'GBP' }, 'en-GB'))).toBe(
      '£9,500.00',
    );
  });

  it('formats a zero-minor-unit currency without decimals', () => {
    // The symbol is locale-dependent (en-GB disambiguates yen as "JP¥"); what
    // this asserts is the absence of a fractional part.
    const formatted = normalise(formatMoney({ amountMinor: 9500, currency: 'JPY' }, 'en-GB'));
    expect(formatted).toContain('9,500');
    expect(formatted).not.toContain('.');
  });

  it('formats an unrecognised currency as code plus amount', () => {
    expect(normalise(formatMoney({ amountMinor: 1234, currency: 'XYZ' }, 'en-GB'))).toBe(
      'XYZ 12.34',
    );
  });

  it('refuses to combine different currencies', () => {
    const ngn = { amountMinor: 100, currency: 'NGN' };
    const gbp = { amountMinor: 100, currency: 'GBP' };
    expect(() => assertSameCurrency(ngn, gbp)).toThrow(/NGN/);
    expect(() => addMoney(ngn, gbp)).toThrow();
  });

  it('adds amounts in the same currency without floating-point drift', () => {
    // 0.1 + 0.2 in major units is the classic failure; in minor units it is exact.
    expect(
      addMoney({ amountMinor: 10, currency: 'GBP' }, { amountMinor: 20, currency: 'GBP' }),
    ).toEqual({ amountMinor: 30, currency: 'GBP' });
  });

  it('multiplies only by a non-negative integer quantity', () => {
    expect(multiplyMoney({ amountMinor: 250, currency: 'GBP' }, 4)).toEqual({
      amountMinor: 1000,
      currency: 'GBP',
    });
    expect(() => multiplyMoney({ amountMinor: 250, currency: 'GBP' }, 1.5)).toThrow();
    expect(() => multiplyMoney({ amountMinor: 250, currency: 'GBP' }, -1)).toThrow();
  });
});
