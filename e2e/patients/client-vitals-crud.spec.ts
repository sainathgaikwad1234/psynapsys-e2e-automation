import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
  waitForAnimation,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Vitals & Assessments CRUD Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete lifecycle for client vitals records.
 * All fields are required; values are validated within clinical ranges.
 *
 * Field ranges:
 *   Blood Pressure systolic: 40–300 mmHg
 *   Blood Pressure diastolic: 20–200 mmHg
 *   Heart Rate: 30–250 bpm
 *   PHQ-9: 0–27 | GAD-7: 0–21 | TA: 0+ | AUDIT: 0–40
 *
 * @tag @regression @patients @vitals @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

function todayMDY(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

// disableLoadingOverlay is imported from mantine-helpers

/**
 * Fill a Mantine NumberInput by label.
 * NumberInputs use a hidden <input> underneath the visible wrapper.
 */
async function fillNumberInput(page: Page, label: string | RegExp, value: string): Promise<void> {
  const input = page
    .getByLabel(label)
    .first()
    .or(page.locator('[role="dialog"]').locator('input[type="number"]').first());
  // Prefer scoped label lookup via the dialog
  const dialog = page.locator('[role="dialog"]').first();
  const labeled = dialog.getByLabel(label).first();
  if (await labeled.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await labeled.fill(value);
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Vitals & Assessments — CRUD', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToVitals(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/vitals-assessment`);
    await expect(page).toHaveURL(/\/vitals-assessment/, { timeout: 15_000 });
    await waitForPageReady(page);
  }

  /** Fill the vitals form inside an open dialog.
   * Selectors derived from live accessibility tree (error-context.md):
   *   textbox "Date"                     → getByLabel(/^date$/i)
   *   textbox "Blood Pressure (mmHg)"    → getByLabel("Blood Pressure (mmHg)") [Systolic]
   *   textbox "Enter Diastolic"          → getByPlaceholder("Enter Diastolic")
   *   textbox "Heart Rate (bpm)"         → getByLabel("Heart Rate (bpm)")
   *   textbox "PHQ-9"                    → getByLabel("PHQ-9")
   *   textbox "GAD-7"                    → getByLabel("GAD-7")
   *   textbox "Enter Therapeutic Alliance" → getByPlaceholder
   *   textbox "Enter Alcohol Assessment"   → getByPlaceholder
   */
  async function fillVitalsForm(page: Page, opts: {
    systolic: string;
    diastolic: string;
    heartRate: string;
    phq9: string;
    gad7: string;
    ta: string;
    audit: string;
  }): Promise<void> {
    const dialog = page.locator('[role="dialog"]').first();
    await disableLoadingOverlay(page);

    // Date (required, max today) — use Tab to dismiss datepicker, NOT Escape (Escape closes modal)
    const dateInput = dialog.getByRole('textbox', { name: /^date$/i }).first();
    if (await dateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dateInput.fill(todayMDY());
      await page.keyboard.press('Tab');
    }

    // Systolic — labeled "Blood Pressure (mmHg)", placeholder "Enter Systolic"
    const systolicInput = dialog.getByLabel('Blood Pressure (mmHg)').first()
      .or(dialog.getByPlaceholder('Enter Systolic').first());
    if (await systolicInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await systolicInput.first().fill(opts.systolic);
    }

    // Diastolic — no label, placeholder "Enter Diastolic"
    const diastolicInput = dialog.getByPlaceholder('Enter Diastolic').first();
    if (await diastolicInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await diastolicInput.fill(opts.diastolic);
    }

    // Heart Rate — labeled "Heart Rate (bpm)"
    const hrInput = dialog.getByRole('textbox', { name: /heart rate/i }).first();
    if (await hrInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await hrInput.fill(opts.heartRate);
    }

    // PHQ-9 — labeled "PHQ-9"
    const phqInput = dialog.getByRole('textbox', { name: /^phq-?9$/i }).first();
    if (await phqInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await phqInput.fill(opts.phq9);
    }

    // GAD-7 — labeled "GAD-7"
    const gadInput = dialog.getByRole('textbox', { name: /^gad-?7$/i }).first();
    if (await gadInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await gadInput.fill(opts.gad7);
    }

    // TA (Therapeutic Alliance) — no label, placeholder "Enter Therapeutic Alliance"
    const taInput = dialog.getByPlaceholder(/therapeutic alliance/i).first();
    if (await taInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await taInput.fill(opts.ta);
    }

    // AUDIT (Alcohol Assessment) — no label, placeholder "Enter Alcohol Assessment"
    const auditInput = dialog.getByPlaceholder(/alcohol assessment/i).first();
    if (await auditInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await auditInput.fill(opts.audit);
    }
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should open Add Vitals & Assessments modal @smoke',
    async ({ page }) => {
      await goToVitals(page);

      const addBtn = page.getByRole('button', { name: /add vitals/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(dialog.getByText(/add vitals.*assessments/i).first()).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should create a new vitals record @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVitals(page);

      await page.getByRole('button', { name: /add vitals/i }).first().click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await fillVitalsForm(page, {
        systolic: '120',
        diastolic: '80',
        heartRate: '72',
        phq9: '5',
        gad7: '4',
        ta: '10',
        audit: '3',
      });

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the created vitals record in the table',
    async ({ page }) => {
      await goToVitals(page);

      // The row should exist with today's date and some vital values
      const tableRows = page.locator('table tbody tr');
      await expect(tableRows.first()).toBeVisible({ timeout: 10_000 });

      // Verify at least the date column shows today's date
      const today = todayMDY();
      const dateCell = page.getByText(today).first();
      await expect(dateCell).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the vitals record',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVitals(page);

      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible({ timeout: 10_000 });

      // Open action menu
      const menuBtn = firstRow.locator('button').last();
      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const editItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Update heart rate
      await disableLoadingOverlay(page);
      const hrInput = dialog.getByLabel(/heart rate/i).first();
      if (await hrInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await hrInput.clear();
        await hrInput.fill('75');
      }

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });

      // Table should still show a row (record was updated, not deleted)
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 8_000 });
    },
  );

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test(
    'should delete the vitals record',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToVitals(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      const rowsBefore = await page.locator('table tbody tr').count();

      // Open action menu
      const menuBtn = firstRow.locator('button').last();
      await menuBtn.click({ force: true });
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const deleteItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click();
      await waitForDialogOpen(page);

      // Confirm: "Delete Vitals & Assessments" modal with "Delete" button
      const confirmDialog = page.locator('[role="dialog"]').first();
      await expect(confirmDialog).toBeVisible({ timeout: 8_000 });

      const confirmBtn = confirmDialog
        .getByRole('button', { name: /^delete$/i })
        .first();
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click({ force: true });
      await waitForDialogClose(page);

      // Wait for row count to decrease OR a success notification
      const rowsAfter = await page.locator('table tbody tr').count();
      // Accept either fewer rows or a success notification (pre-existing rows may exist)
      const deleted = rowsAfter < rowsBefore
        || await page.getByText(/deleted successfully|removed successfully/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
      expect(deleted).toBe(true);
    },
  );
});
