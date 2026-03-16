import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import { waitForPageReady, waitForAnimation, waitForDropdownOptions } from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Cancellation Policy CRUD E2E Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete cycle for the Cancellation Policy settings module.
 * Route: /app/setting/cancellation-policy
 *
 * Form fields (modal):
 *   "Add Cancellation Policy" / "Edit Cancellation Policy"
 *   Required:
 *     LCNOS Type — text input (label "LCNOS Type")
 *     Fees       — NumberInput
 *
 * Add button: "Add" (from custom table header)
 * Save button: "Save" (create) / "Update" (edit), type="submit"
 * Action menu per row: Edit | Delete
 * Delete confirmation modal title: "Confirm Deletion" → "Delete" button
 *
 * @tag @regression @settings @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS          = Date.now();
const POLICY_TYPE     = `E2E Cancel Policy ${TS.toString().slice(-5)}`;
const POLICY_TYPE_UPD = `${POLICY_TYPE} Upd`;
const POLICY_FEES     = '150';
const POLICY_FEES_UPD = '200';

// ── Helpers ───────────────────────────────────────────────────────────────────
// disableLoadingOverlay is imported from mantine-helpers

/**
 * Click the action (⋮) icon button for the row containing rowText.
 */
async function clickRowAction(page: Page, rowText: string) {
  const row = page.locator('tr').filter({ hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  const actionBtn = row.locator('button').last();
  await actionBtn.click({ force: true });
  await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('Cancellation Policy — Create / Read / Update / Delete', () => {

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open the Add Cancellation Policy modal @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/cancellation-policy');
      await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
      await waitForPageReady(page);

      // "Add" button from the custom table header
      const addBtn = page.getByRole('button', { name: /^add$/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await expect(
        dialog.getByText(/add cancellation policy/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should create a new cancellation policy @smoke',
    async ({ page }) => {
      await page.goto('/app/setting/cancellation-policy');
      await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
      await waitForPageReady(page);

      // Open Add modal
      await page.getByRole('button', { name: /^add$/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await disableLoadingOverlay(page);

      // ── LCNOS Type ────────────────────────────────────────────────────────
      const typeField = dialog.getByLabel(/lcnos type/i).first();
      await typeField.fill(POLICY_TYPE);

      // ── Fees (NumberInput) ────────────────────────────────────────────────
      const feesField = dialog.getByLabel(/fees/i).first();
      await feesField.fill(POLICY_FEES);

      // ── Save ──────────────────────────────────────────────────────────────
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).first();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Search for the newly created policy
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(POLICY_TYPE);
        await waitForDropdownOptions(page).catch(() => {});
      }

      await expect(page.getByText(POLICY_TYPE)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── READ ──────────────────────────────────────────────────────────────────

  test(
    'should find the created cancellation policy in the table via search',
    async ({ page }) => {
      await page.goto('/app/setting/cancellation-policy');
      await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
      await waitForPageReady(page);

      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible({ timeout: 10_000 });
      await searchInput.fill(POLICY_TYPE);
      await waitForDropdownOptions(page).catch(() => {});

      await expect(page.getByText(POLICY_TYPE)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should open Edit modal and update the cancellation policy name and fees',
    async ({ page }) => {
      await page.goto('/app/setting/cancellation-policy');
      await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
      await waitForPageReady(page);

      // Filter to find the row
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(POLICY_TYPE);
        await waitForDropdownOptions(page).catch(() => {});
      }

      await expect(page.getByText(POLICY_TYPE)).toBeVisible({ timeout: 15_000 });

      // Click action menu
      await clickRowAction(page, POLICY_TYPE);

      // Click Edit
      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click({ force: true });

      // Edit modal opens
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(
        dialog.getByText(/edit cancellation policy/i).first(),
      ).toBeVisible({ timeout: 5_000 });

      await disableLoadingOverlay(page);

      // Update LCNOS Type
      const typeField = dialog.getByLabel(/lcnos type/i).first();
      await typeField.clear();
      await typeField.fill(POLICY_TYPE_UPD);

      // Update Fees
      const feesField = dialog.getByLabel(/fees/i).first();
      await feesField.clear();
      await feesField.fill(POLICY_FEES_UPD);

      // Save: button text is "Update" in edit mode
      const updateBtn = dialog.getByRole('button', { name: /^update$|^save$/i }).first();
      await expect(updateBtn).toBeVisible({ timeout: 5_000 });
      await updateBtn.click({ force: true });

      // Modal closes on success
      await expect(dialog).not.toBeVisible({ timeout: 15_000 });

      // Verify updated policy in the table
      const searchInput2 = page.getByPlaceholder(/search/i).first();
      if (await searchInput2.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput2.fill(POLICY_TYPE_UPD);
        await waitForDropdownOptions(page).catch(() => {});
      }

      await expect(page.getByText(POLICY_TYPE_UPD)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete the cancellation policy via the action menu',
    async ({ page }) => {
      await page.goto('/app/setting/cancellation-policy');
      await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
      await waitForPageReady(page);

      // Search for the updated policy
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.fill(POLICY_TYPE_UPD);
        await waitForDropdownOptions(page).catch(() => {});
      }

      await expect(page.getByText(POLICY_TYPE_UPD)).toBeVisible({ timeout: 15_000 });

      // Click action menu
      await clickRowAction(page, POLICY_TYPE_UPD);

      // Click Delete
      const deleteItem = page.getByRole('menuitem', { name: /delete/i }).first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click({ force: true });

      // Confirmation modal — title "Confirm Deletion" → "Delete" button
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

      // Verify the policy is gone
      await waitForPageReady(page);
      await expect(page.getByText(POLICY_TYPE_UPD)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});
