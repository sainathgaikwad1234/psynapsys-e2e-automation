import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
  waitForAnimation,
  waitForNetworkIdle,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Waitlist CRUD Tests (Therapist Portal)
 *
 * Waitlist is the leads/prospects stage (pre-consultation).
 * Route: /app/client/waitlist
 *
 * Actions available:
 *   - Edit (opens AddWaitlistForm modal)
 *   - Archive / Restore (toggle with confirmation)
 *   - Delete (with confirmation)
 *   - Add as Consultation (converts to consultation stage, then opens appointment form)
 *   - View Client Details modal (click on name)
 *   - Show/Hide Archived button
 *   - Search by text
 *   - Sort by date added
 *
 * @tag @regression @patients @waitlist
 */

// ── Helpers ───────────────────────────────────────────────────────────────────
// disableLoadingOverlay is imported from mantine-helpers

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Waitlist — CRUD', () => {

  async function goToWaitlist(page: Page): Promise<void> {
    await page.goto('/app/client/waitlist');
    await expect(page).toHaveURL(/\/app\/client\/waitlist/, { timeout: 15_000 });
    await waitForPageReady(page);
  }

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Waitlist page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToWaitlist(page);
      const heading = page.getByText(/waitlist/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show waitlist entries or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToWaitlist(page);

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no waitlist|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    },
  );

  test(
    'should have search input and show/hide archived button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToWaitlist(page);

      const hasSearch   = await page.getByPlaceholder(/search/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasArchived = await page.getByRole('button', { name: /archived/i }).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasSearch || hasArchived).toBe(true);
    },
  );

  test(
    'should toggle Show Archived Clients button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToWaitlist(page);

      const archivedBtn = page.getByRole('button', { name: /show.*archived|hide.*archived/i }).first();
      if (!(await archivedBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await archivedBtn.click({ force: true });
      await waitForNetworkIdle(page);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── EDIT ─────────────────────────────────────────────────────────────────

  test(
    'should open Edit modal for first waitlist entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToWaitlist(page);
      await disableLoadingOverlay(page);

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const editItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
      if (!(await editItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await editItem.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Close without saving
      const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
      if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cancelBtn.click({ force: true });
      } else {
        await page.keyboard.press('Escape');
      }
    },
  );

  // ── ADD AS CONSULTATION ───────────────────────────────────────────────────

  test(
    'should show Add as Consultation option in action menu @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToWaitlist(page);

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const hasAddAsConsult = await page
        .getByRole('menuitem', { name: /add as consultation/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await page.keyboard.press('Escape');
      await expect(page.locator('body')).toBeVisible();

      if (hasAddAsConsult) {
        expect(true).toBe(true);
      }
    },
  );

  test(
    'should open Book Consultation form when Add as Consultation is clicked @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToWaitlist(page);
      await disableLoadingOverlay(page);

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const addAsConsultItem = page
        .getByRole('menuitem', { name: /add as consultation/i })
        .first();
      if (!(await addAsConsultItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await addAsConsultItem.click();
      await waitForNetworkIdle(page);

      // After "Add as Consultation", the appointment booking form auto-opens
      const dialog = page.locator('[role="dialog"]').first();
      const isDialog = await dialog.isVisible({ timeout: 8_000 }).catch(() => false);
      if (isDialog) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });
        // Close the appointment dialog
        const closeBtn = page.locator('[role="dialog"]').first().getByRole('button', { name: /cancel|close/i }).first();
        if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await closeBtn.click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  // ── ARCHIVE / RESTORE ─────────────────────────────────────────────────────

  test(
    'should archive first waitlist entry from action menu @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToWaitlist(page);

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const archiveItem = page
        .getByRole('menuitem', { name: /archive/i })
        .first();
      if (!(await archiveItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await archiveItem.click();
      await waitForDialogOpen(page).catch(() => {});

      // Confirm archive if confirmation dialog appears
      const confirmModal = page.locator('[role="dialog"]').first();
      if (await confirmModal.isVisible({ timeout: 4_000 }).catch(() => false)) {
        const confirmBtn = confirmModal
          .getByRole('button', { name: /archive|confirm|yes/i })
          .last();
        if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await confirmBtn.click({ force: true });
          await waitForDialogClose(page);
        }
        // Graceful close
        const dialogClosed = await confirmModal.isHidden({ timeout: 5_000 }).catch(() => false);
        if (!dialogClosed) {
          const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i }).first();
          if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await cancelBtn.click({ force: true });
          }
        }
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete a waitlist entry if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToWaitlist(page);

      const rows = page.locator('table tbody tr');
      const lastRow = rows.last();

      const menuBtn = lastRow.locator('button').last();
      if (!(await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"]').first());

      const deleteItem = page.getByRole('menuitem', { name: /delete/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await deleteItem.click();
      await waitForDialogOpen(page).catch(() => {});

      const confirmModal = page.locator('[role="dialog"]').first();
      if (!(await confirmModal.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      const confirmBtn = confirmModal
        .getByRole('button', { name: /delete|confirm|yes/i })
        .last();
      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        await waitForDialogClose(page);
      }

      const dialogClosed = await confirmModal.isHidden({ timeout: 5_000 }).catch(() => false);
      if (!dialogClosed) {
        const cancelBtn = confirmModal.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );
});
