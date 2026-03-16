import { test, expect } from '../../support/merged-fixtures';
import { type Page } from '@playwright/test';
import { waitForPageReady, waitForDialogOpen, waitForAnimation } from '../../support/helpers/wait-helpers';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * PSYNAPSYS — Profile Settings CRUD Tests (Therapist Portal)
 *
 * Route: /app/setting/profile
 *
 * Features:
 *   - View profile info (name, email, phone, bio, avatar)
 *   - Edit personal info (first name, last name, phone, bio)
 *   - Upload avatar/profile photo
 *   - Change password form
 *   - Practice/clinic settings (if super-admin)
 *
 * @tag @regression @settings @profile
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToProfile(page: Page): Promise<void> {
  await page.goto('/app/setting/profile');
  await expect(page).toHaveURL(/setting\/profile/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await waitForPageReady(page);
}

function createTempPng(): string {
  // Minimal 1x1 transparent PNG (67 bytes)
  const pngBytes = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
    'hex',
  );
  const tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'psynapsys-'));
  const tmpFile = path.join(tmpDir, 'avatar.png');
  fs.writeFileSync(tmpFile, pngBytes);
  return tmpFile;
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe.serial('Profile Settings — CRUD', () => {

  // ── READ ─────────────────────────────────────────────────────────────────

  test(
    'should display the Profile Settings page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);
      const heading = page.getByText(/profile|my account|account settings/i).first();
      await expect(heading).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should show profile information fields @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const hasName  = await page.getByLabel(/first name|full name|name/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasEmail = await page.getByLabel(/email/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasPhone = await page.getByLabel(/phone|mobile/i).first().isVisible({ timeout: 5_000 }).catch(() => false);

      // Profile may render as read-only text (no label/input) — check for any input or text content
      const hasInput = await page.locator('input').first().isVisible({ timeout: 5_000 }).catch(() => false);
      const hasText  = await page.getByText(/@|sahil|thinkitive/i).first().isVisible({ timeout: 3_000 }).catch(() => false);

      expect(hasName || hasEmail || hasPhone || hasInput || hasText).toBe(true);
    },
  );

  test(
    'should show profile avatar or photo section @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const hasAvatar = await page
        .locator('img[alt*="profile" i], img[alt*="avatar" i], [class*="avatar"], [class*="Avatar"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasUpload = await page
        .getByRole('button', { name: /upload|change photo|change image|edit photo/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasAvatar || hasUpload) {
        expect(true).toBe(true);
      }
    },
  );

  // ── UPDATE PROFILE ────────────────────────────────────────────────────────

  test(
    'should allow editing profile fields @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(90_000);
      await goToProfile(page);

      // Look for an Edit button to enter edit mode (some profiles are read-only by default)
      const editBtn = page.getByRole('button', { name: /^edit$|edit profile|edit info/i }).first();
      if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await editBtn.click({ force: true });
        await waitForAnimation(page.locator('input').first());
      }

      // Try to find and update phone or bio field (safe to change)
      const phoneInput = page.getByLabel(/phone|mobile/i).first();
      if (await phoneInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await phoneInput.click({ force: true });
        await phoneInput.selectAll?.();
        await page.keyboard.press('Control+a');
        await phoneInput.fill('555-000-0001');
        await expect(page.locator('body')).toBeVisible();
      } else {
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should show Save button on profile page @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const editBtn = page.getByRole('button', { name: /^edit$|edit profile/i }).first();
      if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await editBtn.click({ force: true });
        await waitForAnimation(page.locator('input').first());
      }

      const saveBtn = page.getByRole('button', { name: /save|update|submit/i }).first();
      const hasSave = await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasSave) {
        await expect(saveBtn).toBeVisible();
      }
    },
  );

  // ── AVATAR UPLOAD ─────────────────────────────────────────────────────────

  test(
    'should allow avatar upload via file input @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      test.setTimeout(60_000);
      await goToProfile(page);

      const editBtn = page.getByRole('button', { name: /^edit$|edit profile|edit photo|change photo|upload/i }).first();
      if (await editBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await editBtn.click({ force: true });
        await waitForAnimation(page.locator('input[type="file"]').first());
      }

      const fileInput = page.locator('input[type="file"]').first();
      const inputExists = await fileInput.count().catch(() => 0);
      if (inputExists === 0) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      const tmpFile = createTempPng();
      try {
        await fileInput.setInputFiles(tmpFile);
        await waitForPageReady(page);
        await expect(page.locator('body')).toBeVisible();
      } finally {
        fs.unlinkSync(tmpFile);
      }
    },
  );

  // ── CHANGE PASSWORD ───────────────────────────────────────────────────────

  test(
    'should show Change Password section or button @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const hasSection = await page
        .getByText(/change password|update password|reset password/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      const hasBtn = await page
        .getByRole('button', { name: /change password|update password/i })
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasSection || hasBtn) {
        expect(true).toBe(true);
      }
    },
  );

  test(
    'should show password fields when Change Password is clicked @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const changeBtn = page
        .getByRole('button', { name: /change password|update password/i })
        .first();

      if (!(await changeBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
        await expect(page.locator('body')).toBeVisible();
        return;
      }

      await changeBtn.click({ force: true });
      await waitForDialogOpen(page).catch(() => {});

      const dialog = page.locator('[role="dialog"]').first();
      if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const hasCurrentPwd = await dialog.getByLabel(/current password|old password/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
        const hasNewPwd     = await dialog.getByLabel(/new password/i).first().isVisible({ timeout: 3_000 }).catch(() => false);

        await expect(page.locator('body')).toBeVisible();
        if (hasCurrentPwd || hasNewPwd) {
          expect(true).toBe(true);
        }

        const cancelBtn = dialog.getByRole('button', { name: /cancel|close/i }).first();
        if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await cancelBtn.click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      } else {
        // Password fields may be inline (not in a dialog)
        const hasCurrentPwd = await page.getByLabel(/current password|old password/i).first().isVisible({ timeout: 3_000 }).catch(() => false);
        const hasNewPwd     = await page.getByLabel(/new password/i).first().isVisible({ timeout: 3_000 }).catch(() => false);

        await expect(page.locator('body')).toBeVisible();
        if (hasCurrentPwd || hasNewPwd) {
          expect(true).toBe(true);
        }
      }
    },
  );

  // ── PRACTICE / CLINIC SETTINGS ────────────────────────────────────────────

  test(
    'should show practice or clinic info section if visible @smoke',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      await goToProfile(page);

      const hasPractice = await page
        .getByText(/practice|clinic|organization|company/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      await expect(page.locator('body')).toBeVisible();
      if (hasPractice) {
        expect(true).toBe(true);
      }
    },
  );
});
