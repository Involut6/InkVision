/**
 * Produces a URL-safe slug. Deliberately conservative: lowercase ASCII,
 * hyphen-separated, no leading/trailing or repeated hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/**
 * Appends `-2`, `-3`, … until the slug is not in `taken`. Used when an editor
 * retitles content into a collision.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const slug = slugify(base) || 'untitled';
  if (!taken.has(slug)) return slug;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${slug}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${slug}-${Date.now()}`;
}
