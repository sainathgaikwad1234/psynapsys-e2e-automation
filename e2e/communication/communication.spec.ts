import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Communication Module E2E Tests (Therapist Portal)
 *
 * Covers navigation and page-load for the messaging and fax sections.
 * Read-only: no messages are sent and no faxes are transmitted.
 *
 * Actual routes (from src/routes/_authenticated/app/_layout/communication/):
 *   Messages:
 *     - /app/communication/messages/all        → All messages
 *     - /app/communication/messages/archived   → Archived messages
 *     - /app/communication/messages/assignToMe → Assigned to me
 *     - /app/communication/messages/pin        → Pinned messages
 *   Fax:
 *     - /app/communication/fax/incoming        → Incoming faxes
 *     - /app/communication/fax/outgoing        → Outgoing faxes
 *
 * No data-testid attributes — use role/text/URL selectors.
 *
 * @tag @regression @communication
 */

test.describe('Communication Module', () => {
  test.describe('Messages', () => {
    test(
      'should display all messages tab @smoke',
      async ({ page }) => {
        // GIVEN: Authenticated therapist navigates to messages
        await page.goto('/app/communication/messages/all');

        // THEN: URL resolves to messages
        await expect(page).toHaveURL(/\/app\/communication\/messages\/all/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show messaging UI — inbox list or empty state',
      async ({ page }) => {
        // GIVEN: User is on the messages page
        await page.goto('/app/communication/messages/all');
        await expect(page).toHaveURL(/\/app\/communication\/messages/, { timeout: 15_000 });

        // THEN: Message list, thread pane, or empty-state is visible
        const content = page
          .locator('[class*="message"],[class*="thread"],[class*="inbox"]').first()
          .or(page.getByText(/no message|start conversation|compose/i).first())
          .or(page.locator('table').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );

    test(
      'should show message navigation tabs (All / Archived / Assigned / Pinned)',
      async ({ page }) => {
        // GIVEN: User is on the messages page
        await page.goto('/app/communication/messages/all');
        await expect(page).toHaveURL(/\/app\/communication\/messages/, { timeout: 15_000 });

        // THEN: Tab nav for message filters is visible
        const tab = page
          .getByRole('tab', { name: /all|archived|assigned|pin/i })
          .or(page.getByText(/archived|assigned to me|pinned/i).first());
        await expect(tab.first()).toBeVisible({ timeout: 10_000 });
      },
    );

    test(
      'should display archived messages tab',
      async ({ page }) => {
        // GIVEN: User navigates to archived messages
        await page.goto('/app/communication/messages/archived');

        // THEN: Archived messages page loads
        await expect(page).toHaveURL(/\/app\/communication\/messages\/archived/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display assigned-to-me messages tab',
      async ({ page }) => {
        // GIVEN: User navigates to assigned-to-me messages
        await page.goto('/app/communication/messages/assignToMe');

        // THEN: Assign-to-me messages page loads
        await expect(page).toHaveURL(/\/app\/communication\/messages\/assignToMe/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should display pinned messages tab',
      async ({ page }) => {
        // GIVEN: User navigates to pinned messages
        await page.goto('/app/communication/messages/pin');

        // THEN: Pinned messages page loads
        await expect(page).toHaveURL(/\/app\/communication\/messages\/pin/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );
  });

  test.describe('Fax', () => {
    test(
      'should display the incoming fax page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to incoming faxes
        await page.goto('/app/communication/fax/incoming');

        // THEN: Incoming fax page loads
        await expect(page).toHaveURL(/\/app\/communication\/fax\/incoming/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show incoming fax list or empty state',
      async ({ page }) => {
        // GIVEN: User is on the incoming fax page
        await page.goto('/app/communication/fax/incoming');
        await expect(page).toHaveURL(/\/app\/communication\/fax\/incoming/, { timeout: 15_000 });

        // THEN: Fax list or empty-state visible
        const content = page
          .locator('table').first()
          .or(page.getByText(/no fax|no incoming|no data/i).first())
          .or(page.locator('[class*="fax"],[class*="list"]').first());
        await expect(content.first()).toBeVisible({ timeout: 15_000 });
      },
    );

    test(
      'should display the outgoing fax page @smoke',
      async ({ page }) => {
        // GIVEN: User navigates to outgoing faxes
        await page.goto('/app/communication/fax/outgoing');

        // THEN: Outgoing fax page loads
        await expect(page).toHaveURL(/\/app\/communication\/fax\/outgoing/, { timeout: 15_000 });
        await expect(page.locator('body')).toBeVisible();
      },
    );

    test(
      'should show fax navigation tabs (Incoming / Outgoing)',
      async ({ page }) => {
        // GIVEN: User is on the fax section
        await page.goto('/app/communication/fax/incoming');
        await expect(page).toHaveURL(/\/app\/communication\/fax/, { timeout: 15_000 });

        // THEN: Fax tab navigation is visible
        const tab = page
          .getByRole('tab', { name: /incoming|outgoing/i })
          .or(page.getByText(/outgoing/i).first());
        await expect(tab.first()).toBeVisible({ timeout: 10_000 });
      },
    );
  });
});
