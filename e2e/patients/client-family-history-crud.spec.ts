import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';

/**
 * PSYNAPSYS — Client Family History CRU Tests (Therapist Portal)
 *
 * Create → Read → Update lifecycle for a client's family medical & mental history.
 * Note: No Delete action is available on family history rows.
 *
 * @tag @regression @patients @family-history @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

// Name field only allows letters, spaces, hyphens, apostrophes — no digits at all
// Use a minute+second letter combo for lightweight uniqueness
const LETTER_SUFFIX = ['Aa','Bb','Cc','Dd','Ee','Ff','Gg','Hh','Jj','Kk'][new Date().getMinutes() % 10]
  + ['Ll','Mm','Nn','Pp','Qq','Rr','Ss','Tt','Uu','Vv'][new Date().getSeconds() % 10];
const MEMBER_NAME    = `Auto Member ${LETTER_SUFFIX}`;    // no digits
const MEMBER_UPDATED = `Auto Mmbr Upd ${LETTER_SUFFIX}`;  // no digits

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

async function disableLoadingOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('.mantine-LoadingOverlay-overlay').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = 'none';
    });
  });
  await page.waitForTimeout(200);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Family History — CRU', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToFamily(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/biopsychosocial_history/family-history`);
    await expect(page).toHaveURL(/biopsychosocial_history\/family-history/, { timeout: 15_000 });
    await page.waitForTimeout(1_500);
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────

  test(
    'should open Add Family History modal @smoke',
    async ({ page }) => {
      await goToFamily(page);

      const addBtn = page.getByRole('button', { name: /^add$/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10_000 });
      await addBtn.click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await expect(
        dialog.getByText(/add family medical/i).first(),
      ).toBeVisible({ timeout: 5_000 });
    },
  );

  test(
    'should create a new family history entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToFamily(page);

      await page.getByRole('button', { name: /^add$/i }).first().click();
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Name (required — letters/spaces/hyphens only)
      const nameInput = dialog.getByLabel(/^name$/i).first()
        .or(dialog.getByPlaceholder(/enter name/i).first());
      await nameInput.first().fill(MEMBER_NAME);

      // Relative (required Select) — click directly and pick first option
      const relInput = dialog.getByRole('textbox', { name: /relative/i }).first()
        .or(dialog.getByPlaceholder(/select relative/i).first());
      await relInput.first().click({ force: true });
      await page.waitForTimeout(600);
      const relOpt = page.getByRole('option').first();
      if (await relOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await relOpt.click({ force: true });
        await page.waitForTimeout(300);
      }

      // Still Living (optional Select) — use Tab to close prev dropdown first
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      const aliveInput = dialog.getByLabel(/still living/i).first()
        .or(dialog.getByPlaceholder(/still living|alive/i).first());
      if (await aliveInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await aliveInput.first().click({ force: true });
        await page.waitForTimeout(400);
        const aliveOpt = page.getByRole('option').first();
        if (await aliveOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await aliveOpt.click({ force: true });
          await page.waitForTimeout(300);
        }
      }

      // Major Medical Condition (required — at least one checkbox)
      const firstCheckbox = dialog
        .getByRole('checkbox')
        .first();
      if (await firstCheckbox.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstCheckbox.check({ force: true });
        await page.waitForTimeout(200);
      }

      // Notes (optional textarea)
      const noteInput = dialog.locator('textarea').first();
      if (await noteInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await noteInput.fill('E2E test family history — safe to ignore.');
      }

      // Save
      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1_500);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ── READ ────────────────────────────────────────────────────────────────────

  test(
    'should display the created family member in the table',
    async ({ page }) => {
      await goToFamily(page);
      await expect(page.getByText(MEMBER_NAME)).toBeVisible({ timeout: 10_000 });
    },
  );

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  test(
    'should edit the family member name',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToFamily(page);
      await expect(page.getByText(MEMBER_NAME)).toBeVisible({ timeout: 10_000 });

      // Edit icon (img) is rendered by React only during row hover.
      const row = page.locator('tr').filter({ hasText: MEMBER_NAME }).first();
      await row.hover();
      await page.waitForTimeout(600);

      const clickPos = await page.evaluate((name: string) => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const target = rows.find((r) => r.textContent?.includes(name));
        if (!target) return null;
        const img = target.querySelector('td:last-child img, td:last-child svg') as HTMLElement | null;
        if (img) {
          const r = img.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
        const tds = target.querySelectorAll('td');
        const lastTd = tds[tds.length - 1] as HTMLElement | undefined;
        if (lastTd) {
          const r = lastTd.getBoundingClientRect();
          if (r.width > 0) return { x: r.x + r.width - 12, y: r.y + r.height / 2 };
        }
        return null;
      }, MEMBER_NAME);

      if (clickPos) {
        await page.mouse.move(clickPos.x, clickPos.y);
        await page.waitForTimeout(200);
        await page.mouse.click(clickPos.x, clickPos.y);
      } else {
        await row.click({ force: true });
      }
      await page.waitForTimeout(600);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      const nameInput = dialog.getByLabel(/^name$/i).first()
        .or(dialog.getByPlaceholder(/enter name/i).first());
      await nameInput.first().clear();
      await nameInput.first().fill(MEMBER_UPDATED);

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await saveBtn.click({ force: true });
      await page.waitForTimeout(1_500);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
      await expect(page.getByText(MEMBER_UPDATED)).toBeVisible({ timeout: 10_000 });
    },
  );
});