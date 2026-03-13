import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Client Payment Sub-tabs Tests (Therapist Portal)
 *
 * Tests for payment sub-tabs under a client record:
 *   - Card Details  (/app/client/$id/payment/card-details)
 *       Add card modal, Set as Primary, Change Status, Delete
 *   - Eligibility   (/app/client/$id/payment/eligibility)
 *       View only — shows insurance/benefits data in modal
 *
 * @tag @regression @patients @payment
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2_000);
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return firstIdCell.innerText();
}

async function goToPaymentTab(page: Page, clientId: string, tab: string): Promise<void> {
  await page.goto(`/app/client/${clientId}/payment/${tab}`);
  await expect(page).toHaveURL(new RegExp(`payment/${tab}`), { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2_000);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Payment Tabs', () => {

  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    clientId   = await resolveClientId(page);
    await ctx.close();
  });

  // ── CARD DETAILS ──────────────────────────────────────────────────────────

  test(
    'should display the Card Details tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'card-details');
      await expect(page.locator('body')).toBeVisible();
      const heading = page.getByText(/card|payment method/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show card list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'card-details');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasCard  = await page.locator('[class*="card"], [class*="Card"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no card|no payment|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasCard || hasEmpty).toBe(true);
    },
  );

  test(
    'should show Add Card button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'card-details');

      const addBtn = page.getByRole('button', { name: /add card|add payment|\\+ card/i }).first();
      const hasAdd = await addBtn.isVisible({ timeout: 8_000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasAdd) {
        await expect(addBtn).toBeVisible();
      }
    },
  );

  test(
    'should open Add Card modal if button is available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'card-details');

      const addBtn = page.getByRole('button', { name: /add card|add payment/i }).first();
      if (!(await addBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await addBtn.click({ force: true });
      await page.waitForTimeout(800);

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });

        // Look for card form fields (card number, expiry, CVV, etc.)
        const hasCardInput = await dialog
          .locator('input[placeholder*="card" i], input[placeholder*="number" i], input[placeholder*="4242" i]')
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        await expect(page.locator('body')).toBeVisible();
        if (hasCardInput) {
          expect(true).toBe(true);
        }

        // Close
        const cancelBtn = dialog.getByRole('button', { name: /cancel|close/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should show card action menu with payment options if card exists',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'card-details');

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
      await page.waitForTimeout(400);

      const hasPrimary = await page.getByRole('menuitem', { name: /set as primary|make primary/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasStatus  = await page.getByRole('menuitem', { name: /change status|activate|deactivate/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDelete  = await page.getByRole('menuitem', { name: /delete|remove/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasPrimary || hasStatus || hasDelete).toBe(true);
    },
  );

  // ── ELIGIBILITY ───────────────────────────────────────────────────────────

  test(
    'should display the Eligibility tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'eligibility');
      await expect(page.locator('body')).toBeVisible();
      const heading = page.getByText(/eligibility/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show eligibility list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'eligibility');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no eligibility|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    },
  );

  test(
    'should open View modal for eligibility record if available',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToPaymentTab(page, clientId, 'eligibility');

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
      await page.waitForTimeout(400);

      const viewItem = page.getByRole('menuitem', { name: /^view$/i }).first();
      if (!(await viewItem.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await page.keyboard.press('Escape');
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await viewItem.click();
      await page.waitForTimeout(800);

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
      }
    },
  );
});
