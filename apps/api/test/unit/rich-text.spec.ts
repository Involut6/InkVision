import { describe, expect, it } from 'vitest';

import {
  estimateReadingTimeMinutes,
  excerpt,
  htmlToPlainText,
  prepareRichText,
  sanitiseRichText,
} from '../../src/common/utils/rich-text.js';

/**
 * Sanitisation is the single control standing between an editor's input and
 * the browsers of everyone who reads the site, so it gets the most direct
 * tests in the suite.
 */
describe('sanitiseRichText', () => {
  it('keeps editorial markup intact', () => {
    const html =
      '<p>A <strong>clear</strong> point of <em>view</em>.</p><h2>Why</h2><ul><li>One</li></ul>';
    expect(sanitiseRichText(html)).toBe(html);
  });

  it('strips script tags and their contents', () => {
    const result = sanitiseRichText('<p>Safe</p><script>alert("xss")</script>');
    expect(result).toBe('<p>Safe</p>');
    expect(result).not.toContain('alert');
  });

  it('strips inline event handlers', () => {
    const result = sanitiseRichText('<p onclick="steal()">Text</p>');
    expect(result).toBe('<p>Text</p>');
    expect(result).not.toContain('onclick');
  });

  it('removes javascript: URLs from links', () => {
    const result = sanitiseRichText('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('removes data: URLs, which can carry an HTML payload', () => {
    const result = sanitiseRichText(
      '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Click</a>',
    );
    expect(result).not.toContain('data:text/html');
  });

  it('permits http, https, mailto and tel links', () => {
    for (const href of [
      'https://example.com',
      'http://example.com',
      'mailto:a@b.com',
      'tel:+123',
    ]) {
      expect(sanitiseRichText(`<a href="${href}">Link</a>`)).toContain(href);
    }
  });

  it('adds rel="noopener noreferrer" to links opening in a new tab', () => {
    const result = sanitiseRichText('<a href="https://example.com" target="_blank">Link</a>');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('discards iframes, objects and embeds entirely', () => {
    const result = sanitiseRichText(
      '<p>Keep</p><iframe src="https://evil.test"></iframe><object data="x"></object><embed src="y">',
    );
    expect(result).toBe('<p>Keep</p>');
  });

  it('strips style attributes, which can be used to overlay the page', () => {
    const result = sanitiseRichText('<p style="position:fixed;inset:0">Text</p>');
    expect(result).toBe('<p>Text</p>');
  });

  it('adds lazy loading to images that do not specify it', () => {
    expect(sanitiseRichText('<img src="https://example.com/a.png" alt="A">')).toContain(
      'loading="lazy"',
    );
  });

  it('survives malformed markup without throwing', () => {
    expect(() => sanitiseRichText('<p><strong>unclosed')).not.toThrow();
  });
});

describe('htmlToPlainText', () => {
  it('removes all markup and collapses whitespace', () => {
    expect(htmlToPlainText('<p>One</p>\n\n<p>  Two  </p>')).toBe('One Two');
  });

  it('decodes the common HTML entities', () => {
    expect(htmlToPlainText('<p>Fish &amp; chips &quot;quoted&quot;</p>')).toBe(
      'Fish & chips "quoted"',
    );
  });
});

describe('prepareRichText', () => {
  it('derives plain text from the sanitised HTML, not the raw input', () => {
    const result = prepareRichText('<p>Visible</p><script>hidden()</script>');
    expect(result.html).toBe('<p>Visible</p>');
    // The critical assertion: script contents must not survive into the text
    // rendition, which feeds excerpts and search.
    expect(result.text).toBe('Visible');
  });
});

describe('estimateReadingTimeMinutes', () => {
  it('never reports less than a minute', () => {
    expect(estimateReadingTimeMinutes('Three words here')).toBe(1);
    expect(estimateReadingTimeMinutes('')).toBe(1);
  });

  it('scales at roughly 225 words per minute', () => {
    expect(estimateReadingTimeMinutes('word '.repeat(450).trim())).toBe(2);
    expect(estimateReadingTimeMinutes('word '.repeat(1125).trim())).toBe(5);
  });
});

describe('excerpt', () => {
  it('returns short text unchanged', () => {
    expect(excerpt('Short enough.', 100)).toBe('Short enough.');
  });

  it('cuts on a word boundary and appends an ellipsis', () => {
    const result = excerpt('The quick brown fox jumps over the lazy dog', 20);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result).not.toContain('  ');
  });
});
