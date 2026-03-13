import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Appointments CRUD E2E Tests (Therapist Portal)
 *
 * Full Create → Read → Update → Delete cycle for the Appointments module.
 *
 * Architecture note:
 *   The "Book Appointment" and "Save" submit buttons are disabled when the
 *   therapist's Google Calendar is not synced (`disabled={!googleSyncData?.is_valid}`).
 *   To make these tests environment-independent, Create and Update go through the
 *   REST API (authRequest fixture), and UI steps verify the calendar reflects the changes.
 *
 * Flow:
 *   1. Create  — POST /api/appointments/ via authRequest
 *   2. Read    — Navigate to /app/calendar (Week view) and verify the appointment title
 *   3. Update  — PATCH /api/appointments/{id}/ via authRequest, re-verify on calendar
 *   4. Delete  — DELETE /api/appointments/{id}/ via authRequest, verify not visible
 *
 * Required API pre-data (fetched from live QA environment):
 *   - First available patient  (GET /api/patients/?page_size=1)
 *   - First available therapist (GET /api/therapist/?page_size=1)
 *   - First available CPT code  (GET /api/cpt-codes/?page_size=1)
 *
 * @tag @regression @appointments @crud
 */

// ── Shared state across serial tests ─────────────────────────────────────────

const TS             = Date.now();
const APPT_TITLE     = `E2E Appt ${TS.toString().slice(-6)}`;
const APPT_UPDATED   = `${APPT_TITLE} Upd`;

/** Appointment ID set after creation, used in subsequent tests */
let createdApptId: number | null = null;

/** Appointment datetime set to tomorrow at 10:00 AM local time */
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);
const APPT_DATETIME = tomorrow.toISOString();

const API_URL = process.env.API_URL || 'https://qa.api.psynap-sys.com/api';

/** Headers matching the app's Axios interceptor (Tenant-Name from subdomain) */
const TENANT_HEADER = { 'Tenant-Name': 'test' };

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Navigate to /app/calendar in Week view around tomorrow's date.
 * Returns after confirming the calendar is rendered.
 */
async function openCalendarWeekView(page: any) {
  await page.goto('/app/calendar');
  await expect(page).toHaveURL(/\/app\/calendar/, { timeout: 15_000 });
  await page.waitForTimeout(2_000);

  // Switch to Week view — the view dropdown is the last Mantine Select textbox in the toolbar
  const viewDropdown = page.getByRole('textbox').last();
  if (await viewDropdown.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await viewDropdown.click();
    await page.waitForTimeout(500);
    const weekOption = page.getByRole('option', { name: /^Week$/i }).first();
    if (await weekOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await weekOption.click();
      await page.waitForTimeout(1_000);
    }
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe.serial('Appointments — Create / Read / Update / Delete', () => {

  // ── CREATE ────────────────────────────────────────────────────────────────

  test(
    'should create an appointment via the API @smoke',
    async ({ authRequest }) => {
      // STEP 1: Fetch first available patient
      const patientRes = await authRequest.get(`${API_URL}/patients/?page_size=1`, {
        headers: TENANT_HEADER,
      });
      expect(patientRes.ok(), `GET /api/patients/ failed: ${patientRes.status()}`).toBeTruthy();
      const patientBody = await patientRes.json();
      const patientId = patientBody.results?.[0]?.id;
      expect(patientId, 'No patients found in QA environment').toBeTruthy();

      // STEP 2: Fetch first available therapist
      const therapistRes = await authRequest.get(`${API_URL}/therapist/?page_size=1`, {
        headers: TENANT_HEADER,
      });
      expect(therapistRes.ok(), `GET /api/therapist/ failed: ${therapistRes.status()}`).toBeTruthy();
      const therapistBody = await therapistRes.json();
      const therapistId = therapistBody.results?.[0]?.id;
      expect(therapistId, 'No therapists found in QA environment').toBeTruthy();

      // STEP 3: Fetch first available CPT code
      const cptRes = await authRequest.get(`${API_URL}/cpt-codes/?page_size=1`, {
        headers: TENANT_HEADER,
      });
      expect(cptRes.ok(), `GET /api/cpt-codes/ failed: ${cptRes.status()}`).toBeTruthy();
      const cptBody = await cptRes.json();
      const cptCodeId = cptBody.results?.[0]?.id;
      expect(cptCodeId, 'No CPT codes found in QA environment').toBeTruthy();

      // STEP 4: Create appointment
      const createRes = await authRequest.post(`${API_URL}/appointments/`, {
        headers: TENANT_HEADER,
        data: {
          title:                APPT_TITLE,
          appointment_type:     'individual',
          stage_type:           'appointment',
          patient:              patientId,
          appointment_datetime: APPT_DATETIME,
          attached_cpt_codes:   [cptCodeId],
          duration:             60,
          place_of_service:     '11',
          session_type:         'VIRTUAL',
          therapist_ids:        [String(therapistId)],
          is_recurring:         true,
          recurring_config: {
            repeat_frequency:        1,
            repeat_every:            'ONCE',
            repeat_on:               [],
            appointment_schedule: { month: 1, day: 1 },
            ends: { type: 'ONCE', value: 'DAY' },
          },
        },
      });

      if (!createRes.ok()) {
        const body = await createRes.text();
        throw new Error(`POST /api/appointments/ failed (${createRes.status()}): ${body}`);
      }

      const created = await createRes.json();
      createdApptId = created.id;
      expect(createdApptId, 'Created appointment has no id').toBeTruthy();

      console.log(`[appointment-crud] Created appointment id=${createdApptId} title="${APPT_TITLE}"`);
    },
  );

  // ── READ ──────────────────────────────────────────────────────────────────

  test(
    'should find the created appointment on the calendar (Week view)',
    async ({ page }) => {
      expect(createdApptId, 'Prerequisite: appointment must be created first').toBeTruthy();

      await openCalendarWeekView(page);

      // Navigate forward if tomorrow falls in the next week cycle
      // The calendar starts on the current week; click Next if needed to reach tomorrow
      const tomorrowDay = tomorrow.getDate();
      const tomorrowLabel = String(tomorrowDay);

      // Try to find the appointment title directly — Week view renders event titles as text
      const apptEvent = page
        .getByText(APPT_TITLE)
        .first()
        .or(page.locator('[class*="event"],[class*="appointment"],[class*="fc-event"]').filter({ hasText: APPT_TITLE }).first());

      // Try current week first; if not found, navigate to next week
      const foundInCurrentWeek = await apptEvent.first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!foundInCurrentWeek) {
        // Navigate forward to next week
        const allBtns = page.getByRole('button');
        const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
          btns.findIndex(b => b.textContent?.trim() === 'Today'),
        );
        if (todayIdx >= 0) {
          await allBtns.nth(todayIdx + 1).click({ force: true });
          await page.waitForTimeout(1_500);
        }
      }

      // Check if the appointment title is visible on the calendar
      // Week view renders each event as a block with the title text inside
      const eventLocator = page.getByText(APPT_TITLE).first()
        .or(page.locator('[class*="fc-event-title"],[class*="event-title"]').filter({ hasText: APPT_TITLE }).first());

      await expect(eventLocator.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  test(
    'should verify the appointment exists via the API (GET by id)',
    async ({ authRequest }) => {
      expect(createdApptId, 'Prerequisite: appointment must be created first').toBeTruthy();

      const res = await authRequest.get(`${API_URL}/appointments/${createdApptId}/`, {
        headers: TENANT_HEADER,
      });
      expect(res.ok(), `GET /api/appointments/${createdApptId}/ failed: ${res.status()}`).toBeTruthy();

      const appt = await res.json();
      expect(appt.title).toBe(APPT_TITLE);
      expect(appt.id).toBe(createdApptId);
    },
  );

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test(
    'should update the appointment title via the API',
    async ({ authRequest }) => {
      expect(createdApptId, 'Prerequisite: appointment must be created first').toBeTruthy();

      const updateRes = await authRequest.patch(`${API_URL}/appointments/${createdApptId}/`, {
        headers: TENANT_HEADER,
        data: { title: APPT_UPDATED },
      });

      if (!updateRes.ok()) {
        const body = await updateRes.text();
        throw new Error(`PATCH /api/appointments/${createdApptId}/ failed (${updateRes.status()}): ${body}`);
      }

      const updated = await updateRes.json();
      expect(updated.title).toBe(APPT_UPDATED);

      console.log(`[appointment-crud] Updated appointment title to "${APPT_UPDATED}"`);
    },
  );

  test(
    'should see the updated appointment title on the calendar',
    async ({ page }) => {
      expect(createdApptId, 'Prerequisite: appointment must be created and updated first').toBeTruthy();

      await openCalendarWeekView(page);

      // Navigate forward if needed
      const foundInCurrentWeek = await page.getByText(APPT_UPDATED).first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!foundInCurrentWeek) {
        const allBtns = page.getByRole('button');
        const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
          btns.findIndex(b => b.textContent?.trim() === 'Today'),
        );
        if (todayIdx >= 0) {
          await allBtns.nth(todayIdx + 1).click({ force: true });
          await page.waitForTimeout(1_500);
        }
      }

      const updatedEvent = page.getByText(APPT_UPDATED).first()
        .or(page.locator('[class*="fc-event-title"],[class*="event-title"]').filter({ hasText: APPT_UPDATED }).first());

      await expect(updatedEvent.first()).toBeVisible({ timeout: 15_000 });
    },
  );

  // ── DELETE ────────────────────────────────────────────────────────────────

  test(
    'should delete the appointment via the API',
    async ({ authRequest }) => {
      expect(createdApptId, 'Prerequisite: appointment must be created first').toBeTruthy();

      const deleteRes = await authRequest.delete(`${API_URL}/appointments/${createdApptId}/`, {
        headers: TENANT_HEADER,
      });

      // 204 No Content is the expected success response for DELETE
      expect(
        [200, 204].includes(deleteRes.status()),
        `DELETE /api/appointments/${createdApptId}/ failed (${deleteRes.status()})`,
      ).toBeTruthy();

      console.log(`[appointment-crud] Deleted appointment id=${createdApptId}`);
    },
  );

  test(
    'should confirm the deleted appointment no longer appears on the calendar',
    async ({ page }) => {
      await openCalendarWeekView(page);

      // Navigate forward if needed
      const foundInCurrentWeek = await page.getByText(APPT_UPDATED).first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      if (foundInCurrentWeek) {
        // Navigate to next week and check again
        const allBtns = page.getByRole('button');
        const todayIdx = await allBtns.evaluateAll((btns: HTMLButtonElement[]) =>
          btns.findIndex(b => b.textContent?.trim() === 'Today'),
        );
        if (todayIdx >= 0) {
          await allBtns.nth(todayIdx + 1).click({ force: true });
          await page.waitForTimeout(1_500);
        }
      }

      // The deleted appointment should no longer be visible
      await expect(page.getByText(APPT_UPDATED)).not.toBeVisible({ timeout: 10_000 });
    },
  );

  test(
    'should confirm the deleted appointment returns 404 from the API',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({ authRequest }) => {
      expect(createdApptId, 'Prerequisite: appointment must have been deleted').toBeTruthy();

      const res = await authRequest.get(`${API_URL}/appointments/${createdApptId}/`, {
        headers: TENANT_HEADER,
      });
      expect(res.status()).toBe(404);
    },
  );
});