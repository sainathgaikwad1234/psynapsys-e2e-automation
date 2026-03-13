import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Patient (Client) Management E2E Tests
 *
 * Covers:
 *  - View client/patient list
 *  - Search / filter clients
 *  - Navigate to client profile
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/):
 *   - /app/client           → Client list table
 *   - /app/client/$clientId/dashboard → Client detail (Face Sheet / Timeline)
 *   - /app/client/$clientId/profile   → Client profile
 *
 * No data-testid attributes in app — use table/role/text selectors.
 *
 * @tag @regression @patients
 */

test.describe('Client Management', () => {
  test.describe('Client List', () => {
    test(
      'should display the clients list page @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to the clients section
        await page.goto('/app/client');

        // THEN: URL confirms we are on the clients page
        await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });

        // AND: A data table is visible (clients are listed in a table)
        await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
      },
    );

    test(
      'should load client list with expected columns',
      async ({ page }) => {
        // GIVEN: Authenticated user is on the clients list
        await page.goto('/app/client');
        await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

        // THEN: Standard columns are present
        // Table columns: Client ID, Client Name, DOB, Email ID, Contact Number, Therapist, Status
        await expect(page.getByText(/client name|name/i).first()).toBeVisible();
      },
    );

    test(
      'should have a search or filter input for clients',
      async ({ page }) => {
        // GIVEN: User is on the clients page
        await page.goto('/app/client');
        await expect(page).toHaveURL(/\/app\/client/);
        await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

        // THEN: A search/filter control is available
        const searchInput = page.getByRole('searchbox').or(
          page.getByPlaceholder(/search|filter/i),
        );
        await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
      },
    );
  });

  test.describe('Add Client', () => {
    test(
      'should have an add / new client button on the clients page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to the clients list
        await page.goto('/app/client');
        await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });

        // THEN: An "Add" or "New Client" button is present
        const addButton = page
          .getByRole('button', { name: /add client|new client|add|create/i })
          .first();
        await expect(addButton).toBeVisible({ timeout: 10_000 });
      },
    );
  });

  test.describe('Client Detail', () => {
    test(
      'should navigate to a client dashboard when clicking a client name',
      async ({ page }) => {
        // GIVEN: User is on the clients list with at least one client
        await page.goto('/app/client');
        await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

        // WHEN: User clicks the Client Name text in the second column
        // The name is a Mantine <Text onClick={() => navigate('.../dashboard')}> element —
        // NOT an <a> tag. The row itself has no click handler; only the name cell does.
        const firstRow = page.locator('table tbody tr').first();
        // Wait for real data — first cell must be a numeric Client ID (not "Loading data…")
        await expect(firstRow.locator('td').first()).toHaveText(/^\d+$/, { timeout: 20_000 });
        const nameCell = firstRow.locator('td').nth(1);
        // force:true bypasses Mantine sticky-header occlusion that can block click under load
        await nameCell.click({ force: true });

        // THEN: User is on the client detail dashboard (/app/client/{row.id}/dashboard)
        await expect(page).toHaveURL(/\/app\/client\/\d+\/dashboard/, { timeout: 15_000 });
      },
    );
  });
});
