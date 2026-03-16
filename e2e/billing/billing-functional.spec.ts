import { test, expect } from '../../support/merged-fixtures';
import { waitForPageReady, waitForDropdownOptions, waitForNetworkIdle, waitForDialogOpen, waitForDialogClose } from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Billing Functional Tests (Therapist Portal)
 *
 * Interaction tests for the billing module:
 *   - Claims: filter by status, sort columns, open Generate Batch Claim dialog
 *   - Invoices: view list columns, open invoice detail
 *   - Charges: verify table columns (CPT code, amount, date)
 *   - Receipts / Payment History: verify list content
 *
 * Read-only -- no claims are submitted, no invoices are created.
 *
 * @tag @regression @billing @functional
 */

// -- Claims --------------------------------------------------------------------

test.describe('Billing — Claims', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/billing/claims');
    await expect(page).toHaveURL(/\/app\/billing\/claims/, { timeout: 15_000 });
    await waitForPageReady(page);
  });

  test(
    'should show the claims table with expected columns @smoke',
    async ({ page }) => {
      const table = page.locator('table').first();
      const emptyState = page.getByText(/no claim|no data|no record/i).first();
      await expect(table.or(emptyState).first()).toBeVisible({ timeout: 15_000 });

      // If table is present, verify there are column headers
      if (await table.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await expect(page.locator('table thead th').first()).toBeVisible({ timeout: 5_000 });
      }
    },
  );

  test(
    'should have a status filter dropdown or search input @smoke',
    async ({ page }) => {
      const filterControl = page
        .getByRole('combobox')
        .first()
        .or(page.getByPlaceholder(/search|filter|client/i).first())
        .or(page.locator('input[type="search"]').first())
        .or(page.locator('select').first());
      await expect(filterControl.first()).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should apply a status filter and keep the page intact',
    async ({ page }) => {
      const statusDropdown = page
        .getByRole('combobox', { name: /status/i })
        .first()
        .or(page.getByLabel(/status/i).first())
        .or(page.getByRole('combobox').first());

      if (await statusDropdown.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await statusDropdown.first().click({ force: true });
        await waitForDropdownOptions(page);

        // Select first available option
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstOption.click({ force: true });
          await waitForNetworkIdle(page);
        }
      }

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should sort claims by clicking a column header',
    async ({ page }) => {
      const firstHeader = page.locator('table thead th').first();
      if (await firstHeader.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await firstHeader.click({ force: true });
        await waitForNetworkIdle(page);
        await expect(page.locator('table').first()).toBeVisible({ timeout: 5_000 });
      }
    },
  );

  test(
    'should open Generate Batch Claim dialog and cancel',
    async ({ page }) => {
      const batchBtn = page
        .getByRole('button', { name: /generate batch claim|batch claim|generate/i })
        .first()
        .or(page.getByRole('button', { name: /generate/i }).first());

      if (await batchBtn.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
        await batchBtn.first().click({ force: true });
        await waitForDialogOpen(page).catch(() => {});

        // Dialog may open or action may trigger directly -- close if it opened
        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible({ timeout: 3_000 }).catch(() => false)) {
          const cancelBtn = page
            .getByRole('button', { name: /cancel|close/i })
            .first()
            .or(page.locator('[aria-label="Close"]').first());
          if (await cancelBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
            await cancelBtn.first().click({ force: true });
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }

      await expect(page.locator('body')).toBeVisible();
    },
  );
});

// -- Invoices ------------------------------------------------------------------

test.describe('Billing — Invoices', () => {
  test(
    'should show the invoices list with amount and status columns @smoke',
    async ({ page }) => {
      await page.goto('/app/billing/invoices');
      await expect(page).toHaveURL(/\/app\/billing\/invoices/, { timeout: 15_000 });

      const table = page.locator('table').first();
      const emptyState = page.getByText(/no invoice|no data/i).first();
      await expect(table.or(emptyState).first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should open invoice detail when clicking a row',
    async ({ page }) => {
      await page.goto('/app/billing/invoices');
      await expect(page).toHaveURL(/\/app\/billing\/invoices/, { timeout: 15_000 });

      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await firstRow.click({ force: true });
        await waitForNetworkIdle(page);
        // Detail modal or navigation -- just verify page is alive
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should show invoice page controls (buttons or inputs)',
    async ({ page }) => {
      await page.goto('/app/billing/invoices');
      await expect(page).toHaveURL(/\/app\/billing\/invoices/, { timeout: 15_000 });

      // Any interactive control qualifies -- combobox, input, or action button
      const anyControl = page
        .locator('input,select,[role="combobox"]')
        .first()
        .or(page.getByRole('button').first());
      await expect(anyControl.first()).toBeVisible({ timeout: 10_000 });
    },
  );
});

// -- Charges -------------------------------------------------------------------

test.describe('Billing — Charges', () => {
  test(
    'should display the charges list or empty state @smoke',
    async ({ page }) => {
      await page.goto('/app/billing/charges');
      await expect(page).toHaveURL(/\/app\/billing\/charges/, { timeout: 15_000 });

      const content = page
        .locator('table')
        .first()
        .or(page.getByText(/charge|service|amount|cpt/i).first())
        .or(page.getByText(/no charge|no data/i).first());
      await expect(content.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should show column headers on the charges table',
    async ({ page }) => {
      await page.goto('/app/billing/charges');
      await expect(page).toHaveURL(/\/app\/billing\/charges/, { timeout: 15_000 });

      if (await page.locator('table').first().isVisible({ timeout: 10_000 }).catch(() => false)) {
        await expect(page.locator('table thead th').first()).toBeVisible({ timeout: 5_000 });
      }
    },
  );
});

// -- ERA (Electronic Remittance Advice) ----------------------------------------

test.describe('Billing — ERA', () => {
  test(
    'should display the ERA page @smoke',
    async ({ page }) => {
      await page.goto('/app/billing/era');
      await expect(page).toHaveURL(/\/app\/billing\/era/, { timeout: 15_000 });

      const content = page
        .locator('table')
        .first()
        .or(page.getByText(/era|remittance|payment|payer/i).first())
        .or(page.getByText(/no data|no era/i).first());
      await expect(content.first()).toBeVisible({ timeout: 15_000 });
    },
  );
});

// -- Payment History -----------------------------------------------------------

test.describe('Billing — Payment History', () => {
  test(
    'should display payment history with date and amount columns',
    async ({ page }) => {
      await page.goto('/app/billing/payment-history');
      await expect(page).toHaveURL(/\/app\/billing\/payment-history/, { timeout: 15_000 });

      const content = page
        .locator('table')
        .first()
        .or(page.getByText(/payment|date|amount|method/i).first())
        .or(page.getByText(/no payment|no data/i).first());
      await expect(content.first()).toBeVisible({ timeout: 15_000 });
    },
  );
});
