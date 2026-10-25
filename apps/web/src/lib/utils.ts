import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Our type scale uses names rather than t-shirt sizes (`text-display`,
 * `text-lead`, …). tailwind-merge cannot tell those from a colour — every
 * unrecognised `text-*` falls into its colour group — so it treated
 * `text-display` and `text-content-primary` as conflicting and silently
 * dropped the first. Declaring the scale here is what keeps `cn()` honest.
 *
 * These names must stay in step with the `--text-*` tokens in `globals.css`.
 */
const FONT_SIZE_SCALE = ['eyebrow', 'display', 'h1', 'h2', 'h3', 'lead', 'meta'] as const;

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZE_SCALE] }],
    },
  },
});

/** Merges class names, with later Tailwind utilities winning over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date for display.
 *
 * Timestamps are stored in UTC. A fixed `Europe/London` display timezone is
 * used so server and client renders agree — a locale-dependent render would
 * produce a hydration mismatch. See README → "Outstanding business decisions"
 * for changing this to the studio's own timezone.
 */
const DISPLAY_TIMEZONE = 'Europe/London';
const DISPLAY_LOCALE = 'en-GB';

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIMEZONE,
  }).format(date);
}

/** Machine-readable date for a `<time datetime>` attribute. */
export function isoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Relative phrasing for recent activity, falling back to an absolute date. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)} d ago`;
  return formatDate(date);
}

/** Money for display. Minor units in, formatted string out. */
const MINOR_UNIT_EXPONENTS: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
  BHD: 3,
  KWD: 3,
  TND: 3,
};

export function formatMoney(money: { amountMinor: number; currency: string } | null): string {
  if (!money) return '';
  const exponent = MINOR_UNIT_EXPONENTS[money.currency] ?? 2;
  const major = money.amountMinor / 10 ** exponent;

  try {
    return new Intl.NumberFormat(DISPLAY_LOCALE, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${money.currency} ${major.toFixed(exponent)}`;
  }
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readingTime(minutes: number): string {
  return `${minutes} min read`;
}

/** Pluralises a count with its noun. */
export function pluralise(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
