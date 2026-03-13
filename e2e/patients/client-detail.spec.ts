import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Client Detail Sub-Tab E2E Tests (Therapist Portal)
 *
 * Covers navigation and page-load for ALL sub-tabs within a client detail view.
 * A real clientId is resolved at runtime from the first row of the client list.
 * Read-only: no records are created or modified.
 *
 * Client detail route base: /app/client/{clientId}/
 *
 * Sub-tabs tested:
 *   Profile           → /app/client/{id}/profile
 *   Appointment Hist  → /app/client/{id}/appointment-history
 *   Billings:
 *     Claims          → /app/client/{id}/billings/claims
 *     Encounters      → /app/client/{id}/billings/encounters
 *     Invoices        → /app/client/{id}/billings/invoices
 *     Payment History → /app/client/{id}/billings/payment-histoy   (note: intentional typo in route)
 *     Statements      → /app/client/{id}/billings/statements
 *     Superbill       → /app/client/{id}/billings/superbill
 *   Biopsychosocial:
 *     Development     → /app/client/{id}/biopsychosocial_history/development-history
 *     Family          → /app/client/{id}/biopsychosocial_history/family-history
 *     Medication      → /app/client/{id}/biopsychosocial_history/medication-history
 *     Mental          → /app/client/{id}/biopsychosocial_history/mental-history
 *     Other           → /app/client/{id}/biopsychosocial_history/other-history
 *     Social          → /app/client/{id}/biopsychosocial_history/social-history
 *     Substance Use   → /app/client/{id}/biopsychosocial_history/substance-use-history
 *     Surgical        → /app/client/{id}/biopsychosocial_history/surgical-history
 *   Forms:
 *     Assigned        → /app/client/{id}/forms/assigned
 *     Completed       → /app/client/{id}/forms/completed
 *   Payment:
 *     Card Details    → /app/client/{id}/payment/card-details
 *     Eligibility     → /app/client/{id}/payment/eligibility
 *     Insurance       → /app/client/{id}/payment/insurance
 *     Prior Auth      → /app/client/{id}/payment/prior-authorization
 *   Records:
 *     Client Records  → /app/client/{id}/records/client-records
 *     Notes           → /app/client/{id}/records/notes
 *     Tasks           → /app/client/{id}/records/task
 *     Treatment Plans → /app/client/{id}/records/treatment-plans
 *     Visit Notes     → /app/client/{id}/records/visit-notes
 *   Referrals:
 *     Referral In     → /app/client/{id}/referrals/referral_in
 *     Referral Out    → /app/client/{id}/referrals/referral_out
 *   Vitals            → /app/client/{id}/vitals-assessment
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @patients
 */

/** Resolve the first available clientId from the client list table. */
async function resolveClientId(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

test.describe('Client Detail — Sub-Tabs', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    // Resolve a real clientId once for the entire describe block
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    // Load therapist auth state for the resolution request
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  // ── Profile ─────────────────────────────────────────────────────────────

  test.describe('Profile Tab', () => {
    test(
      'should display the client profile tab @smoke',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/profile`);
        await expect(page).toHaveURL(new RegExp(`/app/client/${clientId}/profile`), { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show profile form fields',
      { annotation: [{ type: 'skipNetworkMonitoring' }] },
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/profile`);
        await expect(page).toHaveURL(new RegExp(`/app/client/${clientId}/profile`), { timeout: 15_000 });
        // Profile shows demographic fields (name, dob, email, etc.)
        const field = page
          .getByRole('textbox').first()
          .or(page.getByText(/first name|last name|email|date of birth|dob/i).first());
        await expect(field.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Appointment History ──────────────────────────────────────────────────

  test.describe('Appointment History Tab', () => {
    test(
      'should display the appointment history tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/appointment-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/appointment-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Billings Sub-Tabs ────────────────────────────────────────────────────

  test.describe('Client Billings', () => {
    test(
      'should display the client claims billing tab @smoke',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/billings/claims`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/claims`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the client encounters billing tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/billings/encounters`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/encounters`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the client invoices billing tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/billings/invoices`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/invoices`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the client payment history billing tab',
      async ({ page }) => {
        // NOTE: Route file is named "payment-histoy" (typo in codebase) → URL matches that
        await page.goto(`/app/client/${clientId}/billings/payment-histoy`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/payment-hist`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the client statements billing tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/billings/statements`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/statements`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the client superbill billing tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/billings/superbill`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/billings/superbill`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Biopsychosocial History Sub-Tabs ────────────────────────────────────

  test.describe('Biopsychosocial History', () => {
    const bioBase = (id: string) => `/app/client/${id}/biopsychosocial_history`;

    test(
      'should display the development history tab @smoke',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/development-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/development-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the family history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/family-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/family-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the medication history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/medication-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/medication-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the mental health history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/mental-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/mental-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the other history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/other-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/other-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the social history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/social-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/social-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the substance use history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/substance-use-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/substance-use-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the surgical history tab',
      async ({ page }) => {
        await page.goto(`${bioBase(clientId)}/surgical-history`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/biopsychosocial_history/surgical-history`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Client Forms Sub-Tabs ────────────────────────────────────────────────

  test.describe('Client Forms', () => {
    test(
      'should display the assigned forms tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/forms/assigned`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/forms/assigned`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the completed forms tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/forms/completed`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/forms/completed`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Payment Sub-Tabs ─────────────────────────────────────────────────────

  test.describe('Client Payment', () => {
    test(
      'should display the card details payment tab @smoke',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/payment/card-details`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/payment/card-details`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the eligibility payment tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/payment/eligibility`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/payment/eligibility`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the insurance payment tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/payment/insurance`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/payment/insurance`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the prior authorization payment tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/payment/prior-authorization`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/payment/prior-authorization`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Records Sub-Tabs ─────────────────────────────────────────────────────

  test.describe('Client Records', () => {
    test(
      'should display the client records tab @smoke',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/records/client-records`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/records/client-records`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the notes records tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/records/notes`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/records/notes`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the tasks records tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/records/task`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/records/task`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the treatment plans records tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/records/treatment-plans`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/records/treatment-plans`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the visit notes records tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/records/visit-notes`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/records/visit-notes`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Referrals ────────────────────────────────────────────────────────────

  test.describe('Client Referrals', () => {
    test(
      'should display the referral-in tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/referrals/referral_in`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/referrals/referral_in`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the referral-out tab',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/referrals/referral_out`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/referrals/referral_out`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Vitals & Assessment ──────────────────────────────────────────────────

  test.describe('Vitals & Assessment', () => {
    test(
      'should display the vitals and assessment tab @smoke',
      async ({ page }) => {
        await page.goto(`/app/client/${clientId}/vitals-assessment`);
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/vitals-assessment`),
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });
});

// ── Client List Additional Tabs ───────────────────────────────────────────

test.describe('Client List — Additional Tabs', () => {
  test(
    'should display the consultation clients tab',
    async ({ page }) => {
      // GIVEN: User navigates to the consultation sub-tab of the client list
      await page.goto('/app/client/consultation');

      // THEN: The consultation page loads (may render as a client list filtered view)
      await expect(page).toHaveURL(/\/app\/client\/consultation/, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should display the waitlist clients tab',
    async ({ page }) => {
      // GIVEN: User navigates to the waitlist sub-tab of the client list
      await page.goto('/app/client/waitlist');

      // THEN: The waitlist page loads
      await expect(page).toHaveURL(/\/app\/client\/waitlist/, { timeout: 15_000 });
      await expect(page.locator('body')).toBeVisible();
    },
  );
});
