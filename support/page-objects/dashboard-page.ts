import { type Page, type Locator, expect } from '@playwright/test';

/**
 * PSYNAPSYS Staff App Shell Page Object
 *
 * Actual routes (from src/routes/_authenticated/app/_layout.tsx):
 *   - /app/dashboard   → Home/Dashboard
 *   - /app/client      → Clients list  (sidebar: "Clients")
 *   - /app/calendar    → Calendar       (sidebar: "Calendar")
 *   - /app/billing     → Billing        (sidebar: "Billing")
 *   - /app/tasks       → Tasks          (sidebar: "Tasks")
 *   - /app/setting     → Settings
 *
 * Staff login redirects to /app/setting/profile first (from root route logic).
 * No data-testid attributes in the app — use role/text selectors.
 */
export class DashboardPage {
  readonly page: Page;

  // Sidebar navigation links (match nav label text exactly)
  readonly navClients: Locator;
  readonly navCalendar: Locator;
  readonly navBilling: Locator;
  readonly navTasks: Locator;
  readonly navSettings: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navClients = page.getByRole('link', { name: 'Clients' });
    this.navCalendar = page.getByRole('link', { name: 'Calendar' });
    this.navBilling = page.getByRole('link', { name: 'Billing' });
    this.navTasks = page.getByRole('link', { name: 'Tasks' });
    this.navSettings = page.getByRole('link', { name: 'Settings' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/app/dashboard');
    await expect(this.page).toHaveURL(/\/app\/dashboard/);
  }

  async isLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/app\//);
    // Sidebar should always be visible once app shell is mounted
    await expect(this.navClients).toBeVisible({ timeout: 15_000 });
  }

  async navigateToClients(): Promise<void> {
    await this.navClients.click();
    await expect(this.page).toHaveURL(/\/app\/client/);
  }

  async navigateToCalendar(): Promise<void> {
    await this.navCalendar.click();
    await expect(this.page).toHaveURL(/\/app\/calendar/);
  }
}
