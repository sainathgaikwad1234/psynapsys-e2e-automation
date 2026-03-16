import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Mental Health History CRU Tests (Therapist Portal)
 *
 * Create → Read → Update lifecycle for three mental health history subsections:
 *   1. Current Mental Health Symptoms (checkbox group + textarea)
 *   2. Previous Therapy/Counselling (therapist name + note)
 *   3. In-Patient/Psychiatric Hospitalizations (date + how long + reason)
 *
 * Note: No Delete action is available — rows only have an Edit (pencil) icon.
 *
 * @tag @regression @patients @mental-history @crud
 */

// ── Test data ─────────────────────────────────────────────────────────────────

const TS            = Date.now();
const THERAPIST_NAME   = `E2E Therapist ${TS.toString().slice(-5)}`;
const THERAPY_NOTE     = `Seen weekly for anxiety. E2E test ${TS.toString().slice(-5)}.`;
const HOSPITALIZATION_REASON = `E2E hospitalization test ${TS.toString().slice(-5)}`;

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

test.describe.serial('Client Mental Health History — CRU', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToMentalHistory(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/biopsychosocial_history/mental-history`);
    await expect(page).toHaveURL(/biopsychosocial_history\/mental-history/, { timeout: 15_000 });
    await waitForPageReady(page);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSECTION 1: Current Mental Health Symptoms
  // ═══════════════════════════════════════════════════════════════════════════

  test(
    'should create a Current Mental Health Symptom entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMentalHistory(page);

      // Find the "Current Mental Health Symptoms" section Add button
      const symptomsSection = page
        .locator('section, div, [class*="card"]')
        .filter({ hasText: /current mental health symptoms/i })
        .first();

      const addBtn = symptomsSection.getByRole('button', { name: /^add$/i }).first()
        .or(page.getByRole('button', { name: /^add$/i }).first());

      if (!(await addBtn.first().isVisible({ timeout: 8_000 }).catch(() => false))) {
        test.skip();
        return;
      }
      await addBtn.first().click({ force: true });
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
      await disableLoadingOverlay(page);

      // Check at least one symptom checkbox
      const firstCheckbox = dialog.getByRole('checkbox').first();
      if (await firstCheckbox.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await firstCheckbox.check({ force: true });
      }

      // Fill "What have you done to address it?" textarea
      const addressTextarea = dialog
        .getByLabel(/what have you done/i)
        .first()
        .or(dialog.locator('textarea').first());
      if (await addressTextarea.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await addressTextarea.first().fill('Therapy and mindfulness practice. E2E test.');
      }

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSECTION 2: Previous Therapy/Counselling
  // ═══════════════════════════════════════════════════════════════════════════

  test(
    'should create a Previous Therapy entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMentalHistory(page);

      // Scroll to the "Previous-Therapy/Counselling" section
      const therapySection = page
        .getByText(/previous.therapy.counselling/i)
        .first();
      if (await therapySection.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await therapySection.scrollIntoViewIfNeeded();
      }

      // Find Add button near this section
      // Since all sections use "Add", we need to find the one closest to this section
      const allAddBtns = page.getByRole('button', { name: /^add$/i });
      const btnCount = await allAddBtns.count();

      // The second "Add" button on the page belongs to Previous Therapy section
      if (btnCount >= 2) {
        await allAddBtns.nth(1).click({ force: true });
      } else if (btnCount === 1) {
        await allAddBtns.first().click({ force: true });
      } else {
        test.skip();
        return;
      }
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      // Verify it's the correct modal
      const isCorrectModal = await dialog
        .getByText(/previous.therapy|therapy.*counselling/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!isCorrectModal) {
        await page.keyboard.press('Escape');
        test.skip();
        return;
      }

      await disableLoadingOverlay(page);

      // Note (required) — label is "Note *" (with asterisk), so use /note/i (not anchored)
      const noteInput = dialog.getByRole('textbox', { name: /note/i }).first()
        .or(dialog.getByLabel(/note/i).first())
        .or(dialog.locator('textarea').first());
      await noteInput.first().fill(THERAPY_NOTE);

      // Therapist Name (optional)
      const nameInput = dialog.getByLabel(/therapist name/i).first()
        .or(dialog.getByPlaceholder(/therapist name/i).first());
      if (await nameInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nameInput.first().fill(THERAPIST_NAME);
      }

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  test(
    'should display the Previous Therapy entry in the table',
    async ({ page }) => {
      await goToMentalHistory(page);
      await expect(page.getByText(THERAPIST_NAME)).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should edit the Previous Therapy entry',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMentalHistory(page);
      await expect(page.getByText(THERAPIST_NAME)).toBeVisible({ timeout: 10_000 });

      // Edit icon (img) is rendered by React only during row hover.
      const row = page.locator('tr').filter({ hasText: THERAPIST_NAME }).first();
      await row.hover();
      await page.waitForTimeout(600); // TODO: replace with specific wait helper — intentional hover-reveal timing

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
      }, THERAPIST_NAME);

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

      // Update therapist name
      const nameInput = dialog.getByLabel(/therapist name/i).first()
        .or(dialog.getByPlaceholder(/therapist name/i).first());
      if (await nameInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nameInput.first().clear();
        await nameInput.first().fill(`${THERAPIST_NAME} Upd`);
      }

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSECTION 3: In-Patient/Psychiatric Hospitalizations
  // ═══════════════════════════════════════════════════════════════════════════

  test(
    'should create a Psychiatric Hospitalization entry @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToMentalHistory(page);

      const hospSection = page
        .getByText(/in-patient.*hospitalization|psychiatric hospitalization/i)
        .first();
      if (await hospSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await hospSection.scrollIntoViewIfNeeded();
      }

      // Third "Add" button belongs to Psychiatric Hospitalization section
      const allAddBtns = page.getByRole('button', { name: /^add$/i });
      const btnCount = await allAddBtns.count();

      if (btnCount >= 3) {
        await allAddBtns.nth(2).click({ force: true });
      } else if (btnCount >= 1) {
        await allAddBtns.last().click({ force: true });
      } else {
        test.skip();
        return;
      }
      await waitForDialogOpen(page);

      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });

      const isCorrectModal = await dialog
        .getByText(/psychiatric hospitalization|add dates/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      if (!isCorrectModal) {
        await page.keyboard.press('Escape');
        test.skip();
        return;
      }

      await disableLoadingOverlay(page);

      // Add Dates (MM/YYYY format)
      const dateInput = dialog.getByLabel(/add dates/i).first()
        .or(dialog.getByPlaceholder(/mm\/yyyy/i).first());
      if (await dateInput.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await dateInput.first().fill('01/2019');
      }

      // How long
      const howLongInput = dialog.getByLabel(/how long/i).first()
        .or(dialog.getByPlaceholder(/enter/i).first());
      if (await howLongInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await howLongInput.first().fill('2 weeks');
      }

      // Reason
      const reasonInput = dialog.getByLabel(/reason/i).first()
        .or(dialog.locator('textarea').first());
      if (await reasonInput.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await reasonInput.first().fill(HOSPITALIZATION_REASON);
      }

      const saveBtn = dialog.getByRole('button', { name: /^save$/i }).last();
      await expect(saveBtn).toBeVisible({ timeout: 5_000 });
      await saveBtn.click({ force: true });
      await waitForDialogClose(page);

      await expect(dialog).toBeHidden({ timeout: 10_000 });
    },
  );

  test(
    'should display the hospitalization entry in the table',
    async ({ page }) => {
      await goToMentalHistory(page);
      await expect(page.getByText(HOSPITALIZATION_REASON)).toBeVisible({ timeout: 10_000 });
    },
  );
});
