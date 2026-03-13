import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Client Prior Authorization CRUD Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete lifecycle for client prior authorizations.
 * Route: /app/client/${clientId}/payment/prior-authorization
 *
 * Required fields:
 *   Prior Authorization Number (alphanumeric + hyphens)
 *   Allowed Visit, Warning Count, Remaining Visit (numbers, warning ≤ allowed, remaining ≤ allowed)
 *   Start Date, End Date (Start Date min: today)
 *
 * @tag @regression @patients @prior-auth @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS        = Date.now();
const AUTH_NUM  = `E2E-${TS.toString().slice(-8)}`;   // alphanumeric + hyphens
const AUTH_UPD  = `E2E-UPD-${TS.toString().slice(-6)}`;

function todayMDY(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function tomorrowMDY(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
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

async function disableLoadingOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Prior Authorization — CRUD', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToPriorAuth(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/payment/prior-authorization`);
    await expect(page).toHaveURL(/payment\/prior-authorization/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_500);
  }

  /** Fill the Add/Edit Prior Authorization form inside an open dialog */
  async function fillPriorAuthForm(page: Page, authNum: string): Promise<void> {
    const dialog = page.locator('[role="dialog"]').first();
    await disableLoadingOverlay(page);

    // Prior Authorization Number (required)
    const authInput = dialog
      .getByLabel(/prior authorization number/i)
      .first()
      .or(dialog.getByPlaceholder(/prior auth/i).first());
    await authInput.first().clear();
    await authInput.first().fill(authNum);

    // Allowed Visit (required, min 0)
    const allowedInput = dialog.getByLabel(/allowed visit/i).first();
    if (await allowedInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await allowedInput.clear();
      await allowedInput.fill('10');
    }

    // Warning Count (required, 0 ≤ allowed)
    const warnInput = dialog.getByLabel(/warning count/i).first();
    if (await warnInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await warnInput.clear();
      await warnInput.fill('2');
    }

    // Remaining Visit (required, 0 ≤ allowed)
    const remInput = dialog.getByLabel(/remaining visit/i).first();
    if (await remInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await remInput.clear();
      await remInput.fill('10');
    }

    // Start Date (required, min today)
    // From error context: textbox "Start Date" — use getByRole for exact match
    const startInput = dialog.getByRole('textbox', { name: /^start date$/i }).first();
    if (await startInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startInput.fill(todayMDY());
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);
    }

    // End Date (required, min start_date)
    // From error context: textbox "End Date" (paragraph "End Date is required" visible on error)
    const endInput = dialog.getByRole('textbox', { name: /^end date$/i }).first();
    if (await endInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await endInput.fill(tomorrowMDY());
      await page.keyboard.press('Tab');
      await page.waitForTimeout(300);
    }
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should open Add Prior Authorization form @smoke',
    async ({ page }) => {
      await goToPriorAuth(page);

      const addBtn = page
        .getByRole('button', { name: /add prior auth|add authorization|new prior/i })
        .first()
        .or(page.getByRole('button', { name: /^add$/i }).first());
      await expect(addBtn.first()).toBeVisible({ timeout: 10_000 });
      await addBtn.first().click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    },
  );

  test(
    'should create a new prior authorization @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(120_000);
      await goToPriorAuth(page);

      const addBtn = page
        .getByRole('button', { name: /add prior auth|add authorization|new prior/i })
        .first()
        .or(page.getByRole('button', { name: /^add$/i }).first());
      await addBtn.first().click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await fillPriorAuthForm(page, AUTH_NUM);

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1_500);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the created prior authorization in the table',
    async ({ page }) => {
      await goToPriorAuth(page);
      await expect(page.getByText(AUTH_NUM)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the prior authorization number',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPriorAuth(page);
      await expect(page.getByText(AUTH_NUM)).toBeVisible({ timeout: 10_000 });

      // Find the row and open action menu
      const row = page.locator('table tbody tr').filter({ hasText: AUTH_NUM }).first();
      const menuBtn = row.locator('button').last();
      await menuBtn.click({ force: true });
      await page.waitForTimeout(400);

      const editItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      await fillPriorAuthForm(page, AUTH_UPD);

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1_500);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText(AUTH_UPD)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test(
    'should delete the prior authorization',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPriorAuth(page);
      // Extra wait for table to fully render
      await page.waitForTimeout(2_000);

      // Try updated number first, fall back to original
      let targetText = AUTH_UPD;
      const updRow = page.locator('table tbody tr').filter({ hasText: AUTH_UPD }).first();
      const isUpdVisible = await updRow.isVisible({ timeout: 10_000 }).catch(() => false);
      if (!isUpdVisible) {
        targetText = AUTH_NUM;
      }
      // Whichever text we're using, wait for that row
      await expect(
        page.locator('table').filter({ hasText: targetText }).first()
      ).toBeVisible({ timeout: 10_000 });

      const row = page.locator('table tbody tr').filter({ hasText: targetText }).first();
      const menuBtn = row.locator('button').last();
      await menuBtn.click({ force: true });
      await page.waitForTimeout(400);

      const deleteItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click();
      await page.waitForTimeout(600);

      // DeleteConfirm dialog
      const confirmDialog = page.locator('[role="dialog"]').first();
      await expect(confirmDialog).toBeVisible({ timeout: 8_000 });

      const confirmBtn = confirmDialog
        .getByRole('button', { name: /delete|confirm|yes/i })
        .last();
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click({ force: true });
      await page.waitForTimeout(2_000);

      // Row should be gone or a success notification should appear
      const rowGone = !(await page.locator('table tbody tr').filter({ hasText: targetText }).first().isVisible({ timeout: 3_000 }).catch(() => false));
      const successNotif = await page.getByText(/deleted successfully|removed successfully/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
      expect(rowGone || successNotif).toBe(true);
    },
  );
});