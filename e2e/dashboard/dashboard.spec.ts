import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Therapist Dashboard E2E Tests
 *
 * Covers:
 *  - Dashboard page loads after login
 *  - Dashboard widgets / summary cards are visible
 *  - Navigation sidebar is accessible from dashboard
 *
 * Actual route: /app/dashboard
 *
 * No data-testid attributes in app — use role/text/URL selectors.
 *
 * @tag @regression @dashboard
 */

test.describe('Therapist Dashboard', () => {
  test(
    'should display the therapist dashboard page @smoke',
    async ({ page }) => {
      // GIVEN: Authenticated therapist navigates to the dashboard
      await page.goto('/app/dashboard');

      // THEN: URL confirms we are on the dashboard
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

      // AND: The page renders
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should show dashboard content — widgets or summary cards @smoke',
    async ({ page }) => {
      // GIVEN: Authenticated therapist is on the dashboard
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

      // THEN: Dashboard has visible content (cards, headings, or stat counters)
      const dashboardContent = page
        .getByRole('heading')
        .or(page.locator('[class*="card"],[class*="widget"],[class*="stat"]').first())
        .or(page.getByText(/appointment|patient|client|today/i).first());
      await expect(dashboardContent.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should have app-level navigation accessible from dashboard',
    async ({ page }) => {
      // GIVEN: Authenticated therapist is on the dashboard
      await page.goto('/app/dashboard');
      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });

      // THEN: Sidebar / nav links to core modules are present
      const navLink = page
        .getByRole('link', { name: /calendar|appointment|client|patient|billing|setting/i })
        .or(page.getByText(/calendar|appointment|client|billing/i).first());
      await expect(navLink.first()).toBeVisible({ timeout: 10_000 });
    },
  );
});
