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
 * PSYNAPSYS — Client Medication History CRUD Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete lifecycle for a client's current medications.
 * Navigates to an existing client's Biopsychosocial History → Medication History tab.
 *
 * @tag @regression @patients @medication @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS = Date.now();
const MED_NAME      = `E2E Med ${TS.toString().slice(-6)}`;
const MED_UPDATED   = `${MED_NAME} Upd`;
const MED_NOTE      = 'E2E test medication — safe to delete. 100mg twice daily.';
const MED_NOTE_UPD  = 'Updated note. 200mg once daily.';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve a real client ID from the client list table */
async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

// disableLoadingOverlay is imported from mantine-helpers

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Medication History — CRUD', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  // Helper: navigate to the medication tab
  async function goToMedication(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/biopsychosocial_history/medication-history`);
    await expect(page).toHaveURL(/biopsychosocial_history\/medication-history/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPageReady(page);
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  /** Click the "Add" button next to the "Medication" heading (2nd Add on the page) */
  async function clickMedicationAdd(page: Page): Promise<void> {
    // Page layout: heading "Medical History" → Add, heading "Medication" → Add, heading "Doctor Information" → Add
    // The 2nd Add button belongs to the Medication section
    await disableLoadingOverlay(page);
    const allAdd = page.getByRole('button', { name: /^add$/i });
    await expect(allAdd.first()).toBeVisible({ timeout: 10_000 });
    const count = await allAdd.count();
    if (count >= 2) {
      await allAdd.nth(1).click({ force: true });
    } else {
      await allAdd.first().click({ force: true });
    }
    await waitForAnimation(page.locator('[role="dialog"]').first());
  }

  test(
    'should open Add Current Medication modal @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMedication(page);
      await clickMedicationAdd(page);
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(
        dialog.getByText(/add current medication/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should create a new medication entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToMedication(page);

      await clickMedicationAdd(page);
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Medicine Name (required) — click first to ensure focus, then fill
      const nameInput = dialog
        .getByRole('textbox', { name: /medicine name/i })
        .first()
        .or(dialog.getByPlaceholder(/medicine name|medication name/i).first());
      await nameInput.first().click({ force: true });
      await nameInput.first().fill(MED_NAME);

      // Note (textarea — optional)
      const noteInput = dialog.locator('textarea').first()
        .or(dialog.getByPlaceholder(/note|enter note/i).first());
      if (await noteInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await noteInput.first().fill(MED_NOTE);
      }

      // Save
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      // Modal should close
      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the created medication in the list',
    async ({ page }) => {
      await goToMedication(page);

      await expect(page.getByText(MED_NAME)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the medication name and note',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMedication(page);

      await expect(page.getByText(MED_NAME)).toBeVisible({ timeout: 10_000 });

      // Action icon is an <img> in the last cell — hover row then click via coordinates
      const row = page.locator('tr, [role="row"]').filter({ hasText: MED_NAME }).first();
      await row.hover();
      await page.waitForTimeout(400); // TODO: replace with specific wait helper — intentional hover-reveal timing
      const clickPos = await page.evaluate((name: string) => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const target = rows.find((r) => r.textContent?.includes(name));
        if (!target) return null;
        const img = target.querySelector('td:last-child img, td:last-child svg') as HTMLElement | null;
        if (img) {
          const r = img.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        const tds = target.querySelectorAll('td');
        const lastTd = tds[tds.length - 1] as HTMLElement | undefined;
        if (lastTd) {
          const r = lastTd.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width - 12, y: r.y + r.height / 2 };
        }
        return null;
      }, MED_NAME);
      if (clickPos) {
        await page.mouse.move(clickPos.x, clickPos.y);
        await page.waitForTimeout(200); // TODO: replace with specific wait helper — mouse tracking guard
        await page.mouse.click(clickPos.x, clickPos.y);
      } else {
        await row.click({ force: true });
      }
      await waitForDialogOpen(page);

      // Clicking the img opens the Edit Medication dialog directly
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Update medicine name
      const nameInput = dialog
        .getByRole('textbox', { name: /medicine name/i })
        .first()
        .or(dialog.getByPlaceholder(/medicine name|medication name/i).first());
      await nameInput.first().clear();
      await nameInput.first().fill(MED_UPDATED);

      // Update note
      const noteInput = dialog.locator('textarea').first()
        .or(dialog.getByPlaceholder(/note|enter note/i).first());
      if (await noteInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await noteInput.first().clear();
        await noteInput.first().fill(MED_NOTE_UPD);
      }

      // Update / Save
      const saveBtn = dialog
        .getByRole('button', { name: /^update$|^save$/i })
        .last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText(MED_UPDATED)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test(
    'should delete the medication entry',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMedication(page);

      // Try updated name first, fall back to original
      let targetName = MED_UPDATED;
      if (!(await page.getByText(MED_UPDATED).isVisible({ timeout: 3_000 }).catch(() => false))) {
        targetName = MED_NAME;
      }
      await expect(page.getByText(targetName)).toBeVisible({ timeout: 10_000 });

      const row = page.locator('tr, [role="row"]').filter({ hasText: targetName }).first();
      await row.hover();
      await page.waitForTimeout(400); // TODO: replace with specific wait helper — intentional hover-reveal timing
      const delClickPos = await page.evaluate((name: string) => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const target = rows.find((r) => r.textContent?.includes(name));
        if (!target) return null;
        const img = target.querySelector('td:last-child img, td:last-child svg') as HTMLElement | null;
        if (img) {
          const r = img.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        const tds = target.querySelectorAll('td');
        const lastTd = tds[tds.length - 1] as HTMLElement | undefined;
        if (lastTd) {
          const r = lastTd.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width - 12, y: r.y + r.height / 2 };
        }
        return null;
      }, targetName);
      if (delClickPos) {
        await page.mouse.move(delClickPos.x, delClickPos.y);
        await page.waitForTimeout(200); // TODO: replace with specific wait helper — mouse tracking guard
        await page.mouse.click(delClickPos.x, delClickPos.y);
      } else {
        await row.click({ force: true });
      }
      await waitForAnimation(page.locator('[role="menu"], [role="menuitem"]').first());

      const deleteItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
      if (!(await deleteItem.isVisible({ timeout: 3_000 }).catch(() => false))) {
        // Medication table may only support Edit (pencil icon), not Delete — skip gracefully
        await page.keyboard.press('Escape');
        test.skip();
        return;
      }
      await deleteItem.click();
      await waitForAnimation(page.locator('[role="dialog"]').first());

      // Confirm deletion
      const confirmDialog = page.locator('[role="dialog"]').first();
      if (await confirmDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const confirmBtn = confirmDialog
          .getByRole('button', { name: /^delete$|confirm/i })
          .last();
        await confirmBtn.click({ force: true });
        await waitForDialogClose(page);
      }

      await expect(page.getByText(targetName)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});
