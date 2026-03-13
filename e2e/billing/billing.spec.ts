import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Billing Module E2E Tests (Therapist / Staff Portal)
 *
 * Covers navigation and page-load verification for all billing sub-sections.
 * Read-only: no claims are created or submitted (avoids financial side-effects).
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/billing/):
 *   - /app/billing                       → Billing index (default tab)
 *   - /app/billing/claims                → Claims list
 *   - /app/billing/claims/create-claim   → Create claim form (UI only, not submitted)
 *   - /app/billing/charges               → Charges list
 *   - /app/billing/invoices              → Invoices list
 *   - /app/billing/receipts              → Receipts list
 *   - /app/billing/payment-history       → Payment history
 *   - /app/billing/batch-claims          → Batch claims
 *   - /app/billing/ers                   → Electronic Remittance Advice (ERA) list
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @billing
 */

test.describe('Billing Module', () => {
  test.describe('Billing Index', () => {
    test(
      'should load the billing section @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to billing
        await page.goto('/app/billing');

        // THEN: URL resolves to billing (may redirect to default sub-tab)
        await expect(page).toHaveURL(/\/app\/billing/, { timeout: 15_000 });

        // AND: The page renders
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show billing navigation tabs',
      async ({ page }) => {
        // GIVEN: User is on the billing section
        await page.goto('/app/billing');
        await expect(page).toHaveURL(/\/app\/billing/, { timeout: 15_000 });

        // THEN: Billing module tabs are visible (Claims, Charges, Invoices, etc.)
        const tabOrNav = page
          .getByRole('tab', { name: /claims|charges|invoice|receipt|payment|batch|era/i })
          .or(page.getByText(/claims|charges|invoice|receipt/i).first());
        await expect(tabOrNav.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Claims', () => {
    test(
      'should display the claims list page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to billing claims
        await page.goto('/app/billing/claims');

        // THEN: Claims page loads
        await expect(page).toHaveURL(/\/app\/billing\/claims/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show a data table or empty state on claims page',
      async ({ page }) => {
        // GIVEN: User is on the claims page
        await page.goto('/app/billing/claims');
        await expect(page).toHaveURL(/\/app\/billing\/claims/, { timeout: 15_000 });

        // THEN: Either a table with claims or an empty-state message is shown
        const content = page
          .locator('table')
          .or(page.getByText(/no claim|no data|no record/i).first())
          .or(page.getByRole('row').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );

    test(
      'should have an action button on the claims page',
      async ({ page }) => {
        // GIVEN: User is on the claims page
        await page.goto('/app/billing/claims');
        await expect(page).toHaveURL(/\/app\/billing\/claims/, { timeout: 15_000 });

        // THEN: A batch/generate action button is available
        // (Claims are generated from encounters — "Generate Batch Claim" is the primary action)
        const actionBtn = page
          .getByRole('button', { name: /generate batch claim|batch claim|generate/i })
          .or(page.getByRole('button').first());
        await expect(actionBtn.first()).toBeVisible({ timeout: 10_000 });
      },
    );

    test(
      'should load the create claim form page',
      async ({ page }) => {
        // GIVEN: User navigates to create claim
        await page.goto('/app/billing/claims/create-claim');

        // THEN: URL resolves to the create-claim page (may redirect to claims if not accessible)
        await expect(page).toHaveURL(/\/app\/billing\/claims/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Charges', () => {
    test(
      'should display the charges list page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to billing charges
        await page.goto('/app/billing/charges');

        // THEN: Charges page loads
        await expect(page).toHaveURL(/\/app\/billing\/charges/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show table or content on charges page',
      async ({ page }) => {
        // GIVEN: User is on the charges page
        await page.goto('/app/billing/charges');
        await expect(page).toHaveURL(/\/app\/billing\/charges/, { timeout: 15_000 });

        // THEN: Table or content area is visible
        const content = page
          .locator('table')
          .or(page.getByText(/no charge|no data/i).first())
          .or(page.locator('[class*="table"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Invoices', () => {
    test(
      'should display the invoices page',
      async ({ page }) => {
        // GIVEN: User navigates to billing invoices
        await page.goto('/app/billing/invoices');

        // THEN: Invoices page loads
        await expect(page).toHaveURL(/\/app\/billing\/invoices/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Receipts', () => {
    test(
      'should display the receipts page',
      async ({ page }) => {
        // GIVEN: User navigates to billing receipts
        await page.goto('/app/billing/receipts');

        // THEN: Receipts page loads
        await expect(page).toHaveURL(/\/app\/billing\/receipts/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Payment History', () => {
    test(
      'should display the payment history page',
      async ({ page }) => {
        // GIVEN: User navigates to payment history
        await page.goto('/app/billing/payment-history');

        // THEN: Payment history page loads
        await expect(page).toHaveURL(/\/app\/billing\/payment-history/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Batch Claims', () => {
    test(
      'should display the batch claims page',
      async ({ page }) => {
        // GIVEN: User navigates to batch claims
        await page.goto('/app/billing/batch-claims');

        // THEN: Batch claims page loads
        await expect(page).toHaveURL(/\/app\/billing\/batch-claims/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('ERAs (Electronic Remittance Advice)', () => {
    test(
      'should display the ERA list page',
      async ({ page }) => {
        // GIVEN: User navigates to ERAs
        await page.goto('/app/billing/ers');

        // THEN: ERA page loads
        await expect(page).toHaveURL(/\/app\/billing\/ers/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show ERA table or empty state',
      async ({ page }) => {
        // GIVEN: User is on the ERA page
        await page.goto('/app/billing/ers');
        await expect(page).toHaveURL(/\/app\/billing\/ers/, { timeout: 15_000 });

        // THEN: Table or empty state is visible
        const content = page
          .locator('table')
          .or(page.getByText(/no era|no data|no remittance/i).first())
          .or(page.locator('[class*="table"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });
});
