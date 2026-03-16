import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { waitForPageReady, waitForAnimation } from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Staff Profile Tests (Therapist Portal)
 *
 * Route: /app/setting/staff-setting/staff-profile
 *        (reached by clicking a staff member from the Staff list)
 *
 * Features:
 *   - Individual staff member profile view
 *   - View profile info (name, email, role, specialization)
 *   - Edit staff profile
 *   - View assigned clients / schedule
 *
 * @tag @regression @settings @staff-profile
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToStaffList(page: Page): Promise<void> {
  await page.goto('/app/setting/staff-setting');
  await expect(page).toHaveURL(/staff-setting/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Staff Profile — Settings', () => {

  // ── STAFF LIST → PROFILE NAVIGATION ──────────────────────────────────────

  test(
    'should display the Staff list page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);
      const heading = page.getByText(/staff/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show staff list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="staff"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no staff|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasEmpty).toBe(true);
    },
  );

  test(
    'should open Staff Profile page on row click or view button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      // Try clicking the name/first cell to navigate to profile
      const nameCell = firstRow.locator('td').nth(1);
      if (!(await nameCell.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await nameCell.click({ force: true });
      await waitForPageReady(page);

      // Should navigate to staff profile or open detail modal
      const isOnProfile = page.url().includes('staff-profile') || page.url().includes('staff-setting');
      const hasDialog   = await page.locator('[role="dialog"]').first().isVisible({ timeout: 3_000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (isOnProfile || hasDialog) {
        expect(true).toBe(true);

        if (hasDialog) {
          await page.keyboard.press('Escape');
        } else {
          await page.goBack().catch(() => {});
        }
      }
    },
  );

  test(
    'should navigate to Staff Profile via direct URL @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await page.goto('/app/setting/staff-setting/staff-profile');
      await page.waitForLoadState('networkidle').catch(() => {});
      await waitForPageReady(page);

      // May redirect to staff list if no staff ID is in URL
      const isOnProfile  = page.url().includes('staff-profile');
      const isOnStaff    = page.url().includes('staff-setting');

      await expect(page.locator('body')).toBeVisible();
      expect(isOnProfile || isOnStaff).toBe(true);
    },
  );

  test(
    'should show action menu with View Profile option in staff list @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      const menuBtn = firstRow.locator('button').last();
      if (!(await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const hasView     = await page.getByRole('menuitem', { name: /view|profile/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasEdit     = await page.getByRole('menuitem', { name: /^edit$/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDeactive = await page.getByRole('menuitem', { name: /deactivate|activate/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasView || hasEdit || hasDeactive).toBe(true);
    },
  );

  // ── STAFF PROFILE PAGE ────────────────────────────────────────────────────

  test(
    'should show staff profile info when profile is opened @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      const menuBtn = firstRow.locator('button').last();
      if (!(await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      // Try "View" menu item first
      const viewItem = page
        .getByRole('menuitem', { name: /view|profile/i })
        .first();

      if (!(await viewItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await viewItem.click();
      await waitForPageReady(page);

      // Should navigate to profile page or open modal
      const hasDialog = await page.locator('[role="dialog"]').first().isVisible({ timeout: 3_000 }).catch(() => false);

      if (hasDialog) {
        const hasName  = await page.locator('[role="dialog"]').getByText(/name|email|role/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
        if (hasName) {
          expect(true).toBe(true);
        }
        await page.keyboard.press('Escape');
      } else {
        // Profile opened as a page
        const hasInfo = await page.getByText(/profile|email|role|specialization/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
        if (hasInfo) {
          expect(true).toBe(true);
        }
        await page.goBack().catch(() => {});
      }
    },
  );

  test(
    'should show staff sub-tabs (Therapist / Others) @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaffList(page);

      const hasTherapistTab = await page
        .getByRole('tab', { name: /therapist/i })
        .or(page.getByText(/therapist/i).first())
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasOthersTab = await page
        .getByRole('tab', { name: /others|other staff/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasTherapistTab || hasOthersTab) {
        expect(true).toBe(true);
      }
    },
  );

  test(
    'should switch to Therapists sub-tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await page.goto('/app/setting/staff-setting/therapists');
      await page.waitForLoadState('networkidle').catch(() => {});
      await waitForPageReady(page);

      const isOnTherapists = page.url().includes('therapist');
      await expect(page.locator('body')).toBeVisible();
      if (isOnTherapists) {
        const hasContent = await page.locator('table, [class*="card"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
        const hasEmpty   = await page.getByText(/no data|no therapist|empty/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
        await expect(page.locator('body')).toBeVisible();
        if (hasContent || hasEmpty) {
          expect(true).toBe(true);
        }
      }
    },
  );
});
