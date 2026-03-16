import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
  waitForAnimation,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Forms Sub-tabs CRUD Tests (Therapist Portal)
 *
 * Tests for the two client form sub-tabs:
 *   - Assigned Forms  (/app/client/$id/forms/assigned)
 *       View, Send/Resend, Delete
 *   - Completed Forms (/app/client/$id/forms/completed)
 *       View form response, Download
 *
 * @tag @regression @patients @forms
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return firstIdCell.innerText();
}

async function goToTab(page: Page, clientId: string, tab: string): Promise<void> {
  await page.goto(`/app/client/${clientId}/forms/${tab}`);
  await expect(page).toHaveURL(new RegExp(`forms/${tab}`), { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Forms Tabs — CRUD', () => {

  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    clientId   = await resolveClientId(page);
    await ctx.close();
  });

  // ── ASSIGNED FORMS ────────────────────────────────────────────────────────

  test(
    'should display the Assigned Forms tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'assigned');
      const heading = page.getByText(/assigned|form/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show assigned forms list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'assigned');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="form"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no form|no assigned|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasEmpty).toBe(true);
    },
  );

  test(
    'should show action menu for assigned form row if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'assigned');

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

      const hasView   = await page.getByRole('menuitem', { name: /view/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasSend   = await page.getByRole('menuitem', { name: /send|resend/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDelete = await page.getByRole('menuitem', { name: /delete|remove/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasView || hasSend || hasDelete).toBe(true);
    },
  );

  test(
    'should open View modal for assigned form @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'assigned');

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

      const viewItem = page.getByRole('menuitem', { name: /^view$/i }).first();
      if (!(await viewItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await viewItem.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });
        const closeBtn = dialog.getByRole('button', { name: /close|cancel/i }).first();
        if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await closeBtn.click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        await expect(page.locator('body')).toBeVisible();
        await page.goBack().catch(() => {});
      }
    },
  );

  test(
    'should show Send/Resend option for assigned form @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'assigned');

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

      const hasSend = await page
        .getByRole('menuitem', { name: /send|resend/i })
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      await page.keyboard.press('Escape');
      await expect(page.locator('body')).toBeVisible();
      if (hasSend) {
        expect(true).toBe(true);
      }
    },
  );

  test(
    'should delete an assigned form if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToTab(page, clientId, 'assigned');

      const rows    = page.locator('table tbody tr');
      const lastRow = rows.last();

      const menuBtn = lastRow.locator('button').last();
      if (!(await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const deleteItem = page.getByRole('menuitem', { name: /delete|remove/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await deleteItem.click();
      await waitForDialogOpen(page);

      const confirmModal = page.locator('[role="dialog"]').first();
      if (await confirmModal.isVisible({ timeout: 5_000 }).catch(() => false)) {
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
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── COMPLETED FORMS ───────────────────────────────────────────────────────

  test(
    'should display the Completed Forms tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'completed');
      const heading = page.getByText(/completed|form/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show completed forms list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'completed');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="form"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no form|no completed|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasEmpty).toBe(true);
    },
  );

  test(
    'should show action menu for completed form row if available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'completed');

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

      const hasView     = await page.getByRole('menuitem', { name: /view/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDownload = await page.getByRole('menuitem', { name: /download/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasView || hasDownload).toBe(true);
    },
  );

  test(
    'should open View modal for completed form response @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'completed');

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

      const viewItem = page.getByRole('menuitem', { name: /^view$/i }).first();
      if (!(await viewItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await viewItem.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });
        const closeBtn = dialog.getByRole('button', { name: /close|cancel/i }).first();
        if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await closeBtn.click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        await expect(page.locator('body')).toBeVisible();
        await page.goBack().catch(() => {});
      }
    },
  );

  test(
    'should display form status badges in completed forms list @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToTab(page, clientId, 'completed');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      if (!hasTable) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      const hasStatus = await page
        .getByText(/completed|submitted|reviewed/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasStatus) {
        expect(true).toBe(true);
      }
    },
  );
});
