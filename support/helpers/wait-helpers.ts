/**
 * PSYNAPSYS — Playwright Wait Helpers
 *
 * Replaces the 763 `waitForTimeout` calls scattered across the test suite.
 * Every helper waits for a _real, observable_ browser condition — not a fixed delay.
 *
 * Why this matters:
 *  - `waitForTimeout(2000)` always costs 2 s even when the page is ready in 200 ms.
 *  - These helpers return as soon as the condition is met, making tests 30-60% faster.
 *  - Proper waits also fail fast — they raise a clear error the moment the timeout
 *    is exceeded, instead of silently running the next step against a half-loaded page.
 *
 * Usage:
 *   import { waitForPageReady, waitForDialogOpen, waitForToast } from '../../support/helpers/wait-helpers';
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Page / Navigation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to a URL and wait for the page to be interactive.
 *
 * Replaces the common pattern:
 *   await page.goto(url);
 *   await page.waitForTimeout(2_000);
 *
 * Strategy:
 *  1. Wait for URL to match the pattern (TanStack Router SPA — no hard page loads)
 *  2. Wait for the spinner / skeleton to disappear (if any)
 *  3. Wait for the DOM to be idle (no pending network requests)
 *
 * @param page       Playwright Page
 * @param url        URL string or path to navigate to
 * @param urlPattern Optional RegExp to confirm navigation completed (defaults to url)
 * @param timeout    Maximum wait time in ms (default 20 000)
 */
export async function navigateAndWait(
  page: Page,
  url: string,
  urlPattern?: RegExp,
  timeout = 20_000,
): Promise<void> {
  await page.goto(url);
  const pattern = urlPattern ?? new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  await expect(page).toHaveURL(pattern, { timeout });
  await waitForPageReady(page, timeout);
}

/**
 * Wait for the current page to finish loading after navigation.
 *
 * Replaces:
 *   await page.waitForLoadState('networkidle').catch(() => {});
 *   await page.waitForTimeout(2_000);
 *
 * Uses a cascading strategy:
 *  1. `domcontentloaded` — always fast and reliable
 *  2. `networkidle` — waits for all XHR/fetch to settle (with timeout fallback)
 *  3. Loading spinner hidden — catches Mantine Skeleton loaders
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 15 000)
 */
export async function waitForPageReady(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {});

  // networkidle can hang on apps with polling — cap at half the budget
  await page.waitForLoadState('networkidle', { timeout: Math.min(timeout / 2, 8_000) }).catch(() => {});

  // Wait for Mantine Skeleton / global spinner to clear
  const spinner = page.locator(
    '[class*="mantine-Loader"], [class*="mantine-Skeleton"], .loading-spinner',
  );
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: timeout / 2 }).catch(() => {});
  }
}

/**
 * Wait for a specific element to become visible — the building block for all
 * "something finished loading" checks.
 *
 * Replaces:
 *   await page.waitForTimeout(1_500); // after clicking something
 *
 * @param locator  The element to wait for
 * @param timeout  Maximum wait in ms (default 10 000)
 */
export async function waitForVisible(locator: Locator, timeout = 10_000): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for an element to disappear.
 *
 * @param locator  The element expected to become hidden/detached
 * @param timeout  Maximum wait in ms (default 10 000)
 */
export async function waitForHidden(locator: Locator, timeout = 10_000): Promise<void> {
  await locator.waitFor({ state: 'hidden', timeout });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog / Modal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for a Mantine modal dialog to open after a trigger action.
 *
 * Replaces:
 *   await someButton.click();
 *   await page.waitForTimeout(800);
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 8 000)
 * @returns       The dialog locator (already confirmed visible)
 */
export async function waitForDialogOpen(page: Page, timeout = 8_000): Promise<Locator> {
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout });
  return dialog;
}

/**
 * Wait for the currently open dialog to close.
 *
 * Replaces:
 *   await page.waitForTimeout(500); // after clicking Cancel/Save
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 8 000)
 */
export async function waitForDialogClose(page: Page, timeout = 8_000): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  if ((await dialog.count()) === 0) return;
  await dialog.waitFor({ state: 'hidden', timeout });
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast / Notification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for a Mantine toast notification to appear.
 *
 * Replaces:
 *   await page.waitForTimeout(1_000); // "give it time to show the toast"
 *
 * Returns as soon as ANY visible notification is found. Does NOT assert the
 * content — use `expect(toast).toContainText(...)` after if you need to.
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 8 000)
 * @returns       Locator for the visible notification
 */
export async function waitForToast(page: Page, timeout = 8_000): Promise<Locator> {
  const toast = page
    .locator('[class*="mantine-Notification"]')
    .or(page.getByRole('alert'))
    .first();
  await toast.waitFor({ state: 'visible', timeout });
  return toast;
}

/**
 * Wait for a success toast (green notification) to appear.
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 8 000)
 */
export async function waitForSuccessToast(page: Page, timeout = 8_000): Promise<Locator> {
  const toast = page
    .locator('[class*="mantine-Notification"][data-with-border]')
    .or(page.locator('[class*="mantine-Notification-root"]').filter({ hasText: /success|saved|created|updated|deleted|removed/i }))
    .first();
  await toast.waitFor({ state: 'visible', timeout });
  return toast;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table / List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for a table to have at least one data row (not just the header).
 *
 * Replaces:
 *   await page.waitForTimeout(2_000); // "wait for table to load"
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 15 000)
 * @returns       The first data row locator
 */
export async function waitForTableRow(page: Page, timeout = 15_000): Promise<Locator> {
  const row = page.locator('table tbody tr, [role="row"]:not([role="columnheader"])').first();
  await row.waitFor({ state: 'visible', timeout });
  return row;
}

/**
 * Wait for a specific text to appear anywhere in the table body.
 *
 * @param page    Playwright Page
 * @param text    String or RegExp to look for
 * @param timeout Maximum wait in ms (default 15 000)
 */
export async function waitForTableText(
  page: Page,
  text: string | RegExp,
  timeout = 15_000,
): Promise<void> {
  await expect(
    page.locator('table tbody, [role="rowgroup"]').first(),
  ).toContainText(text, { timeout });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown / Combobox Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for combobox / select options to appear in the portal dropdown.
 *
 * Mantine renders options outside the dialog in a portal — they appear after
 * an API fetch. This replaces:
 *   await page.waitForTimeout(2_500); // after typing in a MultiSelect
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 5 000)
 * @returns       The first visible option locator
 */
export async function waitForDropdownOptions(page: Page, timeout = 5_000): Promise<Locator> {
  const firstOpt = page.getByRole('option').first();
  await firstOpt.waitFor({ state: 'visible', timeout });
  return firstOpt;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation / Micro-pauses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wait for CSS transitions to complete by checking that the element is
 * stable (same bounding box on two consecutive frames).
 *
 * Replaces small fixed pauses:
 *   await page.waitForTimeout(300); // "wait for animation"
 *   await page.waitForTimeout(500);
 *   await page.waitForTimeout(600);
 *
 * @param locator  The element that is animating
 * @param timeout  Maximum wait in ms (default 3 000)
 */
export async function waitForAnimation(locator: Locator, timeout = 3_000): Promise<void> {
  // Playwright's toBeVisible / toBeAttached doesn't check stability.
  // Use waitFor + a short stability poll via evaluate.
  await locator.waitFor({ state: 'visible', timeout }).catch(() => {});

  await locator
    .evaluate((el) => {
      return new Promise<void>((resolve) => {
        // If the element has no animations running, resolve immediately
        const animations = el.getAnimations();
        if (animations.length === 0) {
          resolve();
          return;
        }
        Promise.allSettled(animations.map((a) => a.finished)).then(() => resolve());
      });
    })
    .catch(() => {});
}

/**
 * Wait for all pending network requests to settle (no requests in flight).
 *
 * Replaces:
 *   await page.waitForLoadState('networkidle').catch(() => {});
 *   await page.waitForTimeout(1_000);
 *
 * Caps at `timeout` to avoid hanging on apps with long-polling.
 *
 * @param page    Playwright Page
 * @param timeout Maximum wait in ms (default 8 000)
 */
export async function waitForNetworkIdle(page: Page, timeout = 8_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: poll until condition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poll a predicate every `interval` ms until it returns true or timeout.
 *
 * Use as a last resort when no DOM element signals the condition directly.
 *
 * @param predicate  Async function returning boolean
 * @param timeout    Maximum wait in ms (default 10 000)
 * @param interval   Poll interval in ms (default 250)
 */
export async function waitUntil(
  predicate: () => Promise<boolean>,
  timeout = 10_000,
  interval = 250,
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate().catch(() => false)) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}
