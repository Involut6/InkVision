import { describe, expect, it } from 'vitest';

import { slugify, uniqueSlug } from '../../src/common/utils/slug.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('What Do You Want To Be Known For?')).toBe('what-do-you-want-to-be-known-for');
  });

  it('strips accents rather than dropping the letters', () => {
    expect(slugify('Café résumé')).toBe('cafe-resume');
  });

  it('removes apostrophes without leaving a hyphen', () => {
    expect(slugify("Someone's voice")).toBe('someones-voice');
  });

  it('collapses runs of separators and trims the ends', () => {
    expect(slugify('  --- Hello   ---  World --- ')).toBe('hello-world');
  });

  it('returns an empty string for input with no usable characters', () => {
    expect(slugify('!!! ???')).toBe('');
  });

  it('caps length without leaving a trailing hyphen', () => {
    const result = slugify('word '.repeat(40));
    expect(result.length).toBeLessThanOrEqual(80);
    expect(result.endsWith('-')).toBe(false);
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', () => {
    expect(uniqueSlug('A Title', new Set())).toBe('a-title');
  });

  it('appends an incrementing suffix past a collision', () => {
    expect(uniqueSlug('A Title', new Set(['a-title']))).toBe('a-title-2');
    expect(uniqueSlug('A Title', new Set(['a-title', 'a-title-2']))).toBe('a-title-3');
  });

  it('falls back to "untitled" when nothing can be derived', () => {
    expect(uniqueSlug('???', new Set())).toBe('untitled');
  });
});
