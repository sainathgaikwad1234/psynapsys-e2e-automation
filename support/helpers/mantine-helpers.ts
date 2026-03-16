/**
 * PSYNAPSYS — Mantine UI Helpers
 *
 * Centralised helpers for interacting with Mantine v7 components in Playwright.
 * Previously copy-pasted into 30+ spec files — now maintained in one place.
 *
 * Background:
 *  - Mantine LoadingOverlay sits on top of form fields and NEVER clears in some dialogs.
 *  - Mantine Select/MultiSelect renders options in a portal (outside the dialog DOM).
 *  - Pressing Escape inside a Mantine dropdown closes the ENTIRE dialog, not just the dropdown.
 *  - Mantine Dropzone wraps react-dropzone — setInputFiles() triggers input but NOT onDrop.
 *
 * Usage:
 *   import { disableLoadingOverlay, selectFirstOption, fillMultiSelect } from '../../support/helpers/mantine-helpers';
 */

import type { Page, Locator } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Loading Overlay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Disables pointer-events on ALL visible Mantine LoadingOverlay elements.
 *
 * Call this:
 *  - After a dialog opens
 *  - After any `page.waitForTimeout()` pause (overlay can re-render)
 *  - Before any form field interaction in dialogs with overlays
 *
 * Calling twice in succession is safe — the overlay re-renders after data loads.
 */
export async function disableLoadingOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLElement>('.mantine-LoadingOverlay-overlay')
      .forEach((el) => {
        el.style.pointerEvents = 'none';
      });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Select (single-value combobox)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Selects the first option from a Mantine Select (single-value combobox).
 *
 * Handles:
 *  - Overlay re-renders (disables overlay after opening)
 *  - Portal-rendered options (uses page.getByRole instead of dialog-scoped locator)
 *  - Tab to close without dismissing parent modal
 *
 * @param page   Playwright Page
 * @param input  Locator pointing to the combobox <input> element
 */
export async function selectFirstOption(page: Page, input: Locator): Promise<void> {
  const field = input.first();

  const isVisible = await field.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!isVisible) {
    const desc = await field.evaluate((el) => el.outerHTML.slice(0, 120)).catch(() => '(detached)');
    console.warn(`[selectFirstOption] Field not visible — skipping. Element: ${desc}`);
    return;
  }

  await disableLoadingOverlay(page);
  await field.click({ force: true });

  // Wait for dropdown to render (portal is outside dialog DOM)
  const firstOpt = page.getByRole('option').first();
  const optVisible = await firstOpt.isVisible({ timeout: 3_000 }).catch(() => false);

  if (optVisible) {
    await firstOpt.click({ force: true });
  } else {
    // Fallback: trigger via React fiber event handlers directly
    console.warn('[selectFirstOption] No visible option found — using React fiber fallback');
    const placeholder = await field.getAttribute('placeholder').catch(() => '');
    const fiberFired = await page.evaluate((ph: string) => {
      const el = document.querySelector<HTMLInputElement>(
        `input[placeholder*="${ph}"]`,
      );
      if (!el) return false;
      const listboxId = el.getAttribute('aria-controls');
      const container =
        (listboxId ? document.getElementById(listboxId) : null) ??
        document.querySelector<HTMLElement>(
          '.mantine-Select-options, [data-combobox-option]',
        );
      if (!container) return false;
      const opt = container.querySelector<HTMLElement>('[role="option"]');
      if (!opt) return false;
      const reactKey = Object.keys(opt).find((k) => k.startsWith('__reactProps'));
      if (!reactKey) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (opt as any)[reactKey] as {
        onMouseDown?: (e: MouseEvent) => void;
        onClick?: (e: MouseEvent) => void;
      };
      props.onMouseDown?.(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      props.onClick?.(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, placeholder ?? '');
    if (!fiberFired) {
      console.warn(`[selectFirstOption] React fiber fallback also failed for placeholder="${placeholder}"`);
    }
  }

  // Tab to close dropdown — NEVER use Escape (it closes the parent modal)
  await page.keyboard.press('Tab');
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiSelect
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Selects the first option from a Mantine MultiSelect.
 *
 * Uses pressSequentially to trigger API search, then clicks the first
 * option returned. Falls back to React __reactProps if Playwright click fails.
 *
 * @param page       Playwright Page
 * @param input      Locator pointing to the MultiSelect <input>
 * @param searchChar Character to type to trigger the API/option load (default 'a')
 */
export async function fillMultiSelect(
  page: Page,
  input: Locator,
  searchChar = 'a',
): Promise<void> {
  const field = input.first();

  const isVisible = await field.isVisible({ timeout: 3_000 }).catch(() => false);
  if (!isVisible) {
    const desc = await field.evaluate((el) => el.outerHTML.slice(0, 120)).catch(() => '(detached)');
    console.warn(`[fillMultiSelect] Field not visible — skipping. Element: ${desc}`);
    return;
  }

  await disableLoadingOverlay(page);
  await field.click({ force: true });

  // Type to trigger API-backed search
  await field.pressSequentially(searchChar, { delay: 50 });

  // Wait for API response — options arrive asynchronously
  const firstOpt = page.getByRole('option').first();
  const optVisible = await firstOpt.isVisible({ timeout: 3_000 }).catch(() => false);

  if (optVisible) {
    await firstOpt.click({ force: true });
  } else {
    // Fallback: React fiber direct event dispatch
    console.warn(`[fillMultiSelect] No options after typing "${searchChar}" — using React fiber fallback`);
    const placeholder = await field.getAttribute('placeholder').catch(() => '');
    const fiberFired = await page.evaluate((ph: string) => {
      const el = document.querySelector<HTMLInputElement>(
        `input[placeholder*="${ph}"]`,
      );
      if (!el) return false;
      const listboxId = el.getAttribute('aria-controls');
      const container =
        (listboxId ? document.getElementById(listboxId) : null) ??
        document.querySelector<HTMLElement>(
          '.mantine-MultiSelect-options, [data-combobox-option]',
        );
      if (!container) return false;
      const opt = container.querySelector<HTMLElement>('[role="option"]');
      if (!opt) return false;
      const reactKey = Object.keys(opt).find((k) => k.startsWith('__reactProps'));
      if (!reactKey) return false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props = (opt as any)[reactKey] as {
        onMouseDown?: (e: MouseEvent) => void;
        onClick?: (e: MouseEvent) => void;
      };
      props.onMouseDown?.(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      props.onClick?.(new MouseEvent('click', { bubbles: true, cancelable: true }));
      return true;
    }, placeholder ?? '');
    if (!fiberFired) {
      console.warn(`[fillMultiSelect] React fiber fallback also failed for placeholder="${placeholder}"`);
    }
  }

  // Tab to close dropdown — NEVER Escape (closes parent modal)
  await page.keyboard.press('Tab');
}

// ─────────────────────────────────────────────────────────────────────────────
// Native DOM Click (overlay-immune)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clicks a button inside a dialog using native DOM click — immune to
 * Mantine LoadingOverlay pointer-event blocking.
 *
 * Use when `button.click({ force: true })` still fails because the overlay
 * re-renders between the force-click and the actual browser event dispatch.
 *
 * @param page    Playwright Page
 * @param label   RegExp or string matching button text (tested via textContent)
 */
export async function clickDialogButton(page: Page, label: RegExp | string): Promise<void> {
  await page.evaluate((labelStr: string) => {
    const dlg = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dlg) return;
    const regex = new RegExp(labelStr, 'i');
    const btns = Array.from(dlg.querySelectorAll<HTMLButtonElement>('button'));
    const target = btns.find((b) => regex.test(b.textContent?.trim() ?? ''));
    target?.click();
  }, typeof label === 'string' ? label : label.source);
}

// ─────────────────────────────────────────────────────────────────────────────
// React Input Setter (synthetic event trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets an input value by calling the React internal setter and firing
 * synthetic input + change events. Use when Playwright's `fill()` doesn't
 * trigger React's state update (common with controlled Mantine inputs).
 *
 * @param page        Playwright Page
 * @param placeholder Placeholder text to identify the input element
 * @param value       The new value to set
 */
export async function setReactInputValue(
  page: Page,
  placeholder: string,
  value: string,
): Promise<void> {
  await page.evaluate(
    ({ ph, val }: { ph: string; val: string }) => {
      const input = document.querySelector<HTMLInputElement>(
        `input[placeholder="${ph}"]`,
      );
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { ph: placeholder, val: value },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropzone File Upload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uploads a file to a Mantine Dropzone component.
 *
 * Primary method: DataTransfer drag-drop event simulation (triggers react-dropzone onDrop).
 * Fallback: setInputFiles on the hidden <input type="file"> element.
 *
 * @param page     Playwright Page
 * @param filePath Absolute path to the file to upload
 * @param mimeType MIME type of the file (default: 'image/png')
 * @returns        true if DataTransfer method succeeded, false if fallback was used
 */
export async function uploadToDropzone(
  page: Page,
  filePath: string,
  mimeType = 'image/png',
): Promise<boolean> {
  const fs = await import('fs');
  const path = await import('path');

  const fileBuffer = await fs.promises.readFile(filePath);
  const fileName = path.basename(filePath);
  const base64 = fileBuffer.toString('base64');

  const droppedViaEvent = await page.evaluate(
    async ({ b64, fname, mime }: { b64: string; fname: string; mime: string }) => {
      const dropzone = document.querySelector<HTMLElement>(
        '[class*="mantine-Dropzone-root"]',
      );
      if (!dropzone) return false;
      try {
        const byteArr = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = new File([byteArr], fname, { type: mime });
        const dt = new DataTransfer();
        dt.items.add(file);
        dropzone.dispatchEvent(
          new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
        dropzone.dispatchEvent(
          new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
        dropzone.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
        );
        return true;
      } catch {
        return false;
      }
    },
    { b64: base64, fname: fileName, mime: mimeType },
  );

  if (!droppedViaEvent) {
    const fileInput = page.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(filePath);
    }
  }

  return droppedViaEvent;
}
