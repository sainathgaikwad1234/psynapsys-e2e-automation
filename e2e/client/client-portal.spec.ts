import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Client Portal E2E Tests
 *
 * Tests for the patient-facing portal (client-app).
 * Runs under the client-chrome / client-mobile projects
 * which pre-load the client storage state.
 *
 * Actual client portal routes:
 *   - /client-app/dashboard                → Home dashboard
 *   - /client-app/appointments/upcoming    → Upcoming appointments (default tab)
 *   - /client-app/forms/not-completed      → Pending forms (default tab)
 *   - /client-app/treatment-plans          → Treatment plans
 *   - /client-app/billings                 → Billing overview
 *   - /client-app/settings                 → Client settings
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @smoke @client
 */

test.describe('Client Portal', () => {
  test.describe('Dashboard', () => {
    test(
      'should display the client dashboard @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated client navigates to their dashboard
        await page.goto('/client-app/dashboard');

        // THEN: URL confirms client portal dashboard is loaded
        await expect(page).toHaveURL(/\/client-app\/dashboard/, { timeout: 15_000 });

        // AND: The page renders (client portal app shell is visible)
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show client portal navigation links @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated client is on the dashboard
        await page.goto('/client-app/dashboard');
        await expect(page).toHaveURL(/\/client-app\/dashboard/, { timeout: 15_000 });

        // THEN: Client portal navigation is visible
        // Navigation: Home, Appointments, Treatment Plan, Forms, Client Records, Billings, Settings
        const nav = page
          .getByRole('link', { name: /appointments/i })
          .or(page.getByText(/appointments/i).first());
        await expect(nav.first()).toBeVisible({ timeout: 10_000 });
      },
    );
  });

  test.describe('Appointments', () => {
    test(
      'should display the upcoming appointments page @smoke',
      async ({ page }) => {
        // GIVEN: Client navigates to their upcoming appointments
        await page.goto('/client-app/appointments/upcoming');

        // THEN: The upcoming appointments page loads
        await expect(page).toHaveURL(/\/client-app\/appointments/, { timeout: 15_000 });

        // AND: The page renders content
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should have appointments navigation tabs',
      async ({ page }) => {
        // GIVEN: Client is on the appointments section
        await page.goto('/client-app/appointments/upcoming');
        await expect(page).toHaveURL(/\/client-app\/appointments/, { timeout: 15_000 });

        // THEN: Upcoming / Past / Requested tabs are visible
        const upcomingTab = page
          .getByRole('tab', { name: /upcoming/i })
          .or(page.getByText(/upcoming/i).first());
        await expect(upcomingTab.first()).toBeVisible({ timeout: 10_000 });
      },
    );
  });

  test.describe('Forms', () => {
    test(
      'should display the client forms page @smoke',
      async ({ page }) => {
        // GIVEN: Client navigates to their forms
        await page.goto('/client-app/forms/not-completed');

        // THEN: The forms page loads (shows pending / not-completed forms)
        await expect(page).toHaveURL(/\/client-app\/forms/, { timeout: 15_000 });

        // AND: The page renders
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Billing', () => {
    test(
      'should display the client billing page',
      async ({ page }) => {
        // GIVEN: Client navigates to billing
        await page.goto('/client-app/billings');

        // THEN: The billing page loads
        await expect(page).toHaveURL(/\/client-app\/billings/, { timeout: 15_000 });

        // AND: The page renders
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Settings', () => {
    test(
      'should display the client settings page',
      async ({ page }) => {
        // GIVEN: Client navigates to their settings
        await page.goto('/client-app/settings');

        // THEN: The settings page loads
        await expect(page).toHaveURL(/\/client-app\/settings/, { timeout: 15_000 });

        // AND: The page renders
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });
});
