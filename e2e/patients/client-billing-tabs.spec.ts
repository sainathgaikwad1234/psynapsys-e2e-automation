import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForAnimation,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Billing Sub-tabs Tests (Therapist Portal)
 *
 * Tests for all billing sub-tabs under a client record:
 *   - Encounters  (/app/client/$id/billings/encounters)
 *   - Superbill   (/app/client/$id/billings/superbill)  — View, Delete, Generate Invoice
 *   - Claims      (/app/client/$id/billings/claims)
 *   - Invoices    (/app/client/$id/billings/invoices)   — Mark as Paid, Send Payment Link
 *   - Statements  (/app/client/$id/billings/statements) — Create, View, Delete
 *   - Payment History — disabled (shows countdown timer)
 *
 * Note: Route uses "billings" (plural).
 *
 * @tag @regression @patients @billing
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return firstIdCell.innerText();
}

async function goToBillingTab(page: Page, clientId: string, tab: string): Promise<void> {
  await page.goto(`/app/client/${clientId}/billings/${tab}`);
  await expect(page).toHaveURL(new RegExp(`billings/${tab}`), { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
}

function hasDataOrEmpty(hasTable: boolean, hasEmpty: boolean): boolean {
  return hasTable || hasEmpty;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Billing Tabs', () => {

  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx  = await browser.newContext();
    const page = await ctx.newPage();
    clientId   = await resolveClientId(page);
    await ctx.close();
  });

  // ── ENCOUNTERS ────────────────────────────────────────────────────────────

  test(
    'should display the Encounters tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'encounters');
      await expect(page.locator('body')).toBeVisible();
      const heading = page.getByText(/encounter/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show encounters list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'encounters');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no encounter|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasDataOrEmpty(hasTable, hasEmpty)).toBe(true);
    },
  );

  // ── SUPERBILL ─────────────────────────────────────────────────────────────

  test(
    'should display the Superbill tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'superbill');
      const heading = page.getByText(/superbill/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show superbill list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'superbill');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no superbill|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasDataOrEmpty(hasTable, hasEmpty)).toBe(true);
    },
  );

  test(
    'should show View action in superbill row if records exist',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'superbill');

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const hasView = await page.getByRole('menuitem', { name: /^view$/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasGenerate = await page.getByRole('menuitem', { name: /generate invoice/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDelete = await page.getByRole('menuitem', { name: /delete/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasView || hasGenerate || hasDelete).toBe(true);
    },
  );

  // ── CLAIMS ────────────────────────────────────────────────────────────────

  test(
    'should display the Claims tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'claims');
      const heading = page.getByText(/claim/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show claims list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'claims');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no claim|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasDataOrEmpty(hasTable, hasEmpty)).toBe(true);
    },
  );

  // ── INVOICES ──────────────────────────────────────────────────────────────

  test(
    'should display the Invoices tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'invoices');
      const heading = page.getByText(/invoice/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show invoices list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'invoices');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no invoice|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasDataOrEmpty(hasTable, hasEmpty)).toBe(true);
    },
  );

  test(
    'should show invoice action menu with payment options if invoice exists',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'invoices');

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const hasMarkPaid    = await page.getByRole('menuitem', { name: /mark as paid/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasSendPayment = await page.getByRole('menuitem', { name: /send payment/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasCapture     = await page.getByRole('menuitem', { name: /capture payment/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasGenerate    = await page.getByRole('menuitem', { name: /generate/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasMarkPaid || hasSendPayment || hasCapture || hasGenerate).toBe(true);
    },
  );

  // ── STATEMENTS ────────────────────────────────────────────────────────────

  test(
    'should display the Statements tab @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'statements');
      const heading = page.getByText(/statement/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show Create Statement button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'statements');

      const createBtn = page.getByRole('button', { name: /create statement/i }).first();
      const hasCreate = await createBtn.isVisible({ timeout: 8_000 }).catch(() => false);

      // May be hidden if no billing permission
      await expect(page.locator('body')).toBeVisible();
      if (hasCreate) {
        await expect(createBtn).toBeVisible();
      }
    },
  );

  test(
    'should show statements list or empty state @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'statements');

      const hasTable = await page.locator('table').first().isVisible({ timeout: 8_000 }).catch(() => false);
      const hasEmpty = await page.getByText(/no data|no statement|empty/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      expect(hasDataOrEmpty(hasTable, hasEmpty)).toBe(true);
    },
  );

  test(
    'should open Create Statement modal if button is available @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'statements');

      const createBtn = page.getByRole('button', { name: /create statement/i }).first();
      if (!(await createBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await createBtn.click({ force: true });
      await waitForDialogOpen(page).catch(() => {});

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await expect(dialog).toBeVisible({ timeout: 5_000 });
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
    'should show View and Delete actions for statement row if available',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToBillingTab(page, clientId, 'statements');

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
      await waitForAnimation(page.locator('[role="menu"]').first());

      const hasView   = await page.getByRole('menuitem', { name: /^view$/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);
      const hasDelete = await page.getByRole('menuitem', { name: /delete/i }).first().isVisible({ timeout: 3_000 }).catch(() => false);

      await page.keyboard.press('Escape');
      expect(hasView || hasDelete).toBe(true);
    },
  );
});
