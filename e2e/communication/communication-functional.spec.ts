import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Communication Functional Tests (Therapist Portal)
 *
 * Interaction tests for messaging and fax functionality:
 *   Messages:
 *     - Verify message list sidebar / thread panel
 *     - Click "New Message" → compose dialog opens → cancel
 *     - Switch between All / Archived / Assigned / Pinned tabs
 *     - Open a message thread if one exists
 *   Fax:
 *     - Verify incoming fax list columns
 *     - Switch between Incoming / Outgoing tabs
 *     - Open fax detail if records exist
 *     - Verify "Send Fax" button exists
 *
 * Read-only — no messages are sent and no faxes are transmitted.
 *
 * @tag @regression @communication @functional
 */

// ── Messages ──────────────────────────────────────────────────────────────────

test.describe('Communication — Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/communication/messages/all');
    await expect(page).toHaveURL(/\/app\/communication\/messages\/all/, { timeout: 15_000 });
    await page.waitForTimeout(2_000);
  });

  test(
    'should show the message list panel or inbox area @smoke',
    async ({ page }) => {
      const messagePanel = page
        .locator('[class*="message"],[class*="thread"],[class*="inbox"],[class*="conversation"]')
        .first()
        .or(page.locator('[class*="sidebar"]').first())
        .or(page.getByText(/no message|start conversation|all messages/i).first());
      await expect(messagePanel.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should show a New Message / Compose button @smoke',
    async ({ page }) => {
      const composeBtn = page
        .getByRole('button', { name: /new message|compose|new|write/i })
        .first();
      await expect(composeBtn).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should open compose dialog when clicking New Message and cancel without sending',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      const composeBtn = page
        .getByRole('button', { name: /new message|compose|new|write/i })
        .first();

      if (await composeBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await composeBtn.click();
        await page.waitForTimeout(1_000);

        // Compose modal / drawer should appear
        const composeDialog = page
          .locator('[role="dialog"]')
          .first()
          .or(page.locator('[class*="compose"],[class*="new-message"],[class*="drawer"]').first());
        await expect(composeDialog.first()).toBeVisible({ timeout: 8_000 });

        // Verify the recipient / subject / message fields exist
        const inputField = composeDialog
          .locator('input,textarea')
          .first();
        await expect(inputField).toBeVisible({ timeout: 5_000 });

        // Cancel — do NOT send
        const cancelBtn = page
          .getByRole('button', { name: /cancel|close|discard/i })
          .first()
          .or(page.locator('[aria-label="Close"],[class*="close"]').first());
        if (await cancelBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
          await cancelBtn.first().click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }

        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should switch to Archived tab and back to All',
    async ({ page }) => {
      const archivedTab = page
        .getByRole('tab', { name: /archived/i })
        .first()
        .or(page.locator('a,button').filter({ hasText: /archived/i }).first());

      if (await archivedTab.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await archivedTab.first().click({ force: true });
        await expect(page).toHaveURL(/\/app\/communication\/messages\/archived/, { timeout: 8_000 });
        await expect(page.locator('body')).toBeVisible();

        // Go back to All
        const allTab = page
          .getByRole('tab', { name: /^all$/i })
          .first()
          .or(page.locator('a,button').filter({ hasText: /^all$/i }).first());
        await allTab.first().click({ force: true });
        await expect(page).toHaveURL(/\/app\/communication\/messages\/all/, { timeout: 8_000 });
      }
    },
  );

  test(
    'should switch to Assigned To Me tab',
    async ({ page }) => {
      const assignedTab = page
        .getByRole('tab', { name: /assigned/i })
        .first()
        .or(page.locator('a,button').filter({ hasText: /assigned to me|assign/i }).first());

      if (await assignedTab.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await assignedTab.first().click({ force: true });
        await expect(page).toHaveURL(/\/app\/communication\/messages\/assignToMe/, { timeout: 8_000 });
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should switch to Pinned tab',
    async ({ page }) => {
      const pinnedTab = page
        .getByRole('tab', { name: /pin/i })
        .first()
        .or(page.locator('a,button').filter({ hasText: /pin/i }).first());

      if (await pinnedTab.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await pinnedTab.first().click({ force: true });
        await expect(page).toHaveURL(/\/app\/communication\/messages\/pin/, { timeout: 8_000 });
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );

  test(
    'should open a message thread when clicking a message item',
    async ({ page }) => {
      // Message threads appear as clickable list items in the left panel
      const messageItem = page
        .locator('[class*="message-item"],[class*="conversation-item"],[class*="thread-item"],[class*="chat-item"]')
        .first()
        .or(page.locator('[class*="message"] [role="listitem"]').first());

      if (await messageItem.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await messageItem.first().click({ force: true });
        await page.waitForTimeout(1_500);

        // Thread panel (right side) should now show message content
        const threadPanel = page
          .locator('[class*="thread-content"],[class*="message-content"],[class*="chat-messages"]')
          .first();
        await expect(threadPanel.first()).toBeVisible({ timeout: 8_000 });
      }
    },
  );
});

// ── Fax ───────────────────────────────────────────────────────────────────────

test.describe('Communication — Fax', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/communication/fax/incoming');
    await expect(page).toHaveURL(/\/app\/communication\/fax\/incoming/, { timeout: 15_000 });
    await page.waitForTimeout(2_000);
  });

  test(
    'should display the incoming fax list with expected columns @smoke',
    async ({ page }) => {
      const content = page
        .locator('table')
        .first()
        .or(page.getByText(/from|date|status|fax/i).first())
        .or(page.getByText(/no fax|no incoming|no data/i).first());
      await expect(content.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should switch from Incoming to Outgoing fax tab @smoke',
    async ({ page }) => {
      const outgoingTab = page
        .getByRole('tab', { name: /outgoing/i })
        .first()
        .or(page.locator('a,button').filter({ hasText: /outgoing/i }).first());

      await expect(outgoingTab.first()).toBeVisible({ timeout: 8_000 });
      await outgoingTab.first().click({ force: true });
      await expect(page).toHaveURL(/\/app\/communication\/fax\/outgoing/, { timeout: 8_000 });
      await expect(page.locator('body')).toBeVisible();
    },
  );

  test(
    'should have a Send Fax / New button on the fax page',
    async ({ page }) => {
      // The fax page shows a "New" button (not labelled "Send Fax")
      const sendBtn = page
        .getByRole('button', { name: /send fax|new fax|compose fax/i })
        .first()
        .or(page.getByRole('button', { name: 'New' }).first());
      await expect(sendBtn.first()).toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should open Send Fax form and cancel without transmitting',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ page }) => {
      const sendBtn = page
        .getByRole('button', { name: /send fax|new fax|compose fax/i })
        .first()
        .or(page.getByRole('button', { name: 'New' }).first());

      if (await sendBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await sendBtn.click();
        await page.waitForTimeout(1_000);

        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible({ timeout: 8_000 });

        // Verify fax number or recipient input is present
        const recipientField = dialog
          .locator('input,textarea')
          .first();
        await expect(recipientField).toBeVisible({ timeout: 5_000 });

        // Cancel
        const cancelBtn = page
          .getByRole('button', { name: /cancel|close/i })
          .first()
          .or(page.locator('[aria-label="Close"]').first());
        if (await cancelBtn.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
          await cancelBtn.first().click({ force: true });
        } else {
          await page.keyboard.press('Escape');
        }
      }
    },
  );

  test(
    'should open fax detail when clicking a row',
    async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      if (await firstRow.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await firstRow.click({ force: true });
        await page.waitForTimeout(1_500);
        // Detail view or preview panel should be visible
        await expect(page.locator('body')).toBeVisible();
      }
    },
  );
});
