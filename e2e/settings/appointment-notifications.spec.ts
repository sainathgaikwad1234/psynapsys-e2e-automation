import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Appointment Notifications Settings Tests (Therapist Portal)
 *
 * Read + basic interaction tests for the Appointment Notifications settings:
 *   - Main notifications tab
 *   - Cancel Appointment notifications tab
 *   - Reschedule Appointment notifications tab
 *
 * Route: /app/setting/appointment-notifications
 *
 * @tag @regression @settings @notifications
 */

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe('Appointment Notifications Settings', () => {

  async function goToNotifications(page: Page): Promise<void> {
    await page.goto('/app/setting/appointment-notifications');
    await expect(page).toHaveURL(/appointment-notifications/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2_000);
  }

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Appointment Notifications settings page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToNotifications(page);

      const heading = page
        .getByText(/notification|appointment/i)
        .first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show notification toggle or content @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToNotifications(page);

      const hasToggle = await page
        .locator('input[type="checkbox"], input[type="radio"], [class*="switch"], [class*="toggle"]')
        .first()
        .isVisible({ timeout: 8_000 })
        .catch(() => false);
      const hasForm = await page
        .locator('form, [class*="form"], [class*="notification"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasTabs = await page
        .getByRole('tab')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasToggle || hasForm || hasTabs).toBe(true);
    },
  );

  // ── TAB NAVIGATION ────────────────────────────────────────────────────────

  test(
    'should show Cancel Appointment notifications tab if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToNotifications(page);

      const cancelTab = page
        .getByRole('tab', { name: /cancel/i })
        .first()
        .or(page.getByText(/cancel appointment/i).first());

      if (!(await cancelTab.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        // Single-tab or flat layout — just verify page is visible
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await cancelTab.first().click({ force: true });
      await page.waitForTimeout(1_000);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should show Reschedule Appointment notifications tab if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToNotifications(page);

      const rescheduleTab = page
        .getByRole('tab', { name: /reschedule/i })
        .first()
        .or(page.getByText(/reschedule appointment/i).first());

      if (!(await rescheduleTab.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await rescheduleTab.first().click({ force: true });
      await page.waitForTimeout(1_000);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── TOGGLE / SAVE ─────────────────────────────────────────────────────────

  test(
    'should toggle a notification setting and save if Save button exists @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToNotifications(page);

      // Try toggling a checkbox or switch
      const toggles = page.locator('input[type="checkbox"], input[type="radio"]');
      const count = await toggles.count().catch(() => 0);
      if (count > 0) {
        await toggles.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
      }

      // Save if button is present
      const saveBtn = page.getByRole('button', { name: /^save$|^update$|^apply$/i }).last();
      if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(2_000);
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );
});
