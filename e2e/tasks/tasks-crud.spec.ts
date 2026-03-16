import { test, expect } from '../../support/merged-fixtures';
import type { Locator } from '@playwright/test';
import {
  disableLoadingOverlay,
  fillMultiSelect,
} from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
  waitForDropdownOptions,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Tasks CRUD E2E Tests (Therapist Portal)
 *
 * Full create → read → archive cycle for the tasks module.
 * A unique timestamp-based title is used so the test data is easy to find and clean up.
 *
 * Task form required fields (discovered from UI):
 *   Title, Assignees, Category, Priority, Due Date
 *
 * Tests run serially to guarantee create → verify → delete order.
 *
 * Key implementation notes (verified via diagnostics):
 * ─ mantine-LoadingOverlay-overlay NEVER clears (display:block, opacity:1 throughout).
 *   Fix: disable pointer-events via disableLoadingOverlay() helper.
 *
 * ─ Assignees MultiSelect: type to trigger API search, then getByRole('option').first()
 *   returns the first VISIBLE option (only the Assignees Popover is open).
 *
 * ─ Single Selects (Category, Priority): dispatch mousedown+click on the combobox
 *   textbox element (which has cursor:pointer and onClick). Works reliably.
 *
 * ─ Do NOT press Escape anywhere inside the dialog — it closes the entire modal.
 *
 * @tag @regression @tasks @crud
 */

const TASK_TITLE = `E2E Task ${Date.now()}`;

/**
 * Dispatch native mousedown + click on an element.
 * Used to open Mantine Select dropdowns that don't respond to Playwright's click.
 */
async function openSelect(loc: Locator): Promise<void> {
  await loc.evaluate((el: HTMLElement) => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
}

test.describe.serial('Tasks — Create / Read / Delete', () => {
  // ── OPEN DIALOG ───────────────────────────────────────────────────────────

  test('should open the Add Task dialog @smoke', async ({ page }) => {
    await page.goto('/app/tasks');
    await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });
    await waitForPageReady(page);

    const addBtn = page.getByRole('button', { name: /add task/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8_000 });
  });

  // ── CREATE (fill all required fields) ────────────────────────────────────

  test('should fill all required fields and create the task @smoke', async ({ page }) => {
    await page.goto('/app/tasks');
    await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });
    await waitForPageReady(page);

    await page.getByRole('button', { name: /add task/i }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await waitForDialogOpen(page, 8_000);
    await disableLoadingOverlay(page);

    // 1. Title
    await dialog.getByRole('textbox', { name: /^title$/i }).fill(TASK_TITLE);

    // 2. Assignees (MultiSelect) — type to trigger API search, pick first result
    const assigneeInput = dialog.locator('input[placeholder*="Select Assignees"]');
    await assigneeInput.waitFor({ state: 'visible', timeout: 8_000 });
    await assigneeInput.scrollIntoViewIfNeeded();
    await fillMultiSelect(page, assigneeInput, 'a');

    // 3. Category (Select) — native dispatch to open
    await openSelect(dialog.getByRole('textbox', { name: /select category/i }));
    const catOption = await waitForDropdownOptions(page, 3_000).catch(() => null);
    if (catOption) await catOption.click();

    // 4. Priority (Select)
    await openSelect(dialog.getByRole('textbox', { name: /select priority/i }));
    const priorOption = await waitForDropdownOptions(page, 3_000).catch(() => null);
    if (priorOption) await priorOption.click();

    // 5. Due Date (DatePickerInput) — open calendar picker, click last available day
    await dialog
      .getByRole('textbox', { name: /pick due date/i })
      .evaluate((el: HTMLElement) => {
        const parent = el.parentElement;
        if (!parent) return;
        const icon =
          Array.from(parent.querySelectorAll<HTMLElement>('*')).find(
            (e) => window.getComputedStyle(e).cursor === 'pointer',
          ) || parent;
        icon.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }),
        );
        icon.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
        );
      });

    // Wait for calendar to render
    const dayBtn = page
      .locator('[class*="day"]:not([class*="disabled"]):not([class*="outside"])')
      .last();
    const dayVisible = await dayBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (dayVisible) {
      await dayBtn.click({ force: true });
    } else {
      const fallbackDay = page
        .getByRole('button')
        .filter({ hasText: /^\d{1,2}$/ })
        .last();
      if (await fallbackDay.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await fallbackDay.click({ force: true });
      }
    }

    // Submit
    const submitBtn = dialog
      .getByRole('button', { name: /create and assign task|save|create|submit/i })
      .last();
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
    await submitBtn.click();

    // Dialog should close on success
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Search for the newly created task
    await _searchTasks(page, TASK_TITLE);
    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
  });

  // ── READ ──────────────────────────────────────────────────────────────────

  test('should find the created task in the list using search', async ({ page }) => {
    await page.goto('/app/tasks');
    await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });
    await waitForPageReady(page);

    const searchInput = page
      .getByRole('searchbox')
      .first()
      .or(page.getByPlaceholder(/search/i).first());
    await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
    await searchInput.first().fill(TASK_TITLE);

    // Wait for filtered results
    await page
      .locator('tr')
      .filter({ hasText: TASK_TITLE })
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .catch(() => {});

    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
  });

  test('should open task detail when clicking the task title', async ({ page }) => {
    await page.goto('/app/tasks');
    await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });
    await waitForPageReady(page);
    await _searchTasks(page, TASK_TITLE);

    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
    await page.getByText(TASK_TITLE).first().click({ force: true });

    const detail = page
      .locator('[role="dialog"]')
      .first()
      .or(page.locator('[class*="detail"],[class*="drawer"],[class*="panel"]').first());
    await expect(detail.first()).toBeVisible({ timeout: 10_000 });
  });

  // ── ARCHIVE (clean-up) ───────────────────────────────────────────────────
  // The Tasks action menu has: Edit | Mark as Completed | Archive.
  // There is no Delete option — Archive removes the task from the active list.

  test('should archive the created task via the action menu', async ({ page }) => {
    await page.goto('/app/tasks');
    await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });
    await waitForPageReady(page);
    await _searchTasks(page, TASK_TITLE);

    await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });

    // Action (⋮) button is the last button in the task row
    const taskRow = page.locator('tr').filter({ hasText: TASK_TITLE }).first();
    const actionBtn = taskRow.locator('button').last();
    await actionBtn.click({ force: true });

    // Click Archive from the action menu
    const archiveItem = page.getByRole('menuitem', { name: /archive/i }).first();
    await expect(archiveItem).toBeVisible({ timeout: 5_000 });
    await archiveItem.click({ force: true });

    // Confirm if a dialog appears
    const confirmBtn = page
      .getByRole('button', { name: /^archive$|^yes$|^confirm$/i })
      .last();
    if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmBtn.click();
      await waitForDialogClose(page, 5_000).catch(() => {});
    }

    // Archived task no longer appears in the active tasks list
    await page
      .locator('tr')
      .filter({ hasText: TASK_TITLE })
      .first()
      .waitFor({ state: 'hidden', timeout: 5_000 })
      .catch(() => {});
    await expect(page.getByText(TASK_TITLE)).not.toBeVisible({ timeout: 10_000 });
  });
});

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _searchTasks(page: import('@playwright/test').Page, term: string): Promise<void> {
  const searchInput = page
    .getByRole('searchbox')
    .first()
    .or(page.getByPlaceholder(/search/i).first());
  if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    await searchInput.first().fill(term);
    await page
      .locator('tr')
      .filter({ hasText: term })
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .catch(() => {});
  }
}
