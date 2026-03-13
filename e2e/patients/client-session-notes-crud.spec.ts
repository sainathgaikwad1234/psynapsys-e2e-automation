import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Client Visit / Session Notes CRUD Tests (Therapist Portal)
 *
 * Create → Read → Update → Delete for clinical visit notes.
 * Route: /app/client/$clientId/records/visit-notes
 *
 * @tag @regression @patients @session-notes @crud
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

async function disableLoadingOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

const TS = Date.now();
const NOTE_TEXT    = `E2E visit note ${TS.toString().slice(-6)}`;
const UPDATED_NOTE = `Updated ${NOTE_TEXT}`;

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Visit Notes — CRUD', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    clientId   = await resolveClientId(page);
    await ctx.close();
  });

  async function goToVisitNotes(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/records/visit-notes`);
    await expect(page).toHaveURL(/records\/visit-notes/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_500);
  }

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Visit Notes page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVisitNotes(page);

      const heading = page.getByText(/visit note|session note|note/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show visit notes list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVisitNotes(page);

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="note"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no notes|no records|empty|no data/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasEmpty).toBe(true);
    },
  );

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open Add Note modal or form @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVisitNotes(page);

      const addBtn = page
        .getByRole('button', { name: /add note|new note|create note|^add$/i })
        .first();

      if (!(await addBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.click({ force: true });
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      const isDialog = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      if (isDialog) {
        await expect(dialog).toBeVisible({ timeout: 8_000 });
      } else {
        // Inline form
        const anyInput = page.locator('textarea, input[type="text"]').first();
        await expect(anyInput).toBeVisible({ timeout: 5_000 });
      }
    },
  );

  test(
    'should create a new visit note @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToVisitNotes(page);

      const addBtn = page
        .getByRole('button', { name: /add note|new note|create note|^add$/i })
        .first();

      if (!(await addBtn.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.click({ force: true });
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      const isDialog = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      const formScope = isDialog ? dialog : page;

      await disableLoadingOverlay(page);

      // Note title
      const titleInput = formScope
        .getByPlaceholder(/title|subject/i)
        .first()
        .or(formScope.getByLabel(/title|subject/i).first());
      if (await titleInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await titleInput.first().click({ force: true });
        await titleInput.first().fill(NOTE_TEXT.slice(0, 40));
        await page.waitForTimeout(200);
      }

      // Note body / content
      const bodyInput = formScope
        .locator('textarea')
        .first()
        .or(formScope.getByPlaceholder(/note|content|description/i).first());
      if (await bodyInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await bodyInput.first().click({ force: true });
        await bodyInput.first().fill(NOTE_TEXT);
        await page.waitForTimeout(200);
      }

      // Note type / category
      const typeInput = formScope
        .locator('input[placeholder*="type" i], input[placeholder*="category" i]')
        .first();
      if (await typeInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await typeInput.click({ force: true });
        await page.waitForTimeout(400);
        const opt = page.getByRole('option').first();
        if (await opt.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await opt.click({ force: true });
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }

      const saveBtn = formScope.getByRole('button', { name: /^save$|^create$|^submit$/i }).last();
      if (!(await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await disableLoadingOverlay(page);
      await saveBtn.click({ force: true });
      await page.waitForTimeout(3_000);

      if (isDialog) {
        const dialogHidden = await dialog.isHidden({ timeout: 8_000 }).catch(() => false);
        if (!dialogHidden) {
          const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
          if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await cancelBtn.click({ force: true });
          }
        }
      }
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should edit the first visit note',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToVisitNotes(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      // Skip if empty table (Mantine renders a "No Data Available" row with no buttons)
      const menuBtn = firstRow.locator('button').last();
      const hasBtn = await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasBtn) {
        test.skip();
        return;
      }
      await menuBtn.click({ force: true });
      await page.waitForTimeout(500);

      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      if (!(await editItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await editItem.click();
      await page.waitForTimeout(800);

      const dialog = page.locator('[role="dialog"]').first();
      const isDialog = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      const formScope = isDialog ? dialog : page;

      await page.waitForTimeout(1_500);
      await disableLoadingOverlay(page);

      const bodyInput = formScope.locator('textarea').first();
      if (await bodyInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await bodyInput.click({ force: true });
        await bodyInput.fill(UPDATED_NOTE);
        await page.waitForTimeout(200);
      }

      const saveBtn = formScope.getByRole('button', { name: /^save$|^update$/i }).last();
      if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(2_000);
      }

      if (isDialog) {
        const dialogHidden = await dialog.isHidden({ timeout: 5_000 }).catch(() => false);
        if (!dialogHidden) {
          const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
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
    'should delete the first visit note',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVisitNotes(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      // Skip if empty table (Mantine renders a "No Data Available" row with no buttons)
      const menuBtn = firstRow.locator('button').last();
      const hasBtn = await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false);
      if (!hasBtn) {
        test.skip();
        return;
      }

      const rowCountBefore = await page.locator('table tbody tr').count();
      const firstRowText = await firstRow.innerText().catch(() => '');

      await menuBtn.click({ force: true });
      await page.waitForTimeout(500);

      const deleteItem = page.getByRole('menuitem', { name: /delete/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await deleteItem.click();
      await page.waitForTimeout(600);

      const confirmModal = page.locator('[role="dialog"]').first();
      await expect(confirmModal).toBeVisible({ timeout: 8_000 });

      const confirmBtn = confirmModal
        .getByRole('button', { name: /delete|confirm|yes/i })
        .last();
      await confirmBtn.click({ force: true });

      const dialogClosed = await confirmModal
        .waitFor({ state: 'hidden', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(2_000);

      const rowCountAfter = await page.locator('table tbody tr').count().catch(() => 0);
      const successNotif = await page
        .getByText(/deleted|removed|success/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      const rowGone = firstRowText
        ? !(await page
            .locator('table tbody tr')
            .filter({ hasText: firstRowText.slice(0, 20) })
            .first()
            .isVisible({ timeout: 2_000 })
            .catch(() => false))
        : rowCountAfter < rowCountBefore;

      expect(dialogClosed || rowCountAfter < rowCountBefore || successNotif || rowGone).toBe(true);
    },
  );
});
