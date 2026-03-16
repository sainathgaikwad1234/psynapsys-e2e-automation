import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Surgical History CRU Tests (Therapist Portal)
 *
 * Create → Read → Update lifecycle for a client's surgical history records.
 * Note: The surgical history table has no Delete action — only Edit (pencil icon).
 *
 * @tag @regression @patients @surgical-history @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS          = Date.now();
const SURGERY_NAME    = `E2E Surgery ${TS.toString().slice(-6)}`;
const SURGERY_UPDATED = `${SURGERY_NAME} Upd`;
const SURGERY_NOTE    = 'E2E test surgery — safe to ignore.';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

// disableLoadingOverlay is imported from mantine-helpers

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Surgical History — CRU', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToSurgical(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/biopsychosocial_history/surgical-history`);
    await expect(page).toHaveURL(/biopsychosocial_history\/surgical-history/, { timeout: 15_000 });
    await waitForPageReady(page);
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should open Add Surgery modal @smoke',
    async ({ page }) => {
      await goToSurgical(page);

      const addBtn = page.getByRole('button', { name: /^add$/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(dialog.getByText(/add surgery/i).first()).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should create a new surgery record @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToSurgical(page);

      await page.getByRole('button', { name: /^add$/i }).first().click();
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Surgery Name (required)
      const nameInput = dialog
        .getByRole('textbox', { name: /surgery name/i })
        .first()
        .or(dialog.getByPlaceholder(/surgery name|enter/i).first());
      await nameInput.first().fill(SURGERY_NAME);

      // Surgery Date (MM/YYYY format — CustomMonthYearInput)
      const dateInput = dialog
        .getByLabel(/surgery date/i)
        .first()
        .or(dialog.getByPlaceholder(/mm\/yyyy|surgery date/i).first());
      if (await dateInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dateInput.first().fill('01/2020');
      }

      // Note (optional)
      const noteInput = dialog.locator('textarea').first()
        .or(dialog.getByLabel(/note/i).first());
      if (await noteInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await noteInput.first().fill(SURGERY_NOTE);
      }

      // Submit — button is "Add" for both create and edit
      const submitBtn = dialog.getByRole('button', { name: /^add$|^save$/i }).last();
      await expect(submitBtn).toBeVisible({ timeout: 5_000 });
      await submitBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the created surgery in the table',
    async ({ page }) => {
      await goToSurgical(page);
      await expect(page.getByText(SURGERY_NAME)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the surgery name',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToSurgical(page);
      await expect(page.getByText(SURGERY_NAME)).toBeVisible({ timeout: 10_000 });

      // Edit icon (img) is rendered by React only during row hover.
      // 1. Hover the row to trigger the img to appear in the DOM.
      // 2. Get the img's exact coordinates while hover is active.
      // 3. Click at those coordinates.
      const row = page.locator('tr').filter({ hasText: SURGERY_NAME }).first();
      await row.hover();
      await page.waitForTimeout(600); // TODO: replace with specific wait helper — intentional hover-reveal timing

      const clickPos = await page.evaluate((name: string) => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const target = rows.find((r) => r.textContent?.includes(name));
        if (!target) return null;
        // Try img in last cell first
        const img = target.querySelector('td:last-child img, td:last-child svg') as HTMLElement | null;
        if (img) {
          const r = img.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        // Fallback: click near the right edge of the last cell
        const tds = target.querySelectorAll('td');
        const lastTd = tds[tds.length - 1] as HTMLElement | undefined;
        if (lastTd) {
          const r = lastTd.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width - 12, y: r.y + r.height / 2 };
        }
        return null;
      }, SURGERY_NAME);

      if (clickPos) {
        await page.mouse.move(clickPos.x, clickPos.y);
        await page.waitForTimeout(200); // TODO: replace with specific wait helper — mouse tracking guard
        await page.mouse.click(clickPos.x, clickPos.y);
      } else {
        await row.click({ force: true });
      }
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      const nameInput = dialog
        .getByRole('textbox', { name: /surgery name/i })
        .first()
        .or(dialog.getByPlaceholder(/surgery name/i).first());
      await nameInput.first().clear();
      await nameInput.first().fill(SURGERY_UPDATED);

      const submitBtn = dialog.getByRole('button', { name: /^add$|^save$|^update$/i }).last();
      await submitBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText(SURGERY_UPDATED)).toBeVisible({ timeout: 10_000 });
    },
  );
});
