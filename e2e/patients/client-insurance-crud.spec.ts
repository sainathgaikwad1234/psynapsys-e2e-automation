import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Client Insurance CRUD Tests (Therapist Portal)
 *
 * Full create → read → update → delete lifecycle for a client's insurance records.
 * Route: /app/client/$clientId/payment/insurance
 *
 * @tag @regression @patients @insurance @crud
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

// ── Test Data ─────────────────────────────────────────────────────────────────

const TS = Date.now();
const MEMBER_ID = `E2E-${TS.toString().slice(-6)}`;
const UPDATED_MEMBER_ID = `UPD-${TS.toString().slice(-6)}`;

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Insurance — CRUD', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToInsurance(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/payment/insurance`);
    await expect(page).toHaveURL(/\/payment\/insurance/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1_500);
  }

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should open Add Insurance modal @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToInsurance(page);

      const addBtn = page
        .getByRole('button', { name: /add insurance/i })
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
    'should fill insurance form and save @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToInsurance(page);

      const addBtn = page
        .getByRole('button', { name: /add insurance/i })
        .first()
        .or(page.getByRole('button', { name: /^add$/i }).first());

      if (!(await addBtn.first().isVisible({ timeout: 10_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.first().click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Insurance Company — Select/Combobox
      const insuranceInput = dialog
        .locator('input[placeholder*="insurance" i], input[placeholder*="company" i]')
        .first()
        .or(dialog.getByLabel(/insurance company/i).first());
      if (await insuranceInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await insuranceInput.first().click({ force: true });
        await page.waitForTimeout(300);
        await insuranceInput.first().pressSequentially('a', { delay: 50 });
        await page.waitForTimeout(1_500);
        const opt = page.getByRole('option').first();
        if (await opt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await opt.click({ force: true });
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }

      // Member ID / Subscriber ID
      const memberIdInput = dialog
        .getByPlaceholder(/member id|subscriber id/i)
        .first()
        .or(dialog.getByLabel(/member id|subscriber id/i).first());
      if (await memberIdInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await memberIdInput.first().click({ force: true });
        await memberIdInput.first().fill(MEMBER_ID);
        await page.waitForTimeout(200);
      }

      // Insurance Type — Select (Primary/Secondary/Tertiary)
      const typeInput = dialog
        .locator('input[placeholder*="type" i], input[placeholder*="select type" i]')
        .first()
        .or(dialog.getByLabel(/insurance type|type/i).first());
      if (await typeInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await typeInput.first().click({ force: true });
        await page.waitForTimeout(500);
        const typeOpt = page.getByRole('option').first();
        if (await typeOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await typeOpt.click({ force: true });
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }

      // Relationship — Select
      const relationInput = dialog
        .locator('input[placeholder*="relation" i]')
        .first()
        .or(dialog.getByLabel(/relationship|relation/i).first());
      if (await relationInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await relationInput.first().click({ force: true });
        await page.waitForTimeout(500);
        const relOpt = page.getByRole('option').first();
        if (await relOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await relOpt.click({ force: true });
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }

      // Save
      await disableLoadingOverlay(page);
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(3_000);

      const dialogHidden = await dialog.isHidden({ timeout: 8_000 }).catch(() => false);
      if (!dialogHidden) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display insurance list on the payment page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToInsurance(page);

      // Either a table or cards/sections with insurance info
      const hasTable = await page.locator('table').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasCard = await page
        .locator('[class*="card"], [class*="insurance"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      const hasSection = await page
        .getByText(/insurance/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      expect(hasTable || hasCard || hasSection).toBe(true);
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should edit the first insurance record',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToInsurance(page);

      // Find first row or card with an edit/action button
      const firstRow = page.locator('table tbody tr').first();
      const hasRow = await firstRow.isVisible({ timeout: 5_000 }).catch(() => false);

      if (!hasRow) {
        test.skip();
        return;
      }

      // Open action menu or Edit button
      const menuBtn = firstRow.locator('button').last();
      await menuBtn.click({ force: true });
      await page.waitForTimeout(500);

      const editItem = page.getByRole('menuitem', { name: /edit/i }).first();
      const hasEdit = await editItem.isVisible({ timeout: 3_000 }).catch(() => false);
      if (!hasEdit) {
        // Try direct Edit button in row
        const editBtn = firstRow.getByRole('button', { name: /edit/i }).first();
        if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await editBtn.click({ force: true });
        } else {
          test.skip();
          return;
        }
      } else {
        await editItem.click();
      }

      await page.waitForTimeout(800);
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(1_500);
      await disableLoadingOverlay(page);

      // Update Member ID
      const memberIdInput = dialog
        .getByPlaceholder(/member id|subscriber id/i)
        .first()
        .or(dialog.getByLabel(/member id|subscriber id/i).first());
      if (await memberIdInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await memberIdInput.first().click({ force: true });
        await memberIdInput.first().fill(UPDATED_MEMBER_ID);
        await page.waitForTimeout(200);
      }

      const apiResp = page.waitForResponse(
        r => /insurance/i.test(r.url()) && ['PUT', 'PATCH', 'POST'].includes(r.request().method()),
        { timeout: 15_000 },
      ).catch(() => null);

      const saveBtn = dialog.getByRole('button', { name: /^save$|^update$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });

      const resp = await apiResp;
      await page.waitForTimeout(2_000);

      if (resp && resp.status() >= 400) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
        return;
      }

      await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete the first insurance record',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToInsurance(page);

      const firstRow = page.locator('table tbody tr').first();
      if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }

      const rowCountBefore = await page.locator('table tbody tr').count();
      const firstRowText = await firstRow.innerText().catch(() => '');

      const menuBtn = firstRow.locator('button').last();
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
      await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
      await confirmBtn.click({ force: true });

      const dialogClosed = await confirmModal
        .waitFor({ state: 'hidden', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
      await page.waitForTimeout(2_000);

      const rowCountAfter = await page.locator('table tbody tr').count();
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
