import sanitizeHtml from 'sanitize-html';

/**
 * Server-side HTML sanitisation for all editor-supplied rich text.
 *
 * This runs on write, so the database only ever holds safe markup and the
 * website can render it without a second sanitising pass in the browser. The
 * allowlist is intentionally narrow: editorial prose, not arbitrary markup.
 */
const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'blockquote',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'a',
  'figure',
  'figcaption',
  'img',
  'hr',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'caption',
  'small',
  'sup',
  'sub',
] as const;

const SANITISE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    '*': ['id'],
  },
  // No `javascript:` / `data:` URLs, and no protocol-relative trickery.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // Any outbound link opened in a new tab must not leak window.opener.
    a: (tagName, attribs) => {
      const next: Record<string, string> = { ...attribs };
      if (next.target === '_blank') {
        next.rel = 'noopener noreferrer';
      }
      return { tagName, attribs: next };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: attribs.loading ?? 'lazy' },
    }),
  },
};

export function sanitiseRichText(html: string): string {
  return sanitizeHtml(html, SANITISE_OPTIONS).trim();
}

/** Strips every tag, collapsing whitespace. Used for excerpts and search. */
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface PreparedRichText {
  html: string;
  text: string;
}

/** Sanitises once and derives the plain-text rendition from the safe HTML. */
export function prepareRichText(html: string): PreparedRichText {
  const safeHtml = sanitiseRichText(html);
  return { html: safeHtml, text: htmlToPlainText(safeHtml) };
}

/**
 * Reading time at 225 words per minute — a common editorial average — with a
 * floor of one minute so a short note never reads "0 min".
 */
export function estimateReadingTimeMinutes(plainText: string): number {
  const words = plainText.split(/\s+/).filter((word) => word.length > 0).length;
  return Math.max(1, Math.round(words / 225));
}

/** First `maxLength` characters of plain text, cut on a word boundary. */
export function excerpt(plainText: string, maxLength = 180): string {
  if (plainText.length <= maxLength) return plainText;
  const cut = plainText.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
