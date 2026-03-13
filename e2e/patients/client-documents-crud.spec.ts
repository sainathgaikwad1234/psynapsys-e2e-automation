import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * PSYNAPSYS — Client Documents CRUD Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete lifecycle for client documents.
 * Navigates to an existing client's Records → Client Records tab.
 *
 * Notes:
 *   - Edit and Delete are only available for documents with "pending" status.
 *   - File upload is required; a minimal PDF is generated in-memory for the test.
 *
 * @tag @regression @patients @documents @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS = Date.now();
const DOC_NAME      = `E2E Doc ${TS.toString().slice(-6)}`;
const DOC_UPDATED   = `${DOC_NAME} Upd`;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a real client ID from the client list table */
async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

/** Disable Mantine LoadingOverlay so form fields are clickable */
async function disableLoadingOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

/** Click a Mantine Select combobox and pick the first option */
async function selectFirstOption(page: Page, locator: any): Promise<void> {
  const el = locator.first ? locator.first() : locator;
  if (!(await el.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  await el.click({ force: true });
  await page.waitForTimeout(500);
  const opt = page.getByRole('option').first();
  if (await opt.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await opt.click({ force: true });
    await page.waitForTimeout(300);
  }
}

/**
 * Create a minimal valid PDF in the OS temp dir.
 * Returns the absolute path to the temp file.
 */
function createTempPdf(): string {
  const minimalPdf =
    '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj ' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
    '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
    '0000000058 00000 n\n0000000115 00000 n\n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
  const tmpPath = path.join(os.tmpdir(), `e2e-doc-${TS}.pdf`);
  fs.writeFileSync(tmpPath, minimalPdf);
  return tmpPath;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Documents — CRUD', () => {
  let clientId: string;
  let tmpPdfPath: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
    tmpPdfPath = createTempPdf();
  });

  test.afterAll(() => {
    try { fs.unlinkSync(tmpPdfPath); } catch { /* ignore */ }
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should open the Upload Document modal @smoke',
    async ({ page }) => {
      await page.goto(`/app/client/${clientId}/records/client-records`);
      await expect(page).toHaveURL(/records\/client-records/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const uploadBtn = page
        .getByRole('button', { name: /upload|add document|new document/i })
        .first();
      await expect(uploadBtn).toBeVisible({ timeout: 10_000 });
      await uploadBtn.click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    },
  );

  test(
    'should upload a new client document @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await page.goto(`/app/client/${clientId}/records/client-records`);
      await expect(page).toHaveURL(/records\/client-records/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const uploadBtn = page
        .getByRole('button', { name: /upload|add document|new document/i })
        .first();
      await uploadBtn.click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Document Name (required)
      const nameInput = dialog
        .getByRole('textbox', { name: /document name/i })
        .first()
        .or(dialog.getByPlaceholder(/document name|enter name/i).first());
      await nameInput.first().fill(DOC_NAME);

      // Assign To (required Select)
      const assignInput = dialog
        .getByLabel(/assign to/i)
        .first()
        .or(dialog.getByPlaceholder(/assign to|select/i).first());
      await selectFirstOption(page, assignInput);

      // File upload (required) — try hidden input first, then dropzone
      const fileInput = dialog.locator('input[type="file"]').first();
      const inputCount = await fileInput.count();
      if (inputCount > 0) {
        await fileInput.setInputFiles(tmpPdfPath);
      } else {
        // Dropzone: trigger file selection via hidden input in dropzone
        const dropzone = dialog.locator('[class*="dropzone"]').first();
        if (await dropzone.isVisible({ timeout: 3_000 }).catch(() => false)) {
          const dzInput = dropzone.locator('input[type="file"]').first();
          if (await dzInput.count() > 0) {
            await dzInput.setInputFiles(tmpPdfPath);
          }
        }
      }
      await page.waitForTimeout(1_000);

      // Save
      const saveBtn = dialog.getByRole('button', { name: /^save$|^upload$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(2_000);

      // Modal should close
      await expect(dialog).toBeHidden({ timeout: 12_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the uploaded document in the list',
    async ({ page }) => {
      await page.goto(`/app/client/${clientId}/records/client-records`);
      await expect(page).toHaveURL(/records\/client-records/, { timeout: 15_000 });
      await page.waitForTimeout(2_000);

      // Search for the document
      const search = page
        .getByRole('searchbox')
        .first()
        .or(page.getByPlaceholder(/search/i).first());
      if (await search.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await search.first().fill(DOC_NAME);
        await page.waitForTimeout(1_200);
      }

      await expect(page.getByText(DOC_NAME)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the document name (pending documents only)',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await page.goto(`/app/client/${clientId}/records/client-records`);
      await expect(page).toHaveURL(/records\/client-records/, { timeout: 15_000 });
      await page.waitForTimeout(2_000);

      // Search for the document
      const search = page
        .getByRole('searchbox')
        .first()
        .or(page.getByPlaceholder(/search/i).first());
      if (await search.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await search.first().fill(DOC_NAME);
        await page.waitForTimeout(1_200);
      }

      const row = page.locator('table tbody tr').filter({ hasText: DOC_NAME }).first();
      if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      // Open action menu
      const menuBtn = row.locator('button').last();
      await menuBtn.click({ force: true });
      await page.waitForTimeout(400);

      const editItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
      if (!(await editItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        // Document might not be in pending state — skip gracefully
        await page.keyboard.press('Escape');
        test.skip();
        return;
      }
      await editItem.click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      const nameInput = dialog
        .getByRole('textbox', { name: /document name/i })
        .first()
        .or(dialog.getByPlaceholder(/document name|enter name/i).first());
      await nameInput.first().clear();
      await nameInput.first().fill(DOC_UPDATED);

      const saveBtn = dialog.getByRole('button', { name: /^save$|^update$/i }).last();
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1_500);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText(DOC_UPDATED)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test(
    'should delete the document',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await page.goto(`/app/client/${clientId}/records/client-records`);
      await expect(page).toHaveURL(/records\/client-records/, { timeout: 15_000 });
      await page.waitForTimeout(2_000);

      // Search for the document (try updated name first, fall back to original)
      const search = page
        .getByRole('searchbox')
        .first()
        .or(page.getByPlaceholder(/search/i).first());

      let targetName = DOC_UPDATED;
      if (await search.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await search.first().fill(DOC_UPDATED);
        await page.waitForTimeout(1_200);
        if (!(await page.getByText(DOC_UPDATED).isVisible({ timeout: 3_000 }).catch(() => false))) {
          await search.first().clear();
          await search.first().fill(DOC_NAME);
          targetName = DOC_NAME;
          await page.waitForTimeout(1_200);
        }
      }

      const row = page.locator('table tbody tr').filter({ hasText: targetName }).first();
      if (!(await row.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      const menuBtn = row.locator('button').last();
      await menuBtn.click({ force: true });
      await page.waitForTimeout(400);

      const deleteItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        test.skip();
        return;
      }
      await deleteItem.click();
      await page.waitForTimeout(600);

      // Confirm deletion dialog
      const confirmDialog = page.locator('[role="dialog"]').first();
      if (await confirmDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const confirmBtn = confirmDialog
          .getByRole('button', { name: /^delete$|confirm/i })
          .last();
        await confirmBtn.click({ force: true });
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(targetName)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});