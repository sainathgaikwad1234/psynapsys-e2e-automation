import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Tasks E2E Tests (Therapist Portal)
 *
 * Covers navigation and page-load for the tasks management section.
 * Read-only: no tasks are created or modified.
 *
 * Actual route: /app/tasks
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @tasks
 */

test.describe('Tasks', () => {
  test(
    'should display the tasks page @smoke',
    async ({ page }) => {
      // GIVEN: Authenticated therapist navigates to tasks
      await page.goto('/app/tasks');

      // THEN: URL resolves to the tasks page
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      // AND: The page renders
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should show tasks table, list, or empty state @smoke',
    async ({ page }) => {
      // GIVEN: User is on the tasks page
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      // THEN: Task list or empty state is visible
      const content = page
        .locator('table').first()
        .or(page.getByText(/no task|no data|create task/i).first())
        .or(page.locator('[class*="task"],[class*="list"]').first());
      await expect(content.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should have an add / new task action available',
    async ({ page }) => {
      // GIVEN: User is on the tasks page
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      // THEN: A button to add / create a new task is present
      const addBtn = page
        .getByRole('button', { name: /add task|new task|create task|add/i });
      await expect(addBtn.first()).toBeVisible({ timeout: 10_000 });
    },
  );
});
