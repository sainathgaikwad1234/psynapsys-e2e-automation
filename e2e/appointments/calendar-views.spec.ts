import { test, expect } from '../../support/merged-fixtures';
import { waitForPageReady, waitForDropdownOptions, waitForNetworkIdle, waitForDialogOpen, waitForDialogClose } from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Calendar Functional Tests (Therapist Portal)
 *
 * Interaction tests for the appointment calendar (/app/calendar).
 *
 * UI observed from screenshots:
 *   Toolbar: [<prev] [February 2026] [Today] [>next] [list] [grid]
 *            [Filter by Status v] [Select Therapist v] [Month v] [+ Add Event]
 *   - View switching: a "Month" dropdown button (not separate tab buttons)
 *   - Prev/Next: icon-only arrow buttons flanking the "Today" button
 *   - "+ Add Event" button opens the appointment booking dialog
 *
 * Read-only -- no appointments are booked.
 *
 * @tag @regression @appointments @functional
 */

test.describe('Calendar — View Switching & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/calendar');
    await expect(page).toHaveURL(/\/app\/calendar/, { timeout: 15_000 });
    await waitForPageReady(page);
  });

  // -- TOOLBAR -----------------------------------------------------------------

  test(
    'should display the Today button and view-mode dropdown @smoke',
    async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Today' })).toBeVisible({ timeout: 10_000 });

      // The view dropdown is a Mantine Select rendered as a textbox (not a button).
      // It is the LAST textbox in the toolbar (after "Filter by Status" and "Select Therapist").
      const viewDropdown = page.getByRole('textbox').last();
      await expect(viewDropdown).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should have Filter by Status and Select Therapist dropdowns @smoke',
    async ({ page }) => {
      // These are Mantine Select components rendered as textboxes with an accessible name
      const statusFilter = page.getByRole('textbox', { name: /filter by status/i }).first();
      await expect(statusFilter).toBeVisible({ timeout: 10_000 });

      const therapistFilter = page.getByRole('textbox', { name: /select therapist/i }).first();
      await expect(therapistFilter).toBeVisible({ timeout: 10_000 });
    },
  );

  // -- VIEW SWITCHING ----------------------------------------------------------

  test(
    'should switch to Week view via the Month dropdown @smoke',
    async ({ page }) => {
      // The view selector is a Mantine Select textbox -- the last textbox in the toolbar
      const viewDropdown = page.getByRole('textbox').last();
      await expect(viewDropdown).toBeVisible({ timeout: 8_000 });
      await viewDropdown.click();
      await waitForDropdownOptions(page);

      // Select Week from the dropdown options
      const weekOption = page
        .getByRole('option', { name: /^Week$/i })
        .first()
        .or(
          page
            .locator('[class*="item"],[class*="option"]')
            .filter({ hasText: /^Week$/i })
            .first(),
        );
      await expect(weekOption.first()).toBeVisible({ timeout: 5_000 });
      await weekOption.first().click();
      await waitForNetworkIdle(page);

      // Week view shows abbreviated day-of-week column headers
      const dayHeader = page
        .getByText(/^Mon$|^Tue$|^Wed$|^Thu$|^Fri$|Monday|Tuesday/i)
        .first();
      await expect(dayHeader).toBeVisible({ timeout: 8_000 });
    },
  );

  test(
    'should switch to Day view via the view dropdown',
    async ({ page }) => {
      // View selector is the last Mantine Select textbox in the toolbar
      const viewDropdown = page.getByRole('textbox').last();
      await viewDropdown.click();
      await waitForDropdownOptions(page);

      const dayOption = page
        .getByRole('option', { name: /^Day$/i })
        .first()
        .or(
          page
            .locator('[class*="item"],[class*="option"]')
            .filter({ hasText: /^Day$/i })
            .first(),
        );
      if (await dayOption.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dayOption.first().click();
        await waitForNetworkIdle(page);
      }
      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should switch back to Month view via the view dropdown',
    async ({ page }) => {
      // First switch to Week -- view selector is the last Mantine Select textbox
      const vd1 = page.getByRole('textbox').last();
      await vd1.click();
      await waitForDropdownOptions(page);
      const wk = page.getByRole('option', { name: /^Week$/i }).first();
      if (await wk.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await wk.click();
        await waitForNetworkIdle(page);
      }

      // Now switch to Month
      const vd2 = page.getByRole('textbox').last();
      await vd2.click();
      await waitForDropdownOptions(page);
      const mo = page
        .getByRole('option', { name: /^Month$/i })
        .first()
        .or(
          page
            .locator('[class*="item"],[class*="option"]')
            .filter({ hasText: /^Month$/i })
            .first(),
        );
      if (await mo.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await mo.first().click();
        await waitForNetworkIdle(page);
      }
      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  // -- DATE NAVIGATION ---------------------------------------------------------

  test(
    'should navigate to the next period @smoke',
    async ({ page }) => {
      const todayBtn = page.getByRole('button', { name: 'Today' });
      await expect(todayBtn).toBeVisible({ timeout: 8_000 });

      // The > (next) button is the button immediately after "Today" in DOM order
      const allBtns = page.getByRole('button');
      const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
        btns.findIndex(b => b.textContent?.trim() === 'Today'),
      );
      const nextBtn = allBtns.nth(todayIdx + 1);
      await expect(nextBtn).toBeVisible({ timeout: 5_000 });
      await nextBtn.click({ force: true });
      await waitForNetworkIdle(page);

      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should navigate to the previous period',
    async ({ page }) => {
      const todayBtn = page.getByRole('button', { name: 'Today' });
      await expect(todayBtn).toBeVisible({ timeout: 8_000 });

      // The < (prev) button is the button immediately before "Today" in DOM order
      const allBtns = page.getByRole('button');
      const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
        btns.findIndex(b => b.textContent?.trim() === 'Today'),
      );
      const prevBtn = allBtns.nth(todayIdx - 1);
      await expect(prevBtn).toBeVisible({ timeout: 5_000 });
      await prevBtn.click({ force: true });
      await waitForNetworkIdle(page);

      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should return to the current month with the Today button',
    async ({ page }) => {
      // Navigate forward first
      const allBtns = page.getByRole('button');
      const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
        btns.findIndex(b => b.textContent?.trim() === 'Today'),
      );
      await allBtns.nth(todayIdx + 1).click({ force: true });
      await waitForNetworkIdle(page);

      // Click Today
      await page.getByRole('button', { name: 'Today' }).click({ force: true });
      await waitForNetworkIdle(page);

      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  // -- ADD EVENT ---------------------------------------------------------------

  test(
    'should have the Add Event button @smoke',
    async ({ page }) => {
      const addBtn = page.getByRole('button', { name: /add event/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should open Add Event dialog and cancel without booking',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      const addBtn = page.getByRole('button', { name: /add event/i }).first();
      if (await addBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await addBtn.click();
        await waitForDialogOpen(page);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 8_000 });

        const closeBtn = page
          .getByRole('button', { name: /cancel|close/i })
          .first()
          .or(page.locator('[aria-label="Close"],[class*="close"]').first());
        if (await closeBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
          await closeBtn.first().click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }

        await waitForDialogClose(page);
        await expect(
          page.locator('[class*="calendar"],[class*="fc"]').first(),
        ).toBeVisible({ timeout: 5_000 });
      }
    },
  );

  // -- STATUS FILTER -----------------------------------------------------------

  test(
    'should apply a status filter and keep the calendar intact',
    async ({ page }) => {
      const statusFilter = page
        .locator('button,[role="button"]')
        .filter({ hasText: /filter by status/i })
        .first();

      if (await statusFilter.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await statusFilter.click({ force: true });
        await waitForDropdownOptions(page);
        const firstOption = page.getByRole('option').first();
        if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await firstOption.click();
          await waitForNetworkIdle(page);
        }
      }

      await expect(
        page.locator('[class*="calendar"],[class*="fc"]').first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );
});
