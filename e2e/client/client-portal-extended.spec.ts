import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Client Portal Extended E2E Tests
 *
 * Covers the remaining client-facing portal pages not covered by client-portal.spec.ts.
 * Read-only: no appointments are booked, forms submitted, or payments made.
 *
 * Runs under the 'client-chrome' / 'client-mobile' projects (client storageState).
 *
 * Actual client portal routes:
 *   Home:
 *     - /client-app/home                                  → Home / landing page
 *   Appointments (full coverage):
 *     - /client-app/appointments/past                     → Past appointments
 *     - /client-app/appointments/requested                → Appointment requests
 *     - /client-app/appointments/requested/cancel-requests       → Cancel requests
 *     - /client-app/appointments/requested/reschedule-requests   → Reschedule requests
 *   Forms (full coverage):
 *     - /client-app/forms/completed-forms                 → Completed forms
 *     - /client-app/forms/intake-form                     → Intake form tab
 *   Billings (full coverage):
 *     - /client-app/billings/invoices                     → Invoices tab
 *     - /client-app/billings/payment-history              → Payment history tab
 *     - /client-app/billings/receipts                     → Receipts tab
 *     - /client-app/billings/statements                   → Statements tab
 *     - /client-app/billings/cards                        → Payment cards tab
 *   Client Records:
 *     - /client-app/client-records                        → Clinical records viewer
 *   Treatment Plans:
 *     - /client-app/treatment-plans                       → Treatment plans list
 *   Settings (full coverage):
 *     - /client-app/settings/profile                      → My profile
 *     - /client-app/settings/insurance                    → My insurance
 *     - /client-app/settings/cards                        → My payment cards
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @client
 */

test.describe('Client Portal — Extended Coverage', () => {
  // ── Home ─────────────────────────────────────────────────────────────────

  test.describe('Home', () => {
    test(
      'should display the client home page @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated client navigates to the home page
        await page.goto('/client-app/home');

        // THEN: Home page loads
        await expect(page).toHaveURL(/\/client-app\/home/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show home page content',
      async ({ page }) => {
        await page.goto('/client-app/home');
        await expect(page).toHaveURL(/\/client-app\/home/, { timeout: 15_000 });

        // Expect some meaningful content on the home page
        const content = page
          .getByRole('heading').first()
          .or(page.getByText(/welcome|appointment|upcoming/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Appointments (remaining tabs) ────────────────────────────────────────

  test.describe('Appointments — Past', () => {
    test(
      'should display the past appointments tab @smoke',
      async ({ page }) => {
        await page.goto('/client-app/appointments/past');
        await expect(page).toHaveURL(/\/client-app\/appointments\/past/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show past appointment list or empty state',
      async ({ page }) => {
        await page.goto('/client-app/appointments/past');
        await expect(page).toHaveURL(/\/client-app\/appointments\/past/, { timeout: 15_000 });

        // Appointments are displayed as cards (not a table). Check for:
        // - Status badge (COMPLETED), date text, or empty-state message
        const content = page
          .getByText(/completed|cancelled|no appointment|no data/i).first()
          .or(page.locator('table').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Appointments — Requested', () => {
    test(
      'should display the requested appointments tab @smoke',
      async ({ page }) => {
        await page.goto('/client-app/appointments/requested');
        await expect(page).toHaveURL(/\/client-app\/appointments\/requested/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the cancel requests sub-tab',
      async ({ page }) => {
        await page.goto('/client-app/appointments/requested/cancel-requests');
        await expect(page).toHaveURL(
          /\/client-app\/appointments\/requested\/cancel-requests/,
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the reschedule requests sub-tab',
      async ({ page }) => {
        await page.goto('/client-app/appointments/requested/reschedule-requests');
        await expect(page).toHaveURL(
          /\/client-app\/appointments\/requested\/reschedule-requests/,
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Forms (remaining tabs) ───────────────────────────────────────────────

  test.describe('Forms — Completed', () => {
    test(
      'should display the completed forms tab @smoke',
      async ({ page }) => {
        await page.goto('/client-app/forms/completed-forms');
        await expect(page).toHaveURL(/\/client-app\/forms\/completed-forms/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show completed forms list or empty state',
      async ({ page }) => {
        await page.goto('/client-app/forms/completed-forms');
        await expect(page).toHaveURL(/\/client-app\/forms\/completed-forms/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no.*completed|no form|submitted/i).first())
          .or(page.locator('[class*="form"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Forms — Intake', () => {
    test(
      'should display the intake form tab',
      async ({ page }) => {
        await page.goto('/client-app/forms/intake-form');
        await expect(page).toHaveURL(/\/client-app\/forms\/intake-form/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Billings (remaining tabs) ────────────────────────────────────────────

  test.describe('Billings — Invoices', () => {
    test(
      'should display the billing invoices tab @smoke',
      async ({ page }) => {
        await page.goto('/client-app/billings/invoices');
        await expect(page).toHaveURL(/\/client-app\/billings\/invoices/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Billings — Payment History', () => {
    test(
      'should display the payment history tab',
      async ({ page }) => {
        await page.goto('/client-app/billings/payment-history');
        await expect(page).toHaveURL(/\/client-app\/billings\/payment-history/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Billings — Receipts', () => {
    test(
      'should display the receipts tab',
      async ({ page }) => {
        await page.goto('/client-app/billings/receipts');
        await expect(page).toHaveURL(/\/client-app\/billings\/receipts/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Billings — Statements', () => {
    test(
      'should display the statements tab',
      async ({ page }) => {
        await page.goto('/client-app/billings/statements');
        await expect(page).toHaveURL(/\/client-app\/billings\/statements/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Billings — Cards', () => {
    test(
      'should display the payment cards tab',
      async ({ page }) => {
        await page.goto('/client-app/billings/cards');
        await expect(page).toHaveURL(/\/client-app\/billings\/cards/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Client Records ───────────────────────────────────────────────────────

  test.describe('Client Records', () => {
    test(
      'should display the client records page @smoke',
      async ({ page }) => {
        await page.goto('/client-app/client-records');
        await expect(page).toHaveURL(/\/client-app\/client-records/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show records content or empty state',
      async ({ page }) => {
        await page.goto('/client-app/client-records');
        await expect(page).toHaveURL(/\/client-app\/client-records/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no record|document|upload/i).first())
          .or(page.locator('[class*="record"],[class*="file"],[class*="document"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Treatment Plans ──────────────────────────────────────────────────────

  test.describe('Treatment Plans', () => {
    test(
      'should display the treatment plans page @smoke',
      async ({ page }) => {
        await page.goto('/client-app/treatment-plans');
        await expect(page).toHaveURL(/\/client-app\/treatment-plans/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show treatment plan list or empty state',
      async ({ page }) => {
        await page.goto('/client-app/treatment-plans');
        await expect(page).toHaveURL(/\/client-app\/treatment-plans/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no.*treatment|treatment plan/i).first())
          .or(page.locator('[class*="plan"],[class*="card"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Settings (full tabs) ─────────────────────────────────────────────────

  test.describe('Settings — Profile', () => {
    test(
      'should display the client profile settings page @smoke',
      async ({ page }) => {
        await page.goto('/client-app/settings/profile');
        await expect(page).toHaveURL(/\/client-app\/settings\/profile/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show profile form fields',
      async ({ page }) => {
        await page.goto('/client-app/settings/profile');
        await expect(page).toHaveURL(/\/client-app\/settings\/profile/, { timeout: 15_000 });

        const field = page
          .getByRole('textbox').first()
          .or(page.getByText(/first name|last name|email|phone/i).first());
        await expect(field.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Settings — Insurance', () => {
    test(
      'should display the client insurance settings page @smoke',
      async ({ page }) => {
        await page.goto('/client-app/settings/insurance');
        await expect(page).toHaveURL(/\/client-app\/settings\/insurance/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Settings — Payment Cards', () => {
    test(
      'should display the client payment cards settings page @smoke',
      async ({ page }) => {
        await page.goto('/client-app/settings/cards');
        await expect(page).toHaveURL(/\/client-app\/settings\/cards/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });
});
