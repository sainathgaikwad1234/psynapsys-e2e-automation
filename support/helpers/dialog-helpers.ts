/**
 * PSYNAPSYS — Dialog / Modal Helpers
 *
 * Shared patterns for opening, interacting with, and closing Mantine dialogs.
 * Previously duplicated across 30+ spec files — now in one place.
 *
 * Background:
 *  - All PSYNAPSYS modals are Mantine <Modal> → [role="dialog"] in the DOM.
 *  - A Mantine LoadingOverlay (pointer-events: all) sits over form fields in
 *    many dialogs — must be disabled before interacting with inputs.
 *  - Pressing Escape closes the ENTIRE dialog — use Tab to close dropdowns.
 *  - Cancel / Save buttons inside dialogs can be blocked by the overlay;
 *    use native DOM click via page.evaluate() when force:true still fails.
 *
 * Usage:
 *   import { openDialog, confirmDialog, cancelDialog, getDialogLocator }
 *     from '../../support/helpers/dialog-helpers';
 */

import type { Page, Locator } from '@playwright/test';
import { disableLoadingOverlay } from './mantine-helpers';
import { waitForDialogOpen, waitForDialogClose } from './wait-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Open
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click a trigger button and wait for the dialog to open.
 *
 * Handles:
 *  - Overlay-immune click (force:true)
 *  - Automatic LoadingOverlay disable after dialog opens
 *
 * @param page     Playwright Page
 * @param trigger  Locator for the button that opens the dialog
 * @param timeout  Maximum wait for dialog to appear (default 8 000 ms)
 * @returns        The dialog locator (confirmed visible)
 */
export async function openDialog(
  page: Page,
  trigger: Locator,
  timeout = 8_000,
): Promise<Locator> {
  await trigger.click({ force: true });
  const dialog = await waitForDialogOpen(page, timeout);
  await disableLoadingOverlay(page);
  return dialog;
}

/**
 * Get the currently open [role="dialog"] locator without asserting.
 * Returns undefined if no dialog is open.
 *
 * @param page Playwright Page
 */
export async function getDialogLocator(page: Page): Promise<Locator | undefined> {
  const dialog = page.locator('[role="dialog"]');
  const visible = await dialog.isVisible({ timeout: 1_000 }).catch(() => false);
  return visible ? dialog : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm / Save
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click the primary action button inside the open dialog (Save / Confirm / Submit).
 *
 * Uses native DOM click via page.evaluate() — immune to Mantine LoadingOverlay
 * pointer-event blocking that prevents even `force:true` clicks from landing.
 *
 * @param page   Playwright Page
 * @param label  Text pattern matching the button (default /save|confirm|submit/i)
 */
export async function confirmDialog(
  page: Page,
  label: RegExp | string = /save|confirm|submit/i,
): Promise<void> {
  await disableLoadingOverlay(page);

  const clicked = await _nativeDomClick(page, label);

  if (!clicked) {
    // Fallback: Playwright click on visible button
    const btn = page
      .locator('[role="dialog"]')
      .getByRole('button', {
        name: typeof label === 'string' ? label : label,
      })
      .first();
    await btn.click({ force: true });
  }
}

/**
 * Click the Cancel button inside the open dialog and wait for it to close.
 *
 * Uses native DOM click — overlay-immune.
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait for dialog to close (default 6 000 ms)
 */
export async function cancelDialog(page: Page, timeout = 6_000): Promise<void> {
  await _nativeDomClick(page, /cancel|close|dismiss/i);
  await waitForDialogClose(page, timeout);
}

/**
 * Close a dialog via the × close icon (top-right corner).
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait for dialog to close (default 6 000 ms)
 */
export async function closeDialogIcon(page: Page, timeout = 6_000): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  const closeBtn = dialog.locator('button[aria-label="Close"], button.mantine-Modal-close').first();

  if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeBtn.click({ force: true });
  } else {
    await _nativeDomClick(page, /close/i);
  }

  await waitForDialogClose(page, timeout);
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Delete (two-step dialogs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle a two-step delete confirmation:
 *   1. Click the Delete / Remove trigger on a row (opens confirmation dialog)
 *   2. Click the Confirm / Yes / Delete button inside that confirmation dialog
 *
 * @param page           Playwright Page
 * @param rowDeleteBtn   Locator for the delete button on the row (opens the confirmation)
 * @param confirmLabel   Label of the confirm button (default /confirm|yes|delete/i)
 * @param openTimeout    Time to wait for the confirm dialog to appear (default 6 000 ms)
 * @param closeTimeout   Time to wait for the confirm dialog to close (default 8 000 ms)
 */
export async function confirmDeleteDialog(
  page: Page,
  rowDeleteBtn: Locator,
  confirmLabel: RegExp | string = /confirm|yes|delete/i,
  openTimeout = 6_000,
  closeTimeout = 8_000,
): Promise<void> {
  await rowDeleteBtn.click({ force: true });
  const dialog = await waitForDialogOpen(page, openTimeout);
  await disableLoadingOverlay(page);

  const clicked = await _nativeDomClick(page, confirmLabel);
  if (!clicked) {
    const btn = dialog
      .getByRole('button', { name: typeof confirmLabel === 'string' ? confirmLabel : confirmLabel })
      .first();
    await btn.click({ force: true });
  }

  await waitForDialogClose(page, closeTimeout);
}

// ─────────────────────────────────────────────────────────────────────────────
// Form helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fill a text input inside the open dialog, identified by its label.
 *
 * Disables Mantine LoadingOverlay before interacting — overlay can block
 * pointer events even on text inputs inside dialogs.
 *
 * @param page    Playwright Page (needed to disable overlay)
 * @param dialog  The dialog locator (returned by openDialog)
 * @param label   Label text (string or RegExp) matching the form field
 * @param value   Value to type into the input
 */
export async function fillDialogField(
  page: Page,
  dialog: Locator,
  label: string | RegExp,
  value: string,
): Promise<void> {
  await disableLoadingOverlay(page);
  const input = dialog.getByLabel(label).first();
  await input.click({ force: true });
  await input.fill(value);
}

/**
 * Fill a text input inside the open dialog, identified by its placeholder text.
 *
 * Disables Mantine LoadingOverlay before interacting — overlay can block
 * pointer events even on text inputs inside dialogs.
 *
 * @param page         Playwright Page (needed to disable overlay)
 * @param dialog       The dialog locator
 * @param placeholder  Placeholder text of the input
 * @param value        Value to type
 */
export async function fillDialogPlaceholder(
  page: Page,
  dialog: Locator,
  placeholder: string,
  value: string,
): Promise<void> {
  await disableLoadingOverlay(page);
  const input = dialog.getByPlaceholder(placeholder).first();
  await input.click({ force: true });
  await input.fill(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Click a button inside the open dialog using native DOM click.
 * Returns true if the button was found and clicked, false otherwise.
 */
async function _nativeDomClick(page: Page, label: RegExp | string): Promise<boolean> {
  return page.evaluate((labelStr: string) => {
    const dlg = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dlg) return false;
    const regex = new RegExp(labelStr, 'i');
    const btns = [...dlg.querySelectorAll<HTMLButtonElement>('button')];
    const target = btns.find((b) => regex.test(b.textContent?.trim() ?? ''));
    if (!target) return false;
    target.click();
    return true;
  }, typeof label === 'string' ? label : label.source);
}
