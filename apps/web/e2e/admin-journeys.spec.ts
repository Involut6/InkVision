import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/**
 * Administrator journeys.
 *
 * These need an account. `ADMIN_E2E_EMAIL` and `ADMIN_E2E_PASSWORD` supply one;
 * without them the suite skips rather than failing, so a contributor who has
 * not provisioned an admin still gets a green run of everything else.
 *
 * Create one with: pnpm admin:create
 *
 * ## Why one shared browser context
 *
 * Playwright gives each test a fresh context, which would mean signing in for
 * every test. Two things make that wrong here:
 *
 *   * The sign-in endpoint allows five attempts a minute — correctly, since it
 *     is the one worth brute-forcing — and the suite would trip it.
 *   * Capturing the session cookies and replaying them in a later context is
 *     exactly the refresh-token replay the API is built to detect: it rotates
 *     the token on every page load, so a replayed cookie revokes the whole
 *     session family. The security behaviour is right; copying cookies between
 *     contexts is the mistake.
 *
 * So the suite runs serially against one context, as a real operator would.
 */
const email = process.env.ADMIN_E2E_EMAIL;
const password = process.env.ADMIN_E2E_PASSWORD;

test.describe.configure({ mode: 'serial' });

test.describe('administration', () => {
  test.skip(
    !email || !password,
    'Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD to run the admin journeys.',
  );

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    // The portal is a desktop tool; the sidebar layout differs materially on a
    // phone and is not what these journeys are about.
    test.skip(testInfo.project.name !== 'desktop', 'The admin portal is a desktop tool.');

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  /**
   * Waits for the authenticated shell.
   *
   * A URL change resolves before the guard has exchanged the refresh cookie,
   * so the sidebar does not exist yet. Waiting for the navigation landmark is
   * what makes these stable.
   */
  async function waitForAdminReady() {
    await expect(page.getByRole('navigation', { name: 'Administration' })).toBeVisible();
  }

  async function signIn() {
    await page.goto('/admin/login');
    // The form is a client component; clicking before hydration would submit
    // natively and reload the page.
    await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
    await page.getByLabel('Email address').fill(email!);
    await page.getByLabel('Password').fill(password!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/admin');
    await waitForAdminReady();
  }

  test('rejects the wrong password without revealing whether the account exists', async () => {
    await page.goto('/admin/login');
    await page.waitForFunction(() => document.documentElement.dataset.hydrated === 'true');
    await page.getByLabel('Email address').fill(email!);
    await page.getByLabel('Password').fill('definitely-the-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByRole('alert').filter({ hasText: 'Email or password is incorrect.' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('an administrator signs in and reaches the dashboard', async () => {
    await signIn();

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Enquiries in range')).toBeVisible();
    // The admin shell must not carry the public site's marketing chrome.
    await expect(page.getByRole('link', { name: 'Explore our services' })).toHaveCount(0);
  });

  test('every CMS screen is reachable', async () => {
    for (const [path, heading] of [
      ['/admin/enquiries', 'Enquiries'],
      ['/admin/insights', 'Insights'],
      ['/admin/work', 'Selected work'],
      ['/admin/services', 'Services'],
      ['/admin/resources', 'Resources'],
      ['/admin/newsletter', 'Newsletter'],
      ['/admin/team', 'Team'],
      ['/admin/settings', 'Site settings'],
    ] as const) {
      await page.goto(path);
      await waitForAdminReady();
      await expect(page.getByRole('heading', { name: heading, level: 2 })).toBeVisible();
    }
  });

  test('an administrator reviews an enquiry and changes its status', async () => {
    await page.goto('/admin/enquiries');
    await waitForAdminReady();

    const firstRow = page.locator('table tbody tr').first();
    test.skip((await firstRow.count()) === 0, 'No enquiries to review in this environment.');

    await firstRow.getByRole('link').first().click();
    await expect(page.getByText('The enquiry')).toBeVisible();

    const statusButton = page.locator('fieldset button').first();
    const target = (await statusButton.textContent())?.trim() ?? '';
    await statusButton.click();

    // The change is recorded in the visible history, not just in the badge.
    await expect(page.getByRole('list').filter({ hasText: target }).first()).toBeVisible();
  });

  test('an administrator adds an internal note', async () => {
    await page.goto('/admin/enquiries');
    await waitForAdminReady();

    const firstRow = page.locator('table tbody tr').first();
    test.skip((await firstRow.count()) === 0, 'No enquiries in this environment.');

    await firstRow.getByRole('link').first().click();
    await expect(page.getByText('Internal notes')).toBeVisible();

    const note = `End-to-end note ${Date.now()}`;
    await page.getByPlaceholder('Add a note for the team…').fill(note);
    await page.getByRole('button', { name: 'Add note' }).click();

    await expect(page.getByText(note)).toBeVisible();
  });

  test('an editor creates an article, which stays off the public site as a draft', async () => {
    await page.goto('/admin/insights');
    await waitForAdminReady();

    const title = `End-to-end draft ${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await page.getByRole('button', { name: 'New article' }).click();
    // `exact` matters: "Title" would also match "SEO title".
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page
      .getByLabel('Summary', { exact: true })
      .fill('A draft created by the end-to-end suite to prove drafts stay private.');
    await page
      .getByLabel('Body', { exact: true })
      .fill('<p>Draft body for the end-to-end test.</p>');
    await page.getByRole('button', { name: 'Create draft' }).click();

    // The table and the narrow-screen card list both carry the title, so scope
    // the assertion to the table.
    await expect(page.getByRole('table').getByText(title)).toBeVisible();

    // The crucial assertion: the draft is not on the public site.
    const publicResponse = await page.request.get(`/insights/${slug}`);
    expect(publicResponse.status()).toBe(404);
  });

  test('signing out ends the session', async () => {
    await page.goto('/admin');
    await waitForAdminReady();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/admin/login');

    // Going back must not restore access.
    await page.goto('/admin/enquiries');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
