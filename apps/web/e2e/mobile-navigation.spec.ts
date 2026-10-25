import { expect, test } from '@playwright/test';

/**
 * The mobile navigation.
 *
 * Runs on both projects; on desktop the panel is not used, so the suite skips
 * itself there rather than asserting against a layout it does not apply to.
 */
test.describe('mobile navigation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Panel navigation only exists below lg.');
    await page.goto('/');
  });

  test('opens, navigates and closes', async ({ page }) => {
    await page.getByRole('button', { name: 'Open the main menu' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Our Approach' })).toBeVisible();

    await dialog.getByRole('link', { name: 'Our Approach' }).click();

    await expect(page).toHaveURL(/\/approach$/);
    // The panel must close on navigation rather than covering the new page.
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('closes on Escape and returns focus to the trigger', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Open the main menu' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('keeps the enquiry call to action reachable', async ({ page }) => {
    await page.getByRole('button', { name: 'Open the main menu' }).click();
    const dialog = page.getByRole('dialog');

    await expect(dialog.getByRole('link', { name: 'Discuss your goals' })).toBeVisible();
  });
});
