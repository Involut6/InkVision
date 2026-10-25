-- The site settings table is a singleton. A check constraint makes that a
-- database guarantee rather than a convention the application has to remember,
-- so a second settings row cannot be created by any code path.
ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_single_row" CHECK ("id" = 1);

-- Case-insensitive uniqueness for addresses. PostgreSQL's unique index is
-- case-sensitive, so without this `Person@example.com` and `person@example.com`
-- could both be stored. The application lowercases on write; these indexes make
-- it impossible to bypass.
CREATE UNIQUE INDEX "admin_users_email_lower_key" ON "admin_users" (lower("email"));
CREATE UNIQUE INDEX "newsletter_subscribers_email_lower_key" ON "newsletter_subscribers" (lower("email"));

-- Trigram-free partial index supporting the public insights listing, which
-- always filters on published state and orders by publication date.
CREATE INDEX "articles_published_feed_idx"
  ON "articles" ("publishedAt" DESC)
  WHERE "status" IN ('PUBLISHED', 'SCHEDULED');
