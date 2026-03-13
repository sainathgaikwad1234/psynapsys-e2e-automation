import { type Page, type Locator, expect } from '@playwright/test';

/**
 * PSYNAPSYS Login Page Object
 * Encapsulates selectors and interactions for the login flow.
 *
 * Actual app uses Mantine UI — no data-testid attributes.
 * Selectors use role/label/placeholder as resilient alternatives.
 *
 * Login form fields (from src/routes/auth/_layout/login.tsx):
 *   - Email:    <input label="Email" placeholder="enter your email">
 *   - Password: <PasswordInput label="Password" placeholder="Min. 8 characters">
 *   - Submit:   <Button>Sign In</Button>
 */
export class LoginPage {
  readonly page: Page;

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Mantine TextInput with label="Email"
    this.emailInput = page.getByLabel('Email');
    // Mantine PasswordInput with label="Password"
    this.passwordInput = page.getByLabel('Password');
    // Submit button text is "Sign In"
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    // Forgot password link
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.emailInput).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAndExpectRedirect(email: string, password: string, urlPattern: RegExp): Promise<void> {
    await this.login(email, password);
    await expect(this.page).toHaveURL(urlPattern, { timeout: 15_000 });
  }

  /**
   * Expect an error to be visible after failed login.
   * The app may show a Mantine notification (role="alert") or
   * inline form errors. Checks for any visible error indicator.
   */
  async expectError(message?: string): Promise<void> {
    // Mantine Notification uses role="alert"; form field errors are plain text
    const errorLocator = this.page.getByRole('alert').or(
      this.page.getByText(/invalid|incorrect|credentials|no active account|unauthorized/i),
    );
    await expect(errorLocator.first()).toBeVisible({ timeout: 10_000 });
    if (message) {
      await expect(errorLocator.first()).toContainText(message);
    }
  }
}
