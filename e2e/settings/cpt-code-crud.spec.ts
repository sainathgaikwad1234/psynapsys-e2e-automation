import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — CPT Code CRUD E2E Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete cycle for the CPT Codes settings module.
 * Route: /app/setting/CPT-code
 *
 * Form fields (modal, title "Add CPT Code" / "Edit CPT Code"):
 *   Required:
 *     CPT Name      — text input
 *     CPT Code      — NumberInput (max 5 digits, numeric)
 *     POS Code      — Select: "02" | "10" | "11"
 *     Billing Amount — NumberInput ($)
 *     Time Reserved  — NumberInput (minutes)
 *     Session Duration — NumberInput (minutes)
 *     Reimbursement Amount — NumberInput ($)
 *     Description   — text input
 *   Optional: Modifier 1, Modifier 2, Modifier 3
 *
 * Action menu per row: Edit | Delete
 * Delete confirmation: "Are you sure you want to delete ?" → "Delete" button
 *
 * @tag @regression @settings @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS             = Date.now();
// CPT codes are 5-digit numeric codes; derive a unique one from the timestamp
const CPT_CODE_NUM   = ((TS % 90000) + 10000).toString(); // always 5 digits: 10000-99999
const CPT_NAME       = `E2E CPT ${TS.toString().slice(-5)}`;
const CPT_NAME_UPD   = `${CPT_NAME} Upd`;
const CPT_DESC       = `E2E test CPT code created at ${TS}`;

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
 * Click a Mantine Select combobox and pick the first visible option.
 */
async function selectFirstOption(page: any, fieldLocator: any) {
  const field = fieldLocator.first ? fieldLocator.first() : fieldLocator;
  if (!(await field.isVisible({ timeout: 2_000 }).catch(() => false))) return;
  await field.click({ force: true });
  await page.waitForTimeout(400);
  const firstOpt = page.getByRole('option').first();
  if (await firstOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await firstOpt.click({ force: true });
  }
  await page.waitForTimeout(300);
}

/**
 * Click the action (⋮) icon button for the row that contains rowText.
 * Returns after the menu is confirmed visible.
 */
async function clickRowAction(page: any, rowText: string) {
  const row = page.locator('tr').filter({ hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  // Action menu is triggered by the last button in the row (DotsThreeVertical ActionIcon)
  const actionBtn = row.locator('button').last();
  await actionBtn.click({ force: true });
  await page.waitForTimeout(500);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('CPT Codes — Create / Read / Update / Delete', () => {

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open the Add CPT Code modal @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/CPT-code');
      await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const addBtn = page.getByRole('button', { name: /add cpt code/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Modal title should say "Add CPT Code"
      await expect(
        dialog.getByText(/add cpt code/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should fill all required fields and save the new CPT code @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/CPT-code');
      await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Open modal
      await page.getByRole('button', { name: /add cpt code/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Disable any overlays
      await disableLoadingOverlay(page);

      // ── CPT Name ──────────────────────────────────────────────────────────
      const cptNameField = dialog.getByPlaceholder(/enter cpt name/i).first();
      await cptNameField.fill(CPT_NAME, { force: true });

      // ── CPT Code (NumberInput) ─────────────────────────────────────────────
      // Mantine NumberInput renders as input[role="spinbutton"]; clear then type
      const cptCodeField = dialog.getByPlaceholder(/enter code/i).first();
      await cptCodeField.fill(CPT_CODE_NUM, { force: true });

      // ── POS Code (Select) ──────────────────────────────────────────────────
      await selectFirstOption(page, dialog.getByLabel(/pos code/i).first());

      // ── Billing Amount (NumberInput) ──────────────────────────────────────
      const billingField = dialog.getByPlaceholder(/billing amount|enter billing/i).first()
        .or(dialog.getByLabel(/billing amount/i).first());
      await billingField.first().fill('150', { force: true });

      // ── Time Reserved (NumberInput) ───────────────────────────────────────
      const timeField = dialog.getByPlaceholder(/time reserved|enter time/i).first()
        .or(dialog.getByLabel(/time reserved/i).first());
      await timeField.first().fill('60', { force: true });

      // ── Session Duration (NumberInput) ────────────────────────────────────
      const durationField = dialog.getByPlaceholder(/session duration|enter.*duration/i).first()
        .or(dialog.getByLabel(/session duration/i).first());
      await durationField.first().fill('60', { force: true });

      // ── Reimbursement Amount (NumberInput) ────────────────────────────────
      const reimbField = dialog.getByPlaceholder(/reimbursement|enter reimb/i).first()
        .or(dialog.getByLabel(/reimbursement amount/i).first());
      await reimbField.first().fill('120', { force: true });

      // ── Description ───────────────────────────────────────────────────────
      const descField = dialog.getByPlaceholder(/description|enter desc/i).first()
        .or(dialog.getByLabel(/description/i).first());
      await descField.first().fill(CPT_DESC, { force: true });

      // ── Save ──────────────────────────────────────────────────────────────
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Search for the newly created CPT code in the table
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(CPT_NAME);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(CPT_NAME)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── READ ──────────────────────────────────────────────────────────────────

  test(
    'should find the created CPT code in the table via search',
    async ({ page }) => {
      await page.goto('/app/setting/CPT-code');
      await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(CPT_NAME);
      await page.waitForTimeout(1_500);

      await expect(page.getByText(CPT_NAME)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should open the Edit modal for the created CPT code and update the name',
    async ({ page }) => {
      await page.goto('/app/setting/CPT-code');
      await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Search for the row
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(CPT_NAME);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(CPT_NAME)).toBeVisible({ timeout: 15_000 });

      // Open action menu
      await clickRowAction(page, CPT_NAME);

      // Click Edit
      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click({ force: true });

      // Edit CPT Code modal opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(
        dialog.getByText(/edit cpt code/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      // Disable overlays
      await disableLoadingOverlay(page);

      // Update CPT Name
      const cptNameField = dialog.getByLabel(/cpt name/i).first();
      await cptNameField.clear();
      await cptNameField.fill(CPT_NAME_UPD);

      // Save
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first();
      await saveBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Verify updated name appears in the table
      const searchInput2 = page.getByPlaceholder(/search/i).first();
      if (await searchInput2.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput2.fill(CPT_NAME_UPD);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(CPT_NAME_UPD)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete the created CPT code via the action menu',
    async ({ page }) => {
      await page.goto('/app/setting/CPT-code');
      await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
      await page.waitForTimeout(1_500);

      // Search for the updated row
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(CPT_NAME_UPD);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(CPT_NAME_UPD)).toBeVisible({ timeout: 15_000 });

      // Open action menu
      await clickRowAction(page, CPT_NAME_UPD);

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

      // Verify the CPT code is gone from the table
      await page.waitForTimeout(1_500);
      await expect(page.getByText(CPT_NAME_UPD)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});