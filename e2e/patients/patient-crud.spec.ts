import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Patient (Client) CRUD E2E Tests
 *
 * Full Create → Read → Update → Delete cycle for the patients module.
 *
 * Add Client is a 4-tab wizard:
 *   Tab 1 — Client Information : First/Last Name, DOB, Legal Sex, Gender,
 *                                Pronouns, SSN (required for stage=patient),
 *                                Preferred Name
 *   Tab 2 — Contact Information: Phone Type, Mobile, Email Type, Email,
 *                                Address, City, State, Zip, County (API-loaded)
 *   Tab 3 — Payment Information: Self Pay radio → Fixed Charges
 *   Tab 4 — Other              : Communication Mode checkboxes,
 *                                optional Mandatory Forms multiselect
 *
 * Action menu per row (client list): Send Invite | View | Edit | Archive | Delete
 *
 * Key Mantine quirks handled:
 *  - disableLoadingOverlay() before any form interaction
 *  - selectFirstOption() for Mantine Select comboboxes
 *  - County field waits for API response after state selection
 *  - Tab navigation via "Save & Next"; final tab has "Submit"
 *
 * @tag @regression @patients @crud
 */

// ── Unique test data per run ──────────────────────────────────────────────────

const TS             = Date.now();
// Name fields only allow letters — encode last 5 digits of timestamp as A-J letters
const _digitToLetter = (d: string) => String.fromCharCode(65 + parseInt(d));
const SUFFIX         = TS.toString().slice(-5).split('').map(_digitToLetter).join('');
const FIRST_NAME     = `EeFirst${SUFFIX}`;
const LAST_NAME      = `EeLast${SUFFIX}`;
const DOB            = '01/15/1990';
const SSN            = '123-45-6789';
const PREF_NAME      = `EePref${SUFFIX}`;
const PREF_UPDATED   = `EePrefUpd${SUFFIX}`;
const PHONE          = '5551234567';
const EMAIL          = `e2e.patient.${TS}@psynapsys-test.local`;
const ADDRESS        = '123 E2E Test Street';
const CITY           = 'Testville';
const ZIP            = '90001';
const FIXED_CHARGE   = '100';

// ── Shared helpers ────────────────────────────────────────────────────────────

async function disableLoadingOverlay(page: any) {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el: Element) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

/**
 * Click a Mantine Select / combobox and pick the first option.
 * Tries Mantine-specific [data-combobox-option] attribute first (safe — cannot
 * accidentally match wizard tabs or pagination buttons), then falls back to keyboard.
 * Overlay must be disabled first.
 */
async function selectFirstOption(page: any, fieldLocator: any) {
  const field = fieldLocator.first ? fieldLocator.first() : fieldLocator;
  if (!(await field.isVisible({ timeout: 3_000 }).catch(() => false))) return;
  await field.click({ force: true });
  await page.waitForTimeout(600);
  const mantineOpt = page.locator('[data-combobox-option]').first();
  if (await mantineOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await mantineOpt.click({ force: true });
  } else {
    // Keyboard fallback: ArrowDown highlights first option, Enter selects
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(300);
}

/**
 * Click through all remaining wizard tabs (Tab 2 → Tab 4) using "Save & Next",
 * then click the final submit button. Used during Edit flow where Tab 1 data
 * has already been updated.
 */
async function advanceThroughRemainingTabs(page: any) {
  // Each click of "Save & Next" advances one tab; 3 clicks brings us to Tab 4
  for (let i = 0; i < 3; i++) {
    const nextBtn = page.getByRole('button', { name: /save.*next|next/i }).first();
    if (await nextBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1_500);
    }
  }
  // Final submit button on Tab 4
  const submitBtn = page
    .getByRole('button', { name: /submit|save.*send|create patient|create client/i })
    .last();
  if (await submitBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await submitBtn.click();
    await page.waitForTimeout(2_000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe.serial('Patients — Create / Read / Update / Delete', () => {

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should create a new patient through the 4-tab Add Client wizard @smoke',
    async ({ page }) => {
      test.setTimeout(120_000); // 4-tab wizard with waits takes 35-70s under server load
      await page.goto('/app/client');
      await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });

      // ── Open Add Client form ───────────────────────────────────────────────
      const addBtn = page
        .getByRole('button', { name: /add client|new client/i })
        .first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();
      await page.waitForTimeout(1_000);
      await disableLoadingOverlay(page);

      // ── TAB 1: CLIENT INFORMATION ──────────────────────────────────────────

      // First Name (label="First Name", placeholder="Enter First Name")
      await page.getByLabel('First Name').fill(FIRST_NAME);

      // Last Name (label="Last Name", placeholder="Enter Last Name")
      await page.getByLabel('Last Name').fill(LAST_NAME);

      // Date Of Birth (label="Date Of Birth", DatePicker — enter as MM/DD/YYYY)
      const dobInput = page.getByLabel('Date Of Birth').first()
        .or(page.getByPlaceholder('MM/DD/YYYY').first());
      await dobInput.first().click({ force: true });
      await dobInput.first().fill(DOB);
      // Programmatically blur the DOB input to close the calendar popup
      // (clicking headings or other elements may not reliably close the picker)
      await dobInput.first().evaluate((el: HTMLElement) => el.blur());
      await page.waitForTimeout(1_200); // wait for calendar animation to fully finish

      // Helper: click a Mantine Select combobox and pick its first option.
      // Tries data-combobox-option (Mantine v8 specific attribute) first so it cannot
      // accidentally click wizard tabs or pagination. Falls back to ArrowDown+Enter.
      const pickFirstMantineOption = async (inputLocator: any) => {
        const inp = inputLocator.first ? inputLocator.first() : inputLocator;
        if (!(await inp.isVisible({ timeout: 5_000 }).catch(() => false))) return;
        await disableLoadingOverlay(page);
        await inp.scrollIntoViewIfNeeded();
        await inp.click({ force: true });
        await page.waitForTimeout(800); // wait for dropdown animation
        // Mantine v8 options have data-combobox-option; only rendered when dropdown is open
        const mantineOpt = page.locator('[data-combobox-option]').first();
        if (await mantineOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await mantineOpt.click({ force: true });
        } else {
          // Keyboard fallback: ArrowDown moves to first option, Enter selects
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(400);
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(500);
      };

      // Legal Sex (required Mantine Select) — wait extra after it since it's right after DOB
      await pickFirstMantineOption(page.getByRole('textbox', { name: 'Legal Sex' }));
      // Verify Legal Sex is filled; if not, try once more
      const lsVal = await page.getByRole('textbox', { name: 'Legal Sex' }).first().inputValue().catch(() => '');
      if (!lsVal) {
        await pickFirstMantineOption(page.getByRole('textbox', { name: 'Legal Sex' }));
      }

      // Gender (required Mantine Select)
      await pickFirstMantineOption(page.getByLabel('Gender'));

      // Pronouns (Mantine Select)
      await pickFirstMantineOption(page.getByLabel('Pronouns'));

      // SSN — required when stage="patient" (label="SSN", placeholder="Enter SSN Number")
      const ssnInput = page.getByLabel('SSN').first()
        .or(page.getByPlaceholder(/SSN/i).first());
      if (await ssnInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await ssnInput.first().fill(SSN);
      }

      // Preferred Name (label="Preferred Name", placeholder="Enter Preferred Name")
      await page.getByLabel('Preferred Name').fill(PREF_NAME);

      // Fax Number (required on Tab 1 — label="Fax Number", placeholder="Enter fax number")
      const faxInput = page.getByLabel('Fax Number').first()
        .or(page.getByPlaceholder(/fax number|enter fax/i).first());
      if (await faxInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await faxInput.first().fill('5559876543');
      }

      // Save & Next → Tab 2
      await page.getByRole('button', { name: /save.*next|next/i }).first().click();
      await page.waitForTimeout(2_000);

      // ── TAB 2: CONTACT INFORMATION ─────────────────────────────────────────

      await disableLoadingOverlay(page);

      // Phone Type (label="Phone Type", placeholder="Select")
      await disableLoadingOverlay(page);
      await selectFirstOption(page, page.getByLabel('Phone Type').first());

      // Mobile Number (label="Mobile Number", ContactPhoneInput component)
      const phoneInput = page.getByLabel('Mobile Number').first();
      if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await phoneInput.fill(PHONE);
      }

      // Email Type (label="Email Type", placeholder="Select")
      await disableLoadingOverlay(page);
      await selectFirstOption(page, page.getByLabel('Email Type').first());

      // Email — use placeholder to avoid matching the "Email Type" Select (also labeled "Email")
      const emailInput = page.getByPlaceholder('Enter Email').first()
        .or(page.getByLabel('Email').nth(1));
      if (await emailInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await emailInput.first().fill(EMAIL);
      }

      // Address Line 1 (label="Address Line 1", placeholder="Enter Address Line 1")
      await page.getByLabel('Address Line 1').first().fill(ADDRESS);

      // City (label="City", placeholder="Enter City" — letters only in validation)
      await page.getByLabel('City').first().fill(CITY);

      // State (label="State", placeholder="Select State")
      await disableLoadingOverlay(page);
      await selectFirstOption(page, page.getByPlaceholder('Select State').first());
      await page.waitForTimeout(1_500); // wait for county API call

      // Zip Code (label="Zip Code", placeholder="Enter Zip Code")
      await page.getByLabel('Zip Code').first().fill(ZIP);

      // County (label="County", placeholder="Select or Create County")
      // Loaded via API after state selection — wait then pick first available option
      const countyField = page.getByLabel('County').first()
        .or(page.getByPlaceholder(/select.*county|create county/i).first());
      if (await countyField.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await countyField.first().click({ force: true });
        await page.waitForTimeout(1_000); // wait for API-loaded county options
        const countyOpt = page.locator('[data-combobox-option]').first();
        if (await countyOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await countyOpt.click({ force: true });
        } else {
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(300);
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(300);
      }

      // Save & Next → Tab 3
      await page.getByRole('button', { name: /save.*next|next/i }).first().click();
      await page.waitForTimeout(2_000);

      // ── TAB 3: PAYMENT INFORMATION ─────────────────────────────────────────

      await disableLoadingOverlay(page);

      // Preferred Payment Method: Radio Group — select "Self" (value="self_pay", label="Self")
      const selfRadio = page.getByRole('radio', { name: /^self$/i }).first()
        .or(page.getByLabel(/^self$/i).first());
      if (await selfRadio.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        if (!(await selfRadio.first().isChecked().catch(() => false))) {
          await selfRadio.first().click({ force: true });
        }
        await page.waitForTimeout(500);
      }

      // Fixed Charges (label="Fixed Charges", placeholder="Enter Fixed Charges", NumberInput)
      const fixedInput = page.getByLabel('Fixed Charges').first()
        .or(page.getByPlaceholder(/fixed charge/i).first());
      if (await fixedInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await fixedInput.first().fill(FIXED_CHARGE);
      }

      // Save & Next → Tab 4
      await page.getByRole('button', { name: /save.*next|next/i }).first().click();
      await page.waitForTimeout(2_000);

      // ── TAB 4: OTHER ──────────────────────────────────────────────────────

      await disableLoadingOverlay(page);

      // Communication Mode: Checkbox group (Email | SMS/Text | Phone Call)
      // At least one is required — ensure "Email" is checked
      const emailCheckbox = page.getByRole('checkbox', { name: /^email$/i }).first();
      if (await emailCheckbox.isVisible({ timeout: 5_000 }).catch(() => false)) {
        if (!(await emailCheckbox.isChecked().catch(() => false))) {
          await emailCheckbox.click({ force: true });
        }
      }

      // Mandatory Forms (label="Select Forms to Assign") — optional, pick first if available
      const formsField = page.getByLabel('Select Forms to Assign').first()
        .or(page.getByPlaceholder(/select forms/i).first());
      if (await formsField.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await formsField.first().click({ force: true });
        await page.waitForTimeout(600);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        const firstForm = page.locator('[data-combobox-option]').first()
          .or(page.locator('[role="option"]:visible').first());
        if (await firstForm.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await firstForm.click({ force: true });
        } else {
          await page.keyboard.press('Enter');
        }
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
      }

      // Submit — final button on Tab 4
      const submitBtn = page
        .getByRole('button', { name: /submit|save.*send|create patient|create client/i })
        .last();
      await expect(submitBtn).toBeVisible({ timeout: 8_000 });
      await submitBtn.click();

      // Wait for success — modal closes or redirect occurs
      await page.waitForTimeout(3_000);

      // Verify form is no longer visible (closed on success)
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).not.toBeVisible({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should find the created patient in the client list by searching last name',
    async ({ page }) => {
      await page.goto('/app/client');
      await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
      await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

      // Search input (placeholder="Search")
      const searchInput = page.getByPlaceholder('Search').first()
        .or(page.getByRole('searchbox').first());
      await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
      await searchInput.first().fill(LAST_NAME);
      await page.waitForTimeout(1_500);

      // Patient row should appear
      await expect(page.getByText(LAST_NAME).first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should display the patient profile when clicking the client name',
    async ({ page }) => {
      await page.goto('/app/client');
      await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

      // Search
      const searchInput = page.getByPlaceholder('Search').first()
        .or(page.getByRole('searchbox').first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(LAST_NAME);
        await page.waitForTimeout(1_500);
      }

      // Click the name cell (column 1) to navigate to client dashboard
      const clientRow = page.locator('table tbody tr')
        .filter({ hasText: LAST_NAME })
        .first();
      await expect(clientRow).toBeVisible({ timeout: 10_000 });
      await clientRow.locator('td').nth(1).click({ force: true });

      // Should land on /app/client/{id}/dashboard
      await expect(page).toHaveURL(/\/app\/client\/\d+\/dashboard/, { timeout: 15_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the patient preferred name via the action menu Edit option',
    async ({ page }) => {
      await page.goto('/app/client');
      await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
      await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

      // Search for patient
      const searchInput = page.getByPlaceholder('Search').first()
        .or(page.getByRole('searchbox').first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(LAST_NAME);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(LAST_NAME).first()).toBeVisible({ timeout: 10_000 });

      // Open action menu → Edit
      const clientRow = page.locator('table tbody tr')
        .filter({ hasText: LAST_NAME })
        .first();
      const actionBtn = clientRow.locator('button').last();
      await actionBtn.click({ force: true });
      await page.waitForTimeout(500);

      const editItem = page.getByRole('menuitem', { name: /^edit$/i }).first();
      await expect(editItem).toBeVisible({ timeout: 5_000 });
      await editItem.click({ force: true });
      await page.waitForTimeout(1_500);

      // Edit Client modal opens — Tab 1 (Client Info) is shown with pre-filled data
      await disableLoadingOverlay(page);

      // Update Preferred Name on Tab 1
      const prefNameInput = page.getByLabel('Preferred Name').first();
      await expect(prefNameInput).toBeVisible({ timeout: 8_000 });
      await prefNameInput.clear();
      await prefNameInput.fill(PREF_UPDATED);

      // Advance through remaining tabs and submit
      await advanceThroughRemainingTabs(page);

      // Modal should close on success
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).not.toBeVisible({ timeout: 15_000 });
    },
  );

  // ── DELETE ──────────────────────────────────────────────────────────────────

  test(
    'should delete the created patient via the action menu Delete option',
    async ({ page }) => {
      await page.goto('/app/client');
      await expect(page).toHaveURL(/\/app\/client/, { timeout: 15_000 });
      await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });

      // Search for patient (now has updated preferred name but same last name)
      const searchInput = page.getByPlaceholder('Search').first()
        .or(page.getByRole('searchbox').first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(LAST_NAME);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(LAST_NAME).first()).toBeVisible({ timeout: 10_000 });

      // Open action menu → Delete
      const clientRow = page.locator('table tbody tr')
        .filter({ hasText: LAST_NAME })
        .first();
      const actionBtn = clientRow.locator('button').last();
      await actionBtn.click({ force: true });
      await page.waitForTimeout(500);

      const deleteItem = page.getByRole('menuitem', { name: /^delete$/i }).first();
      await expect(deleteItem).toBeVisible({ timeout: 5_000 });
      await deleteItem.click({ force: true });
      await page.waitForTimeout(500);

      // Confirm Deletion modal (title: "Confirm Deletion")
      const confirmBtn = page
        .getByRole('button', { name: /^delete$|^confirm$|^yes$/i })
        .last();
      if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await page.waitForTimeout(2_000);

      // Cleared search — patient must not appear in active list
      await searchInput.first().clear();
      await searchInput.first().fill(LAST_NAME);
      await page.waitForTimeout(1_500);

      await expect(
        page.getByText(LAST_NAME).first(),
      ).not.toBeVisible({ timeout: 10_000 });
    },
  );
});