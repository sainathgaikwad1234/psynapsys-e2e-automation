import { test, expect } from '../../support/merged-fixtures';
import { LoginPage } from '../../support/page-objects/login-page';

/**
 * PSYNAPSYS — Authentication E2E Tests
 *
 * Covers:
 *  - Successful login → /app/ redirect (staff)
 *  - Invalid credentials → error message
 *  - Empty form validation
 *  - Redirect to login when unauthenticated
 *
 * IMPORTANT: These tests must run WITHOUT pre-loaded auth storage state,
 * so the login form is actually visible. The therapist-chrome project
 * provides a storageState by default; we override it here to empty.
 *
 * Actual login route: /auth/login
 * Post-login route (staff): /app/setting/profile or /app/dashboard
 *
 * @tag @smoke @auth
 */

// Clear any project-level storage state — auth tests must start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

const VALID_EMAIL = process.env.TEST_THERAPIST_EMAIL || '';
const VALID_PASSWORD = process.env.TEST_THERAPIST_PASSWORD || '';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page — should be accessible when unauthenticated
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test(
    'should login successfully with valid credentials and redirect to app @smoke',
    async ({ page }) => {
      // GIVEN: User is on the login page
      const loginPage = new LoginPage(page);
      await expect(loginPage.emailInput).toBeVisible();

      // WHEN: User enters valid credentials and submits
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD);

      // THEN: User is redirected to the staff app (any /app/ route)
      // Staff login redirects to /app/setting/profile (from root route logic)
      await expect(page).toHaveURL(/\/app\//, { timeout: 20_000 });
    },
  );

  test(
    'should show error message with invalid credentials @smoke',
    // skipNetworkMonitoring: POST /api/auth/login returns 400 for invalid creds — expected
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      // GIVEN: User is on the login page
      const loginPage = new LoginPage(page);

      // WHEN: User enters invalid credentials
      await loginPage.login('invalid@example.com', 'WrongPassword123!');

      // THEN: An error indicator is displayed and user stays on login page
      await loginPage.expectError();
      await expect(page).toHaveURL(/\/auth\/login/);
    },
  );

  test(
    'should show validation error when submitting empty form',
    async ({ page }) => {
      // GIVEN: User is on the login page with empty fields
      const submitButton = page.getByRole('button', { name: 'Sign In' });

      // WHEN: User clicks submit without filling the form
      await submitButton.click();

      // THEN: Validation errors appear (Formik / Yup validation)
      await expect(page.getByText(/email.*required|required/i).first()).toBeVisible({
        timeout: 5_000,
      });
    },
  );

  test(
    'should redirect unauthenticated users to login when accessing protected route',
    async ({ browser }) => {
      // GIVEN: A new browser context without any stored auth state
      const freshContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
      const page = await freshContext.newPage();

      // WHEN: User directly navigates to a protected route
      await page.goto('/app/dashboard');

      // THEN: User is redirected to login page
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15_000 });

      await freshContext.close();
    },
  );
});
