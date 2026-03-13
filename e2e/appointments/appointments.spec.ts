import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Appointments E2E Tests (Staff / Therapist Portal)
 *
 * Covers:
 *  - View appointments calendar
 *  - Navigate to appointments list/calendar view
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/):
 *   - /app/calendar       → Full calendar view (main appointments UI)
 *   - /app/appointments   → Appointments list (redirects to calendar tab)
 *
 * No data-testid attributes in app — use role/text/URL selectors.
 *
 * @tag @regression @appointments
 */

test.describe('Appointments', () => {
  test.describe('Appointments Calendar', () => {
    test(
      'should display the appointments/calendar page @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to the calendar
        await page.goto('/app/calendar');

        // THEN: URL confirms we are on the calendar page
        await expect(page).toHaveURL(/\/app\/calendar/, { timeout: 15_000 });

        // AND: The page renders (any visible interactive element)
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should load calendar with navigation controls @smoke',
      async ({ page }) => {
        // GIVEN: User is on the calendar page
        await page.goto('/app/calendar');
        await expect(page).toHaveURL(/\/app\/calendar/, { timeout: 15_000 });

        // THEN: Calendar navigation controls are visible
        // Calendar typically has month/week/day view buttons and prev/next arrows
        const calendarNav = page
          .getByRole('button', { name: /today|month|week|day|prev|next/i })
          .or(page.getByText(/today|month|week|day/i).first());
        await expect(calendarNav.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Appointments via /app/appointments', () => {
    test(
      'should load appointments route and resolve',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to appointments
        // Note: /app/appointments redirects to the calendar tab
        await page.goto('/app/appointments');

        // THEN: Page loads (may redirect to calendar or stay on appointments)
        await expect(page).toHaveURL(/\/app\/(appointments|calendar)/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });
});
