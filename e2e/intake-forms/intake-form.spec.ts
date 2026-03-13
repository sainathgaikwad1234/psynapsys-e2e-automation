import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Forms E2E Tests (Staff / Therapist Portal)
 *
 * Covers:
 *  - View custom form templates (Settings → Custom Forms)
 *  - Client-specific intake forms (per-client, requires clientId)
 *
 * Actual routes (from src/routes/_authenticated/):
 *   Staff (therapist):
 *     - /app/setting/custom-forms                          → Form template management
 *     - /app/client/$clientId/forms/_layout/intake        → Client's assigned intake forms
 *
 *   Client portal:
 *     - /client-app/forms/not-completed                   → Pending forms (default tab)
 *     - /client-app/forms/completed-forms                 → Completed forms
 *     - /client-app/forms/submit-form/$formAssignmentId   → Fill / submit a form
 *
 * No data-testid attributes in app — use role/text/URL selectors.
 *
 * @tag @regression @intake-forms
 */

test.describe('Forms Management', () => {
  test.describe('Custom Form Templates (Staff)', () => {
    test(
      'should display the custom forms settings page @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to form templates
        await page.goto('/app/setting/custom-forms');

        // THEN: URL confirms we are on the custom-forms settings page
        await expect(page).toHaveURL(/\/app\/setting\/custom-forms/, { timeout: 15_000 });

        // AND: The page renders content
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show form-related content on the custom forms page',
      async ({ page }) => {
        // GIVEN: User is on the custom forms settings page
        await page.goto('/app/setting/custom-forms');
        await expect(page).toHaveURL(/\/app\/setting\/custom-forms/, { timeout: 15_000 });

        // THEN: Some form-related heading or content is visible
        const formsContent = page
          .getByRole('heading', { name: /form/i })
          .or(page.getByText(/custom form|form template|create form/i).first());
        await expect(formsContent.first()).toBeVisible({ timeout: 10_000 });
      },
    );
  });

  test.describe('Client Intake Forms (Staff view)', () => {
    test(
      'should load client intake forms page for a known client',
      async ({ page }) => {
        // GIVEN: User navigates to the clients list
        await page.goto('/app/client');
        await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

        // WHEN: Read the client ID (row.id) from the first column of the first data row
        // The "Client ID" column renders row.id — used in all navigation URLs
        // IMPORTANT: Wait for actual data — table shows "Loading data…" skeleton first
        const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
        await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 10_000 });
        const clientId = (await firstIdCell.innerText()).trim();

        // AND: Navigate directly to that client's intake forms page
        // URL: /app/client/{id}/forms/intake
        // (_layout directories are pathless in TanStack Router — not added to URL)
        await page.goto(`/app/client/${clientId}/forms/intake`);

        // THEN: The intake forms page loads
        await expect(page).toHaveURL(
          new RegExp(`/app/client/${clientId}/forms`),
          { timeout: 15_000 },
        );
      },
    );
  });
});
