import { expect, test, type Page } from '@playwright/test';

/** The contact page also carries the footer newsletter form; scope to this one. */
function enquiryForm(page: Page) {
  return page.locator('form').filter({ hasText: 'What are you working towards?' });
}

/**
 * Waits until React has hydrated.
 *
 * Playwright can click a server-rendered button before its handler is
 * attached, which submits the form natively and reloads the page — producing a
 * failure that looks like broken validation but is a race.
 */
async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true', null, {
    timeout: 15_000,
  });
}

/**
 * The visitor journeys the business depends on.
 *
 * Each corresponds to a line in the brief's "essential end-to-end journeys",
 * and each asserts what a visitor would actually notice rather than an
 * implementation detail.
 */

test.describe('browsing and enquiring', () => {
  test('a visitor browses services and opens a service detail page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Make your expertise visible.' })).toBeVisible();

    await page.getByRole('link', { name: 'Explore our services' }).click();
    await expect(page).toHaveURL(/\/services$/);

    const firstService = page.getByRole('article').first();
    await expect(firstService).toBeVisible();
    await firstService.getByRole('link').first().click();

    await expect(page).toHaveURL(/\/services\/[a-z-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/what this addresses/i)).toBeVisible();
  });

  test('a visitor submits an enquiry and sees a clear confirmation', async ({ page }) => {
    await page.goto('/contact');

    const form = enquiryForm(page);
    await waitForHydration(page);

    // A unique message keeps each run clear of the ten-minute dedupe window.
    const unique = `Playwright run ${Date.now()}: we would like to discuss executive positioning work.`;

    await form.getByLabel('Full name').fill('Playwright Visitor');
    await form.getByLabel('Work email').fill(`playwright+${Date.now()}@example.com`);
    await form.getByLabel('Service of interest').selectOption('EXECUTIVE_VISIBILITY');
    await form.getByLabel('Desired timeline').selectOption('ONE_TO_THREE_MONTHS');
    await form.getByLabel('What are you working towards?').fill(unique);
    await form.getByRole('checkbox').check();

    await form.getByRole('button', { name: 'Send enquiry' }).click();

    const confirmation = page.getByRole('status').filter({ hasText: 'Thank you' });
    await expect(confirmation).toContainText('Thank you for reaching out to InkVision Creatives');
    await expect(confirmation).toContainText(/ENQ-[A-Z2-9]{6}/);
  });

  test('the enquiry form refuses an incomplete submission and says why', async ({ page }) => {
    await page.goto('/contact');
    await waitForHydration(page);

    const form = enquiryForm(page);
    await form.getByRole('button', { name: 'Send enquiry' }).click();

    await expect(form.getByText('Please enter your full name.')).toBeVisible();
    await expect(form.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
    // Still on the page: nothing was submitted.
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('a visitor subscribes to the newsletter', async ({ page }) => {
    await page.goto('/insights');
    await waitForHydration(page);

    const form = page.locator('form').filter({ hasText: 'Email address' }).last();
    await form.getByLabel('Email address').fill(`reader+${Date.now()}@example.com`);
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText('You are on the list. Thank you.')).toBeVisible();
  });
});

test.describe('content visibility', () => {
  test('the work page shows a considered empty state rather than invented projects', async ({
    page,
  }) => {
    await page.goto('/work');

    await expect(page.getByRole('heading', { name: /work, clearly labelled/i })).toBeVisible();
    // The label key is explained up front, whether or not any work is published.
    await expect(page.getByText(/illustrative sample/i).first()).toBeVisible();
  });

  test('an unavailable product cannot be purchased', async ({ page }) => {
    await page.goto('/resources');

    await expect(page.getByText(/purchasing is not open yet/i)).toBeVisible();

    const card = page.getByRole('article').first();
    await card.getByRole('link').first().click();

    await expect(page).toHaveURL(/\/resources\/[a-z-]+$/);
    // No purchase control at all — not a disabled one.
    await expect(page.getByRole('button', { name: /continue to payment/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /tell us you are interested/i })).toBeVisible();
  });

  test('legal pages carry a visible awaiting-review notice', async ({ page }) => {
    await page.goto('/privacy');
    // The phrase appears in the banner and again in the body copy; the banner
    // is the one a visitor cannot miss.
    await expect(page.getByText(/template awaiting review/i).first()).toBeVisible();
    await expect(page.getByText(/does not constitute legal advice/i).first()).toBeVisible();
  });

  test('the admin area is not reachable without signing in', async ({ page }) => {
    await page.goto('/admin/enquiries');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { name: /inkvision administration/i })).toBeVisible();
  });
});

test.describe('accessibility fundamentals', () => {
  test('every page offers a skip link as the first focusable element', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toHaveText('Skip to main content');
    await expect(focused).toHaveAttribute('href', '#main-content');
  });

  test('each page has exactly one level-one heading', async ({ page }) => {
    for (const path of ['/', '/services', '/approach', '/insights', '/about', '/contact', '/faq']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
  });

  test('no page scrolls horizontally', async ({ page }) => {
    for (const path of ['/', '/services', '/work', '/insights', '/resources', '/contact']) {
      await page.goto(path);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflows, `${path} scrolls horizontally`).toBe(false);
    }
  });

  test('admin routes are marked noindex', async ({ page }) => {
    const response = await page.goto('/admin/login');
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
  });
});
