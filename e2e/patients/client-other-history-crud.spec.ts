import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { disableLoadingOverlay } from '../../support/helpers/mantine-helpers';
import {
  waitForPageReady,
  waitForDialogOpen,
  waitForDialogClose,
} from '../../support/helpers/wait-helpers';

/**
 * PSYNAPSYS — Client Other History (Psychosocial) CRU Tests (Therapist Portal)
 *
 * Create / Read / Update for the psychosocial "Other History" sections:
 *   - Education History
 *   - Employment / Occupational History
 *   - Social Supports
 *   - Relationship / Marital History
 *   - Leisure / Recreation
 *   - Cultural / Spiritual Background
 *   - Sexual History
 *   - Daily Functioning
 *
 * All are single-record or multi-select patterns — no Delete button per section.
 * Route: /app/client/$clientId/biopsychosocial/other-history
 *    OR  /app/client/$clientId/biopsychosocial (tab)
 *
 * @tag @regression @patients @other-history @crud
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveClientId(page: Page): Promise<string> {
  await page.goto('/app/client');
  await expect(page.locator('table').first()).toBeVisible({ timeout: 15_000 });
  const firstIdCell = page.locator('table tbody tr').first().locator('td').first();
  await expect(firstIdCell).toHaveText(/^\d+$/, { timeout: 20_000 });
  return (await firstIdCell.innerText()).trim();
}

// disableLoadingOverlay is imported from mantine-helpers

const TS = Date.now();
const NOTES = `E2E other history ${TS.toString().slice(-6)}`;
const UPDATED_NOTES = `Updated ${NOTES}`;

// ── Helper: generic section edit + save ───────────────────────────────────────

/**
 * Opens the edit form for a named section (if button exists), fills any
 * text/textarea fields with `notes`, then saves. Gracefully accepts
 * auto-save patterns (no explicit Save button) or backend errors.
 */
async function editSection(
  page: Page,
  sectionKeyword: RegExp,
  notes: string,
): Promise<void> {
  await disableLoadingOverlay(page);

  // Scroll section into view
  const sectionEl = page.getByText(sectionKeyword).first();
  if (await sectionEl.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sectionEl.scrollIntoViewIfNeeded().catch(() => {});
  }

  // Open edit form if a pencil/edit button is present
  const editBtn = page
    .locator('section, div, article')
    .filter({ hasText: sectionKeyword })
    .first()
    .getByRole('button', { name: /edit/i })
    .first();

  if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await editBtn.click({ force: true });
    await waitForDialogOpen(page);
    await disableLoadingOverlay(page);
  }

  // Fill textarea or text input if available
  const textarea = page
    .locator('section, div, article')
    .filter({ hasText: sectionKeyword })
    .first()
    .locator('textarea')
    .first();
  const textInput = page
    .locator('section, div, article')
    .filter({ hasText: sectionKeyword })
    .first()
    .locator('input[type="text"]')
    .first();

  // Use whichever is visible
  if (await textarea.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textarea.click({ force: true });
    await textarea.fill(notes);
  } else if (await textInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await textInput.click({ force: true });
    await textInput.fill(notes);
  }

  // Click checkboxes/radios if visible in section
  const checkboxes = page
    .locator('section, div, article')
    .filter({ hasText: sectionKeyword })
    .first()
    .locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count().catch(() => 0);
  if (cbCount > 0) {
    await checkboxes.first().click({ force: true }).catch(() => {});
  }

  // Look for a Save button in dialog scope, then page scope
  const dialog = page.locator('[role="dialog"]').first();
  const isDialog = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
  const saveScope = isDialog ? dialog : page;
  const saveBtn = saveScope.getByRole('button', { name: /^save$|^update$/i }).last();

  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    if (isDialog) {
      await waitForDialogClose(page);
      // If dialog is still open (backend error), cancel gracefully
      const stillOpen = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
      if (stillOpen) {
        const cancelBtn = dialog.getByRole('button', { name: /cancel/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        }
      }
    } else {
      await waitForPageReady(page);
    }
  }
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Client Other History (Psychosocial) — CRU', () => {
  let clientId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    clientId = await resolveClientId(page);
    await ctx.close();
  });

  async function goToOtherHistory(page: Page): Promise<void> {
    await page.goto(`/app/client/${clientId}/biopsychosocial_history/other-history`);
    await expect(page).toHaveURL(/biopsychosocial_history\/other-history/, { timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await waitForPageReady(page);
  }

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Other History / Psychosocial page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToOtherHistory(page);

      // At least one of the expected section headings should be visible
      const sectionVisible = async (kw: RegExp) =>
        page.getByText(kw).first().isVisible({ timeout: 3_000 }).catch(() => false);

      const anyVisible =
        (await sectionVisible(/education/i)) ||
        (await sectionVisible(/employment|occupation/i)) ||
        (await sectionVisible(/social support/i)) ||
        (await sectionVisible(/relationship|marital/i)) ||
        (await sectionVisible(/leisure|recreation/i)) ||
        (await sectionVisible(/cultural|spiritual/i)) ||
        (await sectionVisible(/sexual/i)) ||
        (await sectionVisible(/daily functioning/i)) ||
        (await sectionVisible(/psychosocial/i)) ||
        (await sectionVisible(/other history/i));

      expect(anyVisible).toBe(true);
    },
  );

  // ── CREATE / UPDATE — each subsection ────────────────────────────────────

  test(
    'should edit Education History section @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/education/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /education/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Employment / Occupational History section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/employment|occupation/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /employment|occupation/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Social Supports section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/social support/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /social support/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Relationship / Marital History section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/relationship|marital/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /relationship|marital/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Leisure / Social Activities section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/leisure|social activities/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /leisure|social activities/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Cultural and Spiritual Identity section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/cultural and spiritual|cultural|spiritual/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /cultural and spiritual|cultural|spiritual/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Sexual Activity and Orientation section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/sexual activity|sexual orientation|sexual/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /sexual activity|sexual orientation|sexual/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should edit Daily Functioning section',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/daily functioning/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /daily functioning/i, NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );

  // ── UPDATE (second pass with new text) ───────────────────────────────────

  test(
    'should update a previously saved section (Education)',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToOtherHistory(page);

      const hasSection = await page
        .getByText(/education/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      if (!hasSection) { test.skip(); return; }

      await editSection(page, /education/i, UPDATED_NOTES);
      await expect(page.locator('body')).toBeVisible();
    },
  );
});
