import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — ICD-10 Code CRUD E2E Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete cycle for the ICD-10 Codes settings module.
 * Route: /app/setting/ICD-10-code
 *
 * Form fields (modal, title "Add ICD-10 Code"):
 *   Required:
 *     ICD-10 Code   — text input (max 10 chars)
 *     Description   — Textarea
 *   Optional:
 *     Diagnosis     — text input
 *
 * Submit: <button type="submit"> "Save"
 * Action menu per row: Edit | Delete
 * Delete confirmation: "Are you sure you want to delete ?" → "Delete" button
 *
 * @tag @regression @settings @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS            = Date.now();
// ICD-10 codes are alphanumeric, up to 10 chars. Format: F{digits} (e.g. F41.1)
// Use a unique F-code derived from timestamp to avoid collisions
const ICD_CODE      = `F${(TS % 9000 + 1000).toString().slice(0, 4)}`;   // e.g. F2341
const ICD_CODE_UPD  = `${ICD_CODE}U`;                                      // e.g. F2341U (unique updated)
const ICD_DESC      = `E2E ICD-10 code for automated testing (${TS})`;
const ICD_DESC_UPD  = `${ICD_DESC} — Updated`;
const ICD_DIAGNOSIS = `E2E Diagnosis ${TS.toString().slice(-5)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function disableLoadingOverlay(page: any) {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el: Element) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

/**
 * Click the action (⋮) icon button for the row that contains rowText.
 */
async function clickRowAction(page: any, rowText: string) {
  const row = page.locator('tr').filter({ hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  const actionBtn = row.locator('button').last();
  await actionBtn.click({ force: true });
  await page.waitForTimeout(500);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('ICD-10 Codes — Create / Read / Update / Delete', () => {

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open the Add ICD-10 Code modal @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/ICD-10-code');
      await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const addBtn = page.getByRole('button', { name: /add icd-10 code/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    },
  );

  test(
    'should fill all required fields and save the new ICD-10 code @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/ICD-10-code');
      await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Open modal
      await page.getByRole('button', { name: /add icd-10 code/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await disableLoadingOverlay(page);

      // ── ICD-10 Code ───────────────────────────────────────────────────────
      const icdCodeField = dialog.getByLabel(/icd-10 code/i).first();
      await icdCodeField.fill(ICD_CODE);

      // ── Diagnosis (optional) ──────────────────────────────────────────────
      const diagnosisField = dialog.getByLabel(/diagnosis/i).first();
      await diagnosisField.fill(ICD_DIAGNOSIS);

      // ── Description ───────────────────────────────────────────────────────
      const descField = dialog.getByLabel(/description/i).first();
      await descField.fill(ICD_DESC);

      // ── Save ──────────────────────────────────────────────────────────────
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Search for the newly created ICD-10 code
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(ICD_CODE);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(ICD_CODE)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── READ ──────────────────────────────────────────────────────────────────

  test(
    'should find the created ICD-10 code in the table via search',
    async ({ page }) => {
      await page.goto('/app/setting/ICD-10-code');
      await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(ICD_CODE);
      await page.waitForTimeout(1_500);

      await expect(page.getByText(ICD_CODE)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should open Edit modal and update the ICD-10 code description',
    async ({ page }) => {
      await page.goto('/app/setting/ICD-10-code');
      await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Search for the row
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(ICD_CODE);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(ICD_CODE)).toBeVisible({ timeout: 15_000 });

      // Open action menu
      await clickRowAction(page, ICD_CODE);

      // Click Edit
      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click({ force: true });

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await disableLoadingOverlay(page);

      // Update the ICD-10 Code to the updated code
      const icdCodeField = dialog.getByLabel(/icd-10 code/i).first();
      await icdCodeField.clear();
      await icdCodeField.fill(ICD_CODE_UPD);

      // Update Description
      const descField = dialog.getByLabel(/description/i).first();
      await descField.clear();
      await descField.fill(ICD_DESC_UPD);

      // Save
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first();
      await saveBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Verify updated code appears
      const searchInput2 = page.getByPlaceholder(/search/i).first();
      if (await searchInput2.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput2.fill(ICD_CODE_UPD);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(ICD_CODE_UPD)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete the ICD-10 code via the action menu',
    async ({ page }) => {
      await page.goto('/app/setting/ICD-10-code');
      await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Search for the updated row
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(ICD_CODE_UPD);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(ICD_CODE_UPD)).toBeVisible({ timeout: 15_000 });

      // Open action menu
      await clickRowAction(page, ICD_CODE_UPD);

      // Click Delete
      const deleteItem = page.getByRole('menuitem', { name: /delete/i }).first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click({ force: true });

      // Confirmation modal: "Are you sure you want to delete ?" → "Delete"
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 8_000 });
      await expect(
        confirmDialog.getByText(/are you sure you want to delete/i),
      ).toBeVisible({ timeout: 5_000 });

      const confirmBtn = confirmDialog.getByRole('button', { name: /^delete$/i }).first();
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click({ force: true });

      // Modal closes after deletion
      await expect(confirmDialog).not.toBeVisible({ timeout: 10_000 });

      // Verify the ICD-10 code is gone
      await page.waitForTimeout(1_500);
      await expect(page.getByText(ICD_CODE_UPD)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});