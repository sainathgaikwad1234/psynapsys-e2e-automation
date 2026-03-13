import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Calendar Sub-Tabs E2E Tests (Therapist Portal)
 *
 * Covers navigation and page-load for all appointment-related sub-tabs
 * within the calendar section. Read-only: no appointments are created.
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/calendar/):
 *   - /app/calendar                                         → Calendar main (month/week/day view)
 *   - /app/calendar/appointment                             → Appointments sub-tab list
 *   - /app/calendar/appointment/incomplete-session-note     → Incomplete session notes
 *   - /app/calendar/appointment/to-be-reviewed              → To-be-reviewed appointments
 *   - /app/calendar/appointment/uncharted                   → Uncharted appointments
 *   - /app/calendar/unsigned-visits                         → Unsigned visits
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @appointments
 */

test.describe('Calendar Sub-Tabs', () => {
  test.describe('Appointment Sub-Tab', () => {
    test(
      'should display the appointments list sub-tab @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to the appointment sub-tab
        await page.goto('/app/calendar/appointment');

        // THEN: URL confirms appointment tab loaded
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show appointment list or empty state',
      async ({ page }) => {
        // GIVEN: User is on the appointment sub-tab
        await page.goto('/app/calendar/appointment');
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });

        // THEN: Table, list, or empty-state message is visible
        const content = page
          .locator('table')
          .or(page.getByText(/no appointment|no data/i).first())
          .or(page.locator('[class*="table"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('Incomplete Session Notes', () => {
    test(
      'should display the incomplete session notes tab',
      async ({ page }) => {
        // GIVEN: User navigates to incomplete session notes
        await page.goto('/app/calendar/appointment/incomplete-session-note');

        // THEN: URL resolves within calendar/appointment
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show session note content or empty state',
      async ({ page }) => {
        // GIVEN: User is on the incomplete session notes tab
        await page.goto('/app/calendar/appointment/incomplete-session-note');
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });

        // THEN: Table or empty state is visible
        const content = page
          .locator('table')
          .or(page.getByText(/no.*note|no data|incomplete/i).first())
          .or(page.locator('[class*="table"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  test.describe('To-Be-Reviewed', () => {
    test(
      'should display the to-be-reviewed appointments tab',
      async ({ page }) => {
        // GIVEN: User navigates to to-be-reviewed tab
        await page.goto('/app/calendar/appointment/to-be-reviewed');

        // THEN: URL resolves within calendar/appointment
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Uncharted Appointments', () => {
    test(
      'should display the uncharted appointments tab',
      async ({ page }) => {
        // GIVEN: User navigates to uncharted tab
        await page.goto('/app/calendar/appointment/uncharted');

        // THEN: URL resolves within calendar/appointment
        await expect(page).toHaveURL(/\/app\/calendar\/appointment/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Unsigned Visits', () => {
    test(
      'should display the unsigned visits page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to unsigned visits
        await page.goto('/app/calendar/unsigned-visits');

        // THEN: URL resolves within calendar
        await expect(page).toHaveURL(/\/app\/calendar\/unsigned-visits/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show unsigned visits table or empty state',
      async ({ page }) => {
        // GIVEN: User is on the unsigned visits page
        await page.goto('/app/calendar/unsigned-visits');
        await expect(page).toHaveURL(/\/app\/calendar\/unsigned-visits/, { timeout: 15_000 });

        // THEN: Table, list, or empty-state is visible
        const content = page
          .locator('table')
          .or(page.getByText(/no.*visit|no data|unsigned/i).first())
          .or(page.locator('[class*="table"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });
});
