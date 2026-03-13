import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Settings Module E2E Tests (Therapist / Staff Portal)
 *
 * Covers navigation and page-load for all settings sub-pages.
 * Read-only: no settings are modified, no records are created.
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/setting/):
 *   - /app/setting                              → Settings index (→ profile by default)
 *   - /app/setting/profile                      → My profile / account settings
 *   - /app/setting/staff-setting                → Staff list
 *   - /app/setting/availability                 → Provider availability
 *   - /app/setting/work-location                → Work / service locations
 *   - /app/setting/roles-permission             → Roles & permissions
 *   - /app/setting/CPT-code                     → CPT procedure codes
 *   - /app/setting/ICD-10-code                  → ICD-10 diagnosis codes
 *   - /app/setting/custom-forms                 → Custom form templates
 *   - /app/setting/insurance-companies          → Insurance companies / payers
 *   - /app/setting/macros                       → Smart text / macros
 *   - /app/setting/appointment-notifications    → Appointment notification rules
 *   - /app/setting/cancellation-policy          → Cancellation policy
 *   - /app/setting/print-configuration          → Print / document configuration
 *   - /app/setting/audit-logs                   → Audit log viewer
 *   - /app/setting/data-import/CPT-code-import-history-list  → CPT import history
 *   - /app/setting/data-import/ICD-code-import-history        → ICD import history
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @settings
 */

test.describe('Settings Module', () => {
  test.describe('Settings Index', () => {
    test(
      'should load the settings section @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to settings
        await page.goto('/app/setting');

        // THEN: URL resolves to a settings page
        await expect(page).toHaveURL(/\/app\/setting/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── My Profile ───────────────────────────────────────────────────────────

  test.describe('My Profile', () => {
    test(
      'should display the profile settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/profile');
        await expect(page).toHaveURL(/\/app\/setting\/profile/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show profile form fields',
      async ({ page }) => {
        await page.goto('/app/setting/profile');
        await expect(page).toHaveURL(/\/app\/setting\/profile/, { timeout: 15_000 });

        // Profile shows user account fields
        const field = page
          .getByRole('textbox').first()
          .or(page.getByText(/first name|last name|email|phone/i).first());
        await expect(field.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Staff Settings ───────────────────────────────────────────────────────

  test.describe('Staff Settings', () => {
    test(
      'should display the staff list settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/staff-setting');
        await expect(page).toHaveURL(/\/app\/setting\/staff-setting/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show staff table or content',
      async ({ page }) => {
        await page.goto('/app/setting/staff-setting');
        await expect(page).toHaveURL(/\/app\/setting\/staff-setting/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no staff|staff member|therapist/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Availability ─────────────────────────────────────────────────────────

  test.describe('Availability', () => {
    test(
      'should display the availability settings page',
      async ({ page }) => {
        await page.goto('/app/setting/availability');
        await expect(page).toHaveURL(/\/app\/setting\/availability/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Work Location ────────────────────────────────────────────────────────

  test.describe('Work Location', () => {
    test(
      'should display the work location settings page',
      async ({ page }) => {
        await page.goto('/app/setting/work-location');
        await expect(page).toHaveURL(/\/app\/setting\/work-location/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Roles & Permissions ──────────────────────────────────────────────────

  test.describe('Roles & Permissions', () => {
    test(
      'should display the roles and permissions settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/roles-permission');
        await expect(page).toHaveURL(/\/app\/setting\/roles-permission/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show roles list or content',
      async ({ page }) => {
        await page.goto('/app/setting/roles-permission');
        await expect(page).toHaveURL(/\/app\/setting\/roles-permission/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/role|permission|admin|staff/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── CPT Codes ────────────────────────────────────────────────────────────

  test.describe('CPT Codes', () => {
    test(
      'should display the CPT codes settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/CPT-code');
        await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show CPT code list table or empty state',
      async ({ page }) => {
        await page.goto('/app/setting/CPT-code');
        await expect(page).toHaveURL(/\/app\/setting\/CPT-code/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no.*cpt|procedure code|CPT/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── ICD-10 Codes ─────────────────────────────────────────────────────────

  test.describe('ICD-10 Codes', () => {
    test(
      'should display the ICD-10 codes settings page',
      async ({ page }) => {
        await page.goto('/app/setting/ICD-10-code');
        await expect(page).toHaveURL(/\/app\/setting\/ICD-10-code/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Custom Forms ─────────────────────────────────────────────────────────

  test.describe('Custom Forms', () => {
    test(
      'should display the custom forms settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/custom-forms');
        await expect(page).toHaveURL(/\/app\/setting\/custom-forms/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Insurance Companies ──────────────────────────────────────────────────

  test.describe('Insurance Companies', () => {
    test(
      'should display the insurance companies settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/insurance-companies');
        await expect(page).toHaveURL(/\/app\/setting\/insurance-companies/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show insurance companies table or empty state',
      async ({ page }) => {
        await page.goto('/app/setting/insurance-companies');
        await expect(page).toHaveURL(/\/app\/setting\/insurance-companies/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no insurance|insurance company|payer/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Macros ───────────────────────────────────────────────────────────────

  test.describe('Macros', () => {
    test(
      'should display the macros settings page',
      async ({ page }) => {
        await page.goto('/app/setting/macros');
        await expect(page).toHaveURL(/\/app\/setting\/macros/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Appointment Notifications ────────────────────────────────────────────

  test.describe('Appointment Notifications', () => {
    test(
      'should display the appointment notifications settings page',
      async ({ page }) => {
        await page.goto('/app/setting/appointment-notifications');
        await expect(page).toHaveURL(/\/app\/setting\/appointment-notifications/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Cancellation Policy ──────────────────────────────────────────────────

  test.describe('Cancellation Policy', () => {
    test(
      'should display the cancellation policy settings page',
      async ({ page }) => {
        await page.goto('/app/setting/cancellation-policy');
        await expect(page).toHaveURL(/\/app\/setting\/cancellation-policy/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Print Configuration ──────────────────────────────────────────────────

  test.describe('Print Configuration', () => {
    test(
      'should display the print configuration settings page',
      async ({ page }) => {
        await page.goto('/app/setting/print-configuration');
        await expect(page).toHaveURL(/\/app\/setting\/print-configuration/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  // ── Audit Logs ───────────────────────────────────────────────────────────

  test.describe('Audit Logs', () => {
    test(
      'should display the audit logs settings page @smoke',
      async ({ page }) => {
        await page.goto('/app/setting/audit-logs');
        await expect(page).toHaveURL(/\/app\/setting\/audit-logs/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show audit log table or empty state',
      async ({ page }) => {
        await page.goto('/app/setting/audit-logs');
        await expect(page).toHaveURL(/\/app\/setting\/audit-logs/, { timeout: 15_000 });

        const content = page
          .locator('table').first()
          .or(page.getByText(/no.*log|audit trail|activity/i).first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );
  });

  // ── Data Import ──────────────────────────────────────────────────────────

  test.describe('Data Import', () => {
    test(
      'should display the CPT code import history page',
      async ({ page }) => {
        await page.goto('/app/setting/data-import/CPT-code-import-history-list');
        await expect(page).toHaveURL(
          /\/app\/setting\/data-import\/CPT-code-import-history-list/,
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display the ICD code import history page',
      async ({ page }) => {
        await page.goto('/app/setting/data-import/ICD-code-import-history');
        await expect(page).toHaveURL(
          /\/app\/setting\/data-import\/ICD-code-import-history/,
          { timeout: 15_000 },
        );
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });
});
