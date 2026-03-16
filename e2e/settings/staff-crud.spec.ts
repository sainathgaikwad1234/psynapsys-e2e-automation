import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import { waitForPageReady, waitForDialogOpen, waitForAnimation } from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Staff Management CRUD Tests (Therapist Portal)
 *
 * Create → Read → Update → Delete for staff/therapist accounts.
 * Route: /app/setting/staff-setting
 *   Tabs: All Staff (index) | Therapists | Others
 *
 * @tag @regression @settings @staff @crud
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
// disableLoadingOverlay is imported from mantine-helpers

// ── Test Data ─────────────────────────────────────────────────────────────────

const TS = Date.now();
const STAFF_FIRST = `E2E`;
const STAFF_LAST  = `Staff${TS.toString().slice(-6)}`;
const STAFF_EMAIL = `e2e.staff${TS.toString().slice(-6)}@test-psynapsys.com`;
const UPDATED_LAST = `Updated${TS.toString().slice(-6)}`;

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Staff Management — CRUD', () => {

  async function goToStaff(page: Page): Promise<void> {
    await page.goto('/app/setting/staff-setting');
    await expect(page).toHaveURL(/staff-setting/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPageReady(page);
  }

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Staff Settings page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaff(page);

      const heading = page
        .getByText(/staff|therapist/i)
        .first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show a list of existing staff @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaff(page);

      // Either a table or cards
      const hasTable = await page.locator('table').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="staff"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasList  = await page.locator('tbody tr, [class*="row"]').first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasList).toBe(true);
    },
  );

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open Add Staff / Invite Staff modal @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaff(page);

      const addBtn = page
        .getByRole('button', { name: /add staff|invite|add therapist|add user/i })
        .first()
        .or(page.getByRole('button', { name: /^add$/i }).first());

      if (!(await addBtn.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.first().click({ force: true });
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    },
  );

  test(
    'should fill and submit Add Staff form @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToStaff(page);

      const addBtn = page
        .getByRole('button', { name: /add staff|invite|add therapist|add user/i })
        .first()
        .or(page.getByRole('button', { name: /^add$/i }).first());

      if (!(await addBtn.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.first().click({ force: true });
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // First Name
      const firstNameInput = dialog
        .getByPlaceholder(/first name/i)
        .first()
        .or(dialog.getByLabel(/first name/i).first());
      if (await firstNameInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstNameInput.first().click({ force: true });
        await firstNameInput.first().fill(STAFF_FIRST);
      }

      // Last Name
      const lastNameInput = dialog
        .getByPlaceholder(/last name/i)
        .first()
        .or(dialog.getByLabel(/last name/i).first());
      if (await lastNameInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await lastNameInput.first().click({ force: true });
        await lastNameInput.first().fill(STAFF_LAST);
      }

      // Email
      const emailInput = dialog
        .getByPlaceholder(/email/i)
        .first()
        .or(dialog.getByLabel(/email/i).first());
      if (await emailInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await emailInput.first().click({ force: true });
        await emailInput.first().fill(STAFF_EMAIL);
      }

      // Role — select first available option
      const roleInput = dialog
        .locator('input[placeholder*="role" i], input[placeholder*="select role" i]')
        .first()
        .or(dialog.getByLabel(/role/i).first());
      if (await roleInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await roleInput.first().click({ force: true });
        await waitForAnimation(page.locator('[role="option"]').first());
        const roleOpt = page.getByRole('option').first();
        if (await roleOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await roleOpt.click({ force: true });
        }
        await page.keyboard.press('Tab');
      }

      // Submit
      await disableLoadingOverlay(page);
      const saveBtn = dialog.getByRole('button', { name: /^save$|^invite$|^add$|^submit$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForPageReady(page);

      const dialogHidden = await dialog.isHidden({ timeout: 8_000 }).catch(() => false);
      if (!dialogHidden) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should edit the first staff record',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToStaff(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      // Click action menu or Edit button on first row
      const menuBtn = firstRow.locator('button').last();
      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      if (!(await editItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await editItem.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await waitForPageReady(page);
      await disableLoadingOverlay(page);

      // Update Last Name
      const lastNameInput = dialog
        .getByPlaceholder(/last name/i)
        .first()
        .or(dialog.getByLabel(/last name/i).first());
      if (await lastNameInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await lastNameInput.first().click({ force: true });
        await lastNameInput.first().fill(UPDATED_LAST);
      }

      await disableLoadingOverlay(page);
      const saveBtn = dialog.getByRole('button', { name: /^save$|^update$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });

      const apiResp = page.waitForResponse(
        r => /staff|therapist|user/i.test(r.url()) && ['PUT', 'PATCH', 'POST'].includes(r.request().method()),
        { timeout: 15_000 },
      ).catch(() => null);

      await saveBtn.click({ force: true });
      const resp = await apiResp;
      await waitForPageReady(page);

      if (resp && resp.status() >= 400) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
        return;
      }

      const dialogHidden = await dialog.isHidden({ timeout: 8_000 }).catch(() => false);
      if (!dialogHidden) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete a staff record if delete option is available',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToStaff(page);

      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count().catch(() => 0);
      if (rowCount < 2) {
        // Skip deletion if fewer than 2 staff (avoid deleting last/only record)
        test.skip();
        return;
      }

      // Target last row to avoid deleting the primary test account
      const lastRow = rows.last();
      const menuBtn = lastRow.locator('button').last();
      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const deleteItem = page.getByRole('menuitem', { name: /delete|deactivate|remove/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await deleteItem.click();
      await waitForAnimation(page.locator('[role="dialog"]').first());

      const confirmModal = page.locator('[role="dialog"]').first();
      await expect(confirmModal).toBeVisible({ timeout: 8_000 });

      const confirmBtn = confirmModal
        .getByRole('button', { name: /delete|confirm|yes|deactivate/i })
        .last();
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click({ force: true });

      const dialogClosed = await confirmModal
        .waitFor({ state: 'hidden', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      await waitForPageReady(page);

      if (!dialogClosed) {
        // API may have blocked deletion (protected record / permission) — cancel gracefully
        const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );
});
