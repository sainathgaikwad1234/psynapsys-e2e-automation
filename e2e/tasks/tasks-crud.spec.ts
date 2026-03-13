import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Tasks CRUD E2E Tests (Therapist Portal)
 *
 * Full create → read → delete cycle for the tasks module.
 * A unique timestamp-based title is used so the test data is easy to find and clean up.
 *
 * Task form required fields (discovered from UI):
 *   Title, Assignees, Category, Priority, Due Date
 *
 * Tests run serially to guarantee create → verify → delete order.
 *
 * Key implementation notes (verified via diagnostics):
 * ─ mantine-LoadingOverlay-overlay NEVER clears (display:block, opacity:1 throughout).
 *   Fix: disable pointer-events on it via evaluate() so CDP mouse events reach form fields.
 *
 * ─ Assignees MultiSelect: after disabling the overlay, clicking the input opens the Popover
 *   normally. Type to trigger the API search, then getByRole('option').first() returns the
 *   first VISIBLE option (only the Assignees Popover is open — other dropdowns are display:none).
 *
 * ─ Single Selects (Category, Priority): openSelect() dispatches mousedown+click on the
 *   Mantine combobox textbox element (which has cursor:pointer and onClick). Works reliably.
 *
 * ─ Do NOT press Escape anywhere inside the dialog — it closes the entire modal.
 *
 * @tag @regression @tasks @crud
 */

const TASK_TITLE = `E2E Task ${Date.now()}`;

test.describe.serial('Tasks — Create / Read / Delete', () => {
  // ── OPEN DIALOG ───────────────────────────────────────────────────────────

  test(
    'should open the Add Task dialog @smoke',
    async ({ page }) => {
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      const addBtn = page.getByRole('button', { name: /add task/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    },
  );

  // ── CREATE (fill all required fields) ────────────────────────────────────

  test(
    'should fill all required fields and create the task @smoke',
    async ({ page }) => {
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      // Open dialog
      await page.getByRole('button', { name: /add task/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // ── Disable the LoadingOverlay pointer-events ──────────────────────────
      // Diagnostics confirmed the overlay NEVER clears (display:block, opacity:1).
      // Setting pointer-events:none allows CDP mouse events to reach form fields.
      await page.evaluate(() => {
        document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el: Element) => {
          (el as HTMLElement).style.pointerEvents = 'none';
        });
      });
      await page.waitForTimeout(300);

      // ── Mantine field helpers ──────────────────────────────────────────────
      // Single Select (Category, Priority): dispatch mousedown + click directly
      // on the combobox textbox element (which has cursor:pointer and onClick).
      const openSelect = async (loc: ReturnType<typeof dialog.locator>) => {
        await loc.evaluate((el: HTMLElement) => {
          el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          el.dispatchEvent(new MouseEvent('click',    { bubbles: true, cancelable: true, view: window }));
        });
        await page.waitForTimeout(600);
      };

      // 1. Title — textbox "Title" with placeholder "Enter Title"
      await dialog.getByRole('textbox', { name: /^title$/i }).fill(TASK_TITLE);

      // 2. Assignees (MultiSelect)
      // With overlay pointer-events disabled, clicking the input works normally.
      // Mantine's onFocus/onClick → openDropdown() → Popover visible.
      // Type 'a' to trigger the API search; options render in the Popover.
      // page.getByRole('option').first() returns the first VISIBLE option — only the
      // Assignees Popover is open so it reliably finds the first assignee name.
      const assigneeInput = dialog.locator('input[placeholder*="Select Assignees"]');
      await assigneeInput.waitFor({ state: 'visible', timeout: 8_000 });
      await assigneeInput.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);

      // Click to open the dropdown
      await assigneeInput.click();
      await page.waitForTimeout(300);

      // Type to trigger API search
      await assigneeInput.pressSequentially('a', { delay: 50 });
      await page.waitForTimeout(2_500); // wait for API response + DOM update

      // Pick the first visible [role="option"] — only Assignees Popover is open
      const firstAssigneeOpt = page.getByRole('option').first();
      if (await firstAssigneeOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstAssigneeOpt.click({ force: true });
        await page.waitForTimeout(500);
      } else {
        // Fallback: call React handlers directly on the first option in the listbox
        await page.evaluate(() => {
          const input = document.querySelector('input[placeholder*="Select Assignees"]') as HTMLInputElement | null;
          const listboxId = input?.getAttribute('aria-controls');
          const container = (listboxId ? document.getElementById(listboxId) : null)
            ?? document.querySelector('.mantine-MultiSelect-options');
          if (!container) return;
          const opt = container.querySelector('[role="option"]') as HTMLElement | null;
          if (!opt) return;
          const rk = Object.keys(opt).find(k => k.startsWith('__reactProps'));
          if (!rk) return;
          const props = (opt as any)[rk];
          props.onMouseDown?.(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
          props.onClick?.(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        await page.waitForTimeout(500);
      }

      // Close dropdown: Tab fires blur → combobox.closeDropdown.
      // Do NOT use Escape — it closes the entire modal.
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);

      // 3. Category (Select)
      await openSelect(dialog.getByRole('textbox', { name: /select category/i }));
      const catOption = page.getByRole('option').first();
      if (await catOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await catOption.click();
      }
      await page.waitForTimeout(300);

      // 4. Priority (Select)
      await openSelect(dialog.getByRole('textbox', { name: /select priority/i }));
      const priorOption = page.getByRole('option').first();
      if (await priorOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await priorOption.click();
      }
      await page.waitForTimeout(300);

      // 5. Due Date (DatePickerInput) — dispatch on the calendar icon/parent to open picker
      await dialog
        .getByRole('textbox', { name: /pick due date/i })
        .evaluate((el: HTMLElement) => {
          const parent = el.parentElement;
          if (!parent) return;
          const icon = Array.from(parent.querySelectorAll<HTMLElement>('*')).find(
            (e) => window.getComputedStyle(e).cursor === 'pointer',
          ) || parent;
          icon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
          icon.dispatchEvent(new MouseEvent('click',    { bubbles: true, cancelable: true, view: window }));
        });
      await page.waitForTimeout(800);

      // Pick the last non-disabled, non-outside day in the calendar
      const dayBtn = page
        .locator('[class*="day"]:not([class*="disabled"]):not([class*="outside"])')
        .last();
      if (await dayBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dayBtn.click({ force: true });
      } else {
        const fallbackDay = page.getByRole('button').filter({ hasText: /^\d{1,2}$/ }).last();
        if (await fallbackDay.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await fallbackDay.click({ force: true });
        }
      }
      await page.waitForTimeout(500);

      // Submit
      const submitBtn = dialog
        .getByRole('button', { name: /create and assign task|save|create|submit/i })
        .last();
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });
      await submitBtn.click();

      // Wait for the dialog to close — if it stays open, form validation failed
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // Search for the newly created task (table has 292+ rows without filter)
      const searchInput = page.getByRole('searchbox').first()
        .or(page.getByPlaceholder(/search/i).first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(TASK_TITLE);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── READ ──────────────────────────────────────────────────────────────────

  test(
    'should find the created task in the list using search',
    async ({ page }) => {
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      const searchInput = page.getByRole('searchbox').first()
        .or(page.getByPlaceholder(/search/i).first());
      await expect(searchInput.first()).toBeVisible({ timeout: 10_000 });
      await searchInput.first().fill(TASK_TITLE);
      await page.waitForTimeout(1_500);

      await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should open task detail when clicking the task title',
    async ({ page }) => {
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      const searchInput = page.getByRole('searchbox').first()
        .or(page.getByPlaceholder(/search/i).first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(TASK_TITLE);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });
      await page.getByText(TASK_TITLE).first().click({ force: true });

      const detail = page
        .locator('[role="dialog"]')
        .first()
        .or(page.locator('[class*="detail"],[class*="drawer"],[class*="panel"]').first());
      await expect(detail.first()).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── ARCHIVE (clean-up) ───────────────────────────────────────────────────
  // The Tasks action menu has: Edit | Mark as Completed | Archive.
  // There is no Delete option — Archive removes the task from the active list.

  test(
    'should archive the created task via the action menu',
    async ({ page }) => {
      await page.goto('/app/tasks');
      await expect(page).toHaveURL(/\/app\/tasks/, { timeout: 15_000 });

      const searchInput = page.getByRole('searchbox').first()
        .or(page.getByPlaceholder(/search/i).first());
      if (await searchInput.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await searchInput.first().fill(TASK_TITLE);
        await page.waitForTimeout(1_500);
      }

      await expect(page.getByText(TASK_TITLE)).toBeVisible({ timeout: 15_000 });

      // Action (⋮) button is the last button in the task row
      const taskRow = page.locator('tr').filter({ hasText: TASK_TITLE }).first();
      const actionBtn = taskRow.locator('button').last();
      await actionBtn.click({ force: true });
      await page.waitForTimeout(500);

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
      }

      // Archived task no longer appears in the active tasks list
      await page.waitForTimeout(2_000);
      await expect(page.getByText(TASK_TITLE)).not.toBeVisible({ timeout: 10_000 });
    },
  );
});
