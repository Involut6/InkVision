import type { Money } from '@inkvision/shared-types';

/**
 * Money helpers. Amounts are always integer minor units (kobo, cents) paired
 * with an ISO-4217 code — never a float, and never a bare number.
 */

/** Currencies whose minor unit is not 1/100. Extend as markets are added. */
const MINOR_UNIT_EXPONENTS: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  BHD: 3,
  KWD: 3,
  TND: 3,
};

export function minorUnitExponent(currency: string): number {
  return MINOR_UNIT_EXPONENTS[currency.toUpperCase()] ?? 2;
}

export function toMoney(amountMinor: number | null, currency: string | null): Money | null {
  if (amountMinor === null || currency === null) return null;
  return { amountMinor, currency: currency.toUpperCase() };
}

/**
 * Formats for display. Falls back to `CODE 1,234.56` when the runtime has no
 * data for the currency, which is preferable to throwing in a view.
 */
export function formatMoney(money: Money, locale = 'en-GB'): string {
  const exponent = minorUnitExponent(money.currency);
  const major = money.amountMinor / 10 ** exponent;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${money.currency} ${major.toFixed(exponent)}`;
  }
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function multiplyMoney(money: Money, quantity: number): Money {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Quantity must be a non-negative integer');
  }
  return { amountMinor: money.amountMinor * quantity, currency: money.currency };
}
