# PSYNAPSYS E2E Test Coverage Report

**Framework:** Playwright + TypeScript
**Environment:** QA — `https://test.qa.app.psynap-sys.com`
**Total Tests:** 194 across 14 spec files / 5 browser projects
**Status:** ✅ 194/194 Passing
**Last Updated:** 2026-02-26

---

## Projects (Browser × Role Matrix)

| Project | Browser | Auth Role | Test Scope | Tests |
|---|---|---|---|---|
| `therapist-chrome` | Desktop Chrome | Therapist/Staff | All therapist portal tests | 114 |
| `therapist-firefox` | Desktop Firefox | Therapist/Staff | `@smoke` tagged only | 32 |
| `client-chrome` | Desktop Chrome | Client/Patient | All client portal tests | 36 |
| `client-mobile` | Pixel 5 (mobile) | Client/Patient | `@smoke` tagged only | 12 |
| **Total** | | | | **194** |

---

## Module Coverage

---

### 1. Authentication
**Spec file:** `e2e/auth/login.spec.ts`
**Portal:** Therapist
**Tests:** 4
**Tags:** `@smoke @auth`

| # | Test | What It Validates |
|---|---|---|
| 1 | Login with valid credentials → redirect to `/app/` | Successful login flow end-to-end |
| 2 | Login with invalid credentials → error message | Error handling for wrong password |
| 3 | Submit empty form → validation errors | Client-side form validation |
| 4 | Unauthenticated access to protected route → redirect to login | Auth guard / route protection |

**What was done:**
- Tests start with empty storage state (no pre-loaded auth) so the login form is actually shown
- Uses `LoginPage` page object for reusable login interactions
- `skipNetworkMonitoring` annotation on invalid-credentials test to suppress expected 400 API error

---

### 2. Auth API (REST Endpoints)
**Spec file:** `e2e/api/auth.spec.ts`
**Portal:** Therapist (via `page.request` in Chromium browser context)
**Tests:** 5
**Tags:** `@smoke @api`

| # | Test | What It Validates |
|---|---|---|
| 1 | `POST /api/auth/login/` with valid credentials → 200 + JWT tokens | Login API returns `access` + `refresh` tokens |
| 2 | `POST /api/auth/login/` with invalid credentials → 400/401 | Error response for bad credentials |
| 3 | `POST /api/auth/login/` with missing email field → 400 | Field-level validation |
| 4 | `POST /api/auth/token/refresh/` with valid refresh token → 200 + new access token | Token refresh flow |
| 5 | `POST /api/auth/token/refresh/` with invalid token → 401 | Expired/invalid token rejection |

**What was done:**
- Discovered real API URL: `https://qa.api.psynap-sys.com/api` (not the frontend CDN domain)
- Required `Tenant-Name: test` header (multi-tenant Django middleware)
- Correct refresh endpoint: `/api/auth/token/refresh/` (not `/auth/refresh/`)
- API tests run under `therapist-chrome` project (browser context) because QA CDN/WAF blocks non-browser HTTP clients with HTTP 403

---

### 3. Therapist Dashboard
**Spec file:** `e2e/dashboard/dashboard.spec.ts`
**Portal:** Therapist
**Tests:** 3
**Tags:** `@regression @dashboard`

| # | Test | What It Validates |
|---|---|---|
| 1 | Dashboard page loads at `/app/dashboard` @smoke | Page renders after login |
| 2 | Dashboard shows widgets / summary cards @smoke | Content (headings, stat cards) visible |
| 3 | App navigation accessible from dashboard | Sidebar links to core modules present |

**What was done:**
- Verifies the main post-login landing page renders with meaningful content

---

### 4. Appointments — Calendar
**Spec files:** `e2e/appointments/appointments.spec.ts`, `e2e/appointments/calendar-tabs.spec.ts`
**Portal:** Therapist
**Tests:** 3 + 8 = 11
**Tags:** `@regression @appointments`

| # | Test | What It Validates |
|---|---|---|
| 1 | Calendar page loads at `/app/calendar` @smoke | Main calendar view renders |
| 2 | Calendar navigation controls visible @smoke | Month/Week/Day/Today/Prev/Next buttons present |
| 3 | `/app/appointments` resolves (may redirect to calendar) | Route works |
| 4 | Appointment sub-tab loads at `/app/calendar/appointment` @smoke | Appointment list tab renders |
| 5 | Appointment list shows table or empty state | Content verification |
| 6 | Incomplete session notes tab loads @smoke | `/app/calendar/appointment/incomplete-session-note` |
| 7 | Incomplete session notes shows content | Table or empty state visible |
| 8 | To-be-reviewed tab loads | `/app/calendar/appointment/to-be-reviewed` |
| 9 | Uncharted appointments tab loads | `/app/calendar/appointment/uncharted` |
| 10 | Unsigned visits page loads @smoke | `/app/calendar/unsigned-visits` |
| 11 | Unsigned visits shows table or empty state | Content verification |

---

### 5. Patient (Client) Management
**Spec files:** `e2e/patients/patient-management.spec.ts`, `e2e/patients/client-detail.spec.ts`
**Portal:** Therapist
**Tests:** 5 + 32 = 37
**Tags:** `@regression @patients`

#### 5a. Client List (`patient-management.spec.ts`)
| # | Test | What It Validates |
|---|---|---|
| 1 | Client list page loads at `/app/client` @smoke | Table renders |
| 2 | Table has expected columns | Client Name column visible |
| 3 | Search/filter input present | Searchbox or placeholder visible |
| 4 | Add Client button present @smoke | Create action available |
| 5 | Click client name → navigates to client dashboard | Navigation to `/app/client/{id}/dashboard` |

#### 5b. Client Detail Sub-Tabs (`client-detail.spec.ts`)
A real `clientId` is resolved dynamically at runtime from the first row of the client list (no hardcoded IDs). All tests are read-only.

| Section | Sub-Tab | URL | Tests |
|---|---|---|---|
| Profile | Profile form | `/app/client/{id}/profile` | 2 |
| History | Appointment history | `/app/client/{id}/appointment-history` | 1 |
| Billings | Claims | `/app/client/{id}/billings/claims` | 1 |
| Billings | Encounters | `/app/client/{id}/billings/encounters` | 1 |
| Billings | Invoices | `/app/client/{id}/billings/invoices` | 1 |
| Billings | Payment History | `/app/client/{id}/billings/payment-histoy` | 1 |
| Billings | Statements | `/app/client/{id}/billings/statements` | 1 |
| Billings | Superbill | `/app/client/{id}/billings/superbill` | 1 |
| Biopsychosocial | Development History | `/app/client/{id}/biopsychosocial_history/development-history` | 1 |
| Biopsychosocial | Family History | `/app/client/{id}/biopsychosocial_history/family-history` | 1 |
| Biopsychosocial | Medication History | `/app/client/{id}/biopsychosocial_history/medication-history` | 1 |
| Biopsychosocial | Mental Health History | `/app/client/{id}/biopsychosocial_history/mental-history` | 1 |
| Biopsychosocial | Other History | `/app/client/{id}/biopsychosocial_history/other-history` | 1 |
| Biopsychosocial | Social History | `/app/client/{id}/biopsychosocial_history/social-history` | 1 |
| Biopsychosocial | Substance Use History | `/app/client/{id}/biopsychosocial_history/substance-use-history` | 1 |
| Biopsychosocial | Surgical History | `/app/client/{id}/biopsychosocial_history/surgical-history` | 1 |
| Forms | Assigned Forms | `/app/client/{id}/forms/assigned` | 1 |
| Forms | Completed Forms | `/app/client/{id}/forms/completed` | 1 |
| Payment | Card Details | `/app/client/{id}/payment/card-details` | 1 |
| Payment | Eligibility | `/app/client/{id}/payment/eligibility` | 1 |
| Payment | Insurance | `/app/client/{id}/payment/insurance` | 1 |
| Payment | Prior Authorization | `/app/client/{id}/payment/prior-authorization` | 1 |
| Records | Client Records | `/app/client/{id}/records/client-records` | 1 |
| Records | Notes | `/app/client/{id}/records/notes` | 1 |
| Records | Tasks | `/app/client/{id}/records/task` | 1 |
| Records | Treatment Plans | `/app/client/{id}/records/treatment-plans` | 1 |
| Records | Visit Notes | `/app/client/{id}/records/visit-notes` | 1 |
| Referrals | Referral In | `/app/client/{id}/referrals/referral_in` | 1 |
| Referrals | Referral Out | `/app/client/{id}/referrals/referral_out` | 1 |
| Vitals | Vitals & Assessment | `/app/client/{id}/vitals-assessment` | 1 |
| Client List | Consultation Tab | `/app/client/consultation` | 1 |
| Client List | Waitlist Tab | `/app/client/waitlist` | 1 |

---

### 6. Intake Forms
**Spec file:** `e2e/intake-forms/intake-form.spec.ts`
**Portal:** Therapist
**Tests:** 3 (+ covered further in Client Detail)
**Tags:** `@regression @intake-forms`

| # | Test | What It Validates |
|---|---|---|
| 1 | Custom Forms settings page loads @smoke | `/app/setting/custom-forms` renders |
| 2 | Custom forms page shows form-related content | Heading or template list visible |
| 3 | Client intake forms page loads for a real client | `/app/client/{id}/forms/intake` navigates correctly |

---

### 7. Billing Module
**Spec file:** `e2e/billing/billing.spec.ts`
**Portal:** Therapist
**Tests:** 12
**Tags:** `@regression @billing`

| # | Sub-Section | URL | What It Validates |
|---|---|---|---|
| 1-2 | Billing Index | `/app/billing` | Page loads, tab navigation visible |
| 3-4 | Claims List | `/app/billing/claims` | Page loads, table/data visible @smoke |
| 5 | Claims — Action Button | `/app/billing/claims` | "Generate Batch Claim" button present |
| 6 | Claims — Create Claim Form | `/app/billing/claims/create-claim` | Create form route resolves |
| 7-8 | Charges | `/app/billing/charges` | Page loads, table/content visible @smoke |
| 9 | Invoices | `/app/billing/invoices` | Page loads |
| 10 | Receipts | `/app/billing/receipts` | Page loads |
| 11 | Payment History | `/app/billing/payment-history` | Page loads |
| 12 | Batch Claims | `/app/billing/batch-claims` | Page loads |
| 13-14 | ERAs (e-Claims) | `/app/billing/ers` | Page loads, table/empty state visible |

**What was done:**
- Read-only — no claims submitted or financial records modified
- Fixed: original test looked for "Create Claim" button which doesn't exist; claims are generated from encounters. Updated to check for actual "Generate Batch Claim" button

---

### 8. Communication
**Spec file:** `e2e/communication/communication.spec.ts`
**Portal:** Therapist
**Tests:** 10
**Tags:** `@regression @communication`

| # | Sub-Section | URL | What It Validates |
|---|---|---|---|
| 1 | Messages — All @smoke | `/app/communication/messages/all` | Page loads |
| 2 | Messages — Inbox UI | `/app/communication/messages/all` | Message list or empty state visible |
| 3 | Messages — Tab navigation | `/app/communication/messages/all` | All/Archived/Assigned/Pinned tabs visible |
| 4 | Messages — Archived | `/app/communication/messages/archived` | Page loads |
| 5 | Messages — Assigned To Me | `/app/communication/messages/assignToMe` | Page loads |
| 6 | Messages — Pinned | `/app/communication/messages/pin` | Page loads |
| 7 | Fax — Incoming @smoke | `/app/communication/fax/incoming` | Page loads |
| 8 | Fax — Incoming content | `/app/communication/fax/incoming` | List or empty state visible |
| 9 | Fax — Outgoing @smoke | `/app/communication/fax/outgoing` | Page loads |
| 10 | Fax — Tab navigation | `/app/communication/fax/incoming` | Incoming/Outgoing tabs visible |

**What was done:**
- Read-only — no messages sent, no faxes transmitted

---

### 9. Settings
**Spec file:** `e2e/settings/settings.spec.ts`
**Portal:** Therapist
**Tests:** 22
**Tags:** `@regression @settings`

| # | Sub-Section | URL | Tests |
|---|---|---|---|
| 1 | Settings Index | `/app/setting` | 1 |
| 2-3 | My Profile | `/app/setting/profile` | 2 (page + form fields) |
| 4-5 | Staff Settings | `/app/setting/staff-setting` | 2 (page + staff table) |
| 6 | Availability | `/app/setting/availability` | 1 |
| 7 | Work Location | `/app/setting/work-location` | 1 |
| 8-9 | Roles & Permissions | `/app/setting/roles-permission` | 2 (page + roles content) |
| 10-11 | CPT Codes | `/app/setting/CPT-code` | 2 (page + code list) @smoke |
| 12 | ICD-10 Codes | `/app/setting/ICD-10-code` | 1 |
| 13 | Custom Forms | `/app/setting/custom-forms` | 1 @smoke |
| 14-15 | Insurance Companies | `/app/setting/insurance-companies` | 2 (page + company list) @smoke |
| 16 | Macros | `/app/setting/macros` | 1 |
| 17 | Appointment Notifications | `/app/setting/appointment-notifications` | 1 |
| 18 | Cancellation Policy | `/app/setting/cancellation-policy` | 1 |
| 19 | Print Configuration | `/app/setting/print-configuration` | 1 |
| 20-21 | Audit Logs | `/app/setting/audit-logs` | 2 (page + log table) @smoke |
| 22-23 | Data Import — CPT | `/app/setting/data-import/CPT-code-import-history-list` | 1 |
| 24 | Data Import — ICD | `/app/setting/data-import/ICD-code-import-history` | 1 |

---

### 10. Tasks
**Spec file:** `e2e/tasks/tasks.spec.ts`
**Portal:** Therapist
**Tests:** 3
**Tags:** `@regression @tasks`

| # | Test | What It Validates |
|---|---|---|
| 1 | Tasks page loads at `/app/tasks` @smoke | Page renders |
| 2 | Tasks list or empty state visible @smoke | Table or empty state present |
| 3 | Add task button present | Create task action available |

---

### 11. Client Portal — Core
**Spec file:** `e2e/client/client-portal.spec.ts`
**Portal:** Client/Patient
**Tests:** 7
**Tags:** `@smoke @client`

| # | Test | What It Validates |
|---|---|---|
| 1 | Dashboard loads at `/client-app/dashboard` @smoke | Client portal renders |
| 2 | Dashboard shows portal navigation links @smoke | Nav links (Appointments, Forms, etc.) visible |
| 3 | Upcoming appointments page loads @smoke | `/client-app/appointments/upcoming` |
| 4 | Appointments navigation tabs visible @smoke | Upcoming/Past/Requested tabs |
| 5 | Forms page loads (pending forms) @smoke | `/client-app/forms/not-completed` |
| 6 | Billing page loads | `/client-app/billings` |
| 7 | Settings page loads | `/client-app/settings` |

---

### 12. Client Portal — Extended Coverage
**Spec file:** `e2e/client/client-portal-extended.spec.ts`
**Portal:** Client/Patient
**Tests:** 27
**Tags:** `@regression @client`

| Section | Sub-Section | URL | Tests |
|---|---|---|---|
| Home | Home page | `/client-app/home` | 2 |
| Appointments | Past appointments | `/client-app/appointments/past` | 2 |
| Appointments | Requested appointments | `/client-app/appointments/requested` | 1 @smoke |
| Appointments | Cancel requests | `/client-app/appointments/requested/cancel-requests` | 1 |
| Appointments | Reschedule requests | `/client-app/appointments/requested/reschedule-requests` | 1 |
| Forms | Completed forms | `/client-app/forms/completed-forms` | 2 @smoke |
| Forms | Intake form tab | `/client-app/forms/intake-form` | 1 |
| Billings | Invoices | `/client-app/billings/invoices` | 1 @smoke |
| Billings | Payment history | `/client-app/billings/payment-history` | 1 |
| Billings | Receipts | `/client-app/billings/receipts` | 1 |
| Billings | Statements | `/client-app/billings/statements` | 1 |
| Billings | Cards | `/client-app/billings/cards` | 1 |
| Client Records | Records viewer | `/client-app/client-records` | 2 @smoke |
| Treatment Plans | Plans list | `/client-app/treatment-plans` | 2 @smoke |
| Settings | Profile | `/client-app/settings/profile` | 2 @smoke |
| Settings | Insurance | `/client-app/settings/insurance` | 1 @smoke |
| Settings | Payment cards | `/client-app/settings/cards` | 1 @smoke |

**What was done:**
- Fixed: Past appointments page uses a **card layout** (not a table). Original `[class*="list"]` selector matched a hidden Mantine tab list element. Updated to check for `COMPLETED`/`CANCELLED` status badges that are always visible in the cards.

---

## Architecture & Key Technical Decisions

### Two-Domain Architecture
| Domain | URL | Purpose |
|---|---|---|
| Frontend SPA | `test.qa.app.psynap-sys.com` | React 19 + TanStack Router + Mantine UI (behind CDN/WAF) |
| API Server | `qa.api.psynap-sys.com` | Django 5.1.8 REST + simplejwt |

The CDN/WAF on the frontend domain **blocks all direct API calls** (returns HTTP 403). API tests must use `page.request` within a browser project (Chromium) to bypass this.

### Required API Headers
Every API request must include:
```
Content-Type: application/json
Tenant-Name: test          ← multi-tenant routing (derived from subdomain)
Accept: application/json, text/plain, */*
```

### Auth Storage
- Auth state stored in **localStorage** only (`tanstack.auth.user`)
- Cookie array is always empty
- `auth-sessions/therapist.json` and `auth-sessions/client.json` hold the pre-authenticated state

### Selector Strategy
The app has **no `data-testid` attributes**. All selectors use:
- `getByRole()` — semantic roles (button, link, tab, row, textbox)
- `getByText()` — visible text labels and headings
- `toHaveURL()` — URL pattern matching for navigation verification
- `locator('table')` — for data grids
- `force: true` on clicks — Mantine sticky header can occlude table rows

---

## What Is NOT Automated (Intentionally Excluded)

| Flow | Reason |
|---|---|
| Password reset / Forgot password | Requires real email delivery |
| Register new account | Creates permanent data |
| Public intake form (unauthenticated) | Requires backend-generated UUID links per patient |
| Creating / submitting billing claims | Financial record side-effects |
| Sending messages or faxes | Live communication side-effects |
| Creating encounters / session notes | Clinical record side-effects |
| Data CSV import | Database mutation |
| Encounter detail view | Requires real encounter ID from backend |

---

## File Structure

```
psynapsys-e2e/
├── e2e/
│   ├── api/
│   │   └── auth.spec.ts               ← Auth API (JWT login + refresh)
│   ├── appointments/
│   │   ├── appointments.spec.ts        ← Calendar main view
│   │   └── calendar-tabs.spec.ts       ← Calendar sub-tabs
│   ├── auth/
│   │   └── login.spec.ts              ← Login / auth guard
│   ├── billing/
│   │   └── billing.spec.ts            ← All billing pages
│   ├── client/
│   │   ├── client-portal.spec.ts      ← Client portal core
│   │   └── client-portal-extended.spec.ts ← Client portal full coverage
│   ├── communication/
│   │   └── communication.spec.ts      ← Messages + Fax
│   ├── dashboard/
│   │   └── dashboard.spec.ts          ← Therapist dashboard
│   ├── intake-forms/
│   │   └── intake-form.spec.ts        ← Form templates + client intake
│   ├── patients/
│   │   ├── patient-management.spec.ts ← Client list
│   │   └── client-detail.spec.ts      ← All client detail sub-tabs
│   ├── settings/
│   │   └── settings.spec.ts           ← All settings pages
│   └── tasks/
│       └── tasks.spec.ts              ← Tasks module
├── support/
│   ├── merged-fixtures.ts             ← Combined test fixtures
│   └── page-objects/
│       └── login-page.ts              ← Login page object
├── auth-sessions/
│   ├── therapist.json                 ← Pre-authenticated therapist state
│   └── client.json                    ← Pre-authenticated client state
├── global-setup.ts                    ← Authenticates both users before tests
├── playwright.config.ts               ← Main Playwright configuration
├── .env.local                         ← Real credentials (gitignored)
└── .env.example                       ← Fallback env template
```

---

## How to Run

```bash
# Full suite (all 5 projects)
npx playwright test

# Therapist portal only
npx playwright test --project=therapist-chrome

# Client portal only
npx playwright test --project=client-chrome

# Smoke tests only (fast — Firefox + Mobile)
npx playwright test --project=therapist-firefox --project=client-mobile

# Specific module
npx playwright test e2e/billing/

# Single spec file
npx playwright test e2e/patients/client-detail.spec.ts

# Open HTML report
npx playwright show-report
```
