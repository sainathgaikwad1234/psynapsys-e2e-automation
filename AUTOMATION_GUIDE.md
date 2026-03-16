# PSYNAPSYS — Automated Testing Guide

> **Who is this for?**
> This document is written for everyone — managers, customers, business stakeholders, QA engineers, and developers.
> No technical background is required to understand the first half. Technical details are clearly marked.

---

## At a Glance

| What | Details |
|------|---------|
| **Application** | PSYNAPSYS — Electronic Health Records (EHR) system |
| **What we test** | Every major feature a therapist or patient uses every day |
| **How we test** | Automated robots that click buttons, fill forms, and verify results — just like a real user |
| **Where we test** | The live QA (test) environment at `test.qa.app.psynap-sys.com` |
| **How often** | Can be run at any time — on demand or automatically before every release |
| **Test count** | 300+ individual test checks across 68 test scripts |
| **Time to run** | ~25–30 minutes for the full suite; ~5 minutes for smoke tests |

---

## What Is Automated Testing?

Think of automated testing like hiring a robot quality inspector.

Instead of a human sitting at a computer and manually clicking through every screen of the application before each release, we have **automated test scripts** that do it automatically. These scripts:

- Open a real web browser
- Log in as a real user (therapist or patient)
- Navigate to every important screen
- Fill in forms with test data
- Click buttons and verify the right things happen
- Report any failures immediately

**Why does this matter?**
- Catches bugs before they reach real users
- Provides confidence before every release
- Runs in 30 minutes what would take a human team days to manually verify
- Runs consistently — no human fatigue, no steps skipped
- Can be re-run instantly whenever code changes

---

## The Two Portals We Test

PSYNAPSYS has two completely separate user interfaces:

### 🩺 Therapist Portal
**Who uses it:** Therapists, staff, administrators, billing teams

**What it does:** The main clinical management system — managing patients, scheduling appointments, handling billing, writing notes, managing settings.

**URL:** `https://test.qa.app.psynap-sys.com/app/`

---

### 👤 Client Portal
**Who uses it:** Patients (clients)

**What it does:** The patient-facing interface — viewing appointments, filling out intake forms, checking invoices, updating personal information.

**URL:** `https://test.qa.app.psynap-sys.com/client-app/`

---

## What Gets Tested — Feature by Feature

### Therapist Portal Features

#### ✅ Login & Security
Tests that the login system works correctly and protects sensitive data.

| What We Check | Why It Matters |
|--------------|----------------|
| Logging in with correct credentials works | Therapists can access the system |
| Wrong password shows an error message | Security — no unauthorized access |
| Empty form submission shows validation errors | Prevents bad data entry |
| Trying to access pages without logging in redirects to login | Protects patient data (HIPAA compliance) |

---

#### ✅ Dashboard
The first screen therapists see after logging in.

| What We Check | Why It Matters |
|--------------|----------------|
| Dashboard loads successfully | Therapists can start their day |
| Summary widgets and stats are visible | At-a-glance overview works |
| Navigation links to all modules work | Therapists can reach any part of the system |

---

#### ✅ Patient (Client) Management
The most critical module — managing patient records.

**We test the full lifecycle:**

```
Create Patient → View Patient → Update Patient Info → Delete Patient
```

**We also verify every single patient sub-section loads correctly:**

| Section | Sub-Pages Tested |
|---------|-----------------|
| **Profile** | Personal info, contact details |
| **Appointment History** | Past and upcoming appointments |
| **Billing** | Claims, Encounters, Invoices, Payment History, Statements, Superbill |
| **Biopsychosocial History** | Development, Family, Medication, Mental Health, Other, Social, Substance Use, Surgical History |
| **Forms** | Assigned forms, Completed forms, Intake forms |
| **Payment** | Card Details, Eligibility, Insurance, Prior Authorization |
| **Records** | Client Records, Notes, Tasks, Treatment Plans, Visit Notes |
| **Referrals** | Referral In, Referral Out |
| **Vitals** | Vitals & Assessment records |
| **Other** | Consultation tab, Waitlist tab |

**Individual CRUD (Create, Read, Update, Delete) tests exist for:**
- Patient records
- Insurance information
- Documents (including PDF uploads)
- Medications
- Vitals & Assessments
- Prior Authorizations
- Out-Referrals
- Care Team (Assigned Therapist)
- Surgical, Family, Substance Use, Development, Mental, Other History
- Medical Conditions
- Doctor Information

---

#### ✅ Appointments & Calendar
| What We Check | Why It Matters |
|--------------|----------------|
| Calendar loads with Month/Week/Day views | Therapists can see their schedule |
| Navigation (Previous/Next/Today) works | Browsing the calendar works |
| Appointment list tabs load | Viewing scheduled appointments works |
| Incomplete session notes tab | Therapists can track pending documentation |
| Unsigned visits page | Compliance — tracking unsigned records |

---

#### ✅ Intake Forms & Custom Forms
| What We Check | Why It Matters |
|--------------|----------------|
| Custom forms settings page loads | Admins can manage form templates |
| Client intake forms page loads | Therapists can view patient submissions |
| Form assignment workflow works | Forms reach the right patients |

---

#### ✅ Billing Module
All billing pages are tested for correct loading. No financial records are created or modified during testing (read-only).

| Page Tested | Purpose |
|------------|---------|
| Claims | Insurance claim submissions |
| Charges | Service charges |
| Invoices | Patient invoices |
| Receipts | Payment receipts |
| Payment History | Historical payments |
| Batch Claims | Bulk claim processing |
| ERAs (Electronic Remittance Advice) | Insurance payment explanations |
| Superbill | Detailed service billing documents |

---

#### ✅ Communication
Tested read-only (no actual messages are sent during testing).

| What We Check |
|--------------|
| Messages — All, Inbox, Archived, Assigned To Me, Pinned |
| Fax — Incoming and Outgoing pages |
| Tab navigation works correctly |

---

#### ✅ Settings
All 20+ settings pages are verified to load. Full create/edit/delete testing for:

| Settings Section | What's Tested |
|-----------------|--------------|
| CPT Codes | Add new codes, edit, delete |
| ICD-10 Codes | Add new codes, edit, delete |
| Cancellation Policies | Create, update, delete policies |
| Insurance Companies | Add insurance, edit details, delete |
| Work Locations | Add office location, edit, delete |
| Macros (text shortcuts) | Create, edit, delete macros |
| Roles & Permissions | Create roles, assign permissions, delete |
| Print Configurations | Upload header images, edit, delete |
| Staff Management | Add staff, edit profiles, remove |
| Availability Schedule | Set working hours, edit |
| Custom Forms | Create, edit, delete form templates |
| Profile Settings | View and edit staff profile |

---

#### ✅ Tasks
| What We Check | Why It Matters |
|--------------|----------------|
| Tasks page loads | Staff can view their task list |
| Task list or empty state shows | Page renders correctly with or without data |
| Full task lifecycle: Create → Edit → Complete → Archive | Task management works end-to-end |

> **Note:** Tasks use "Archive" instead of Delete — the system keeps a record of all tasks.

---

#### ✅ Group Management
| What We Check | Why It Matters |
|--------------|----------------|
| Groups list page loads | Viewing therapy groups works |
| Create a new group (with name, initials, members, CPT codes, therapist) | New groups can be set up |
| Edit an existing group | Group details can be updated |
| Delete a group | Groups can be removed when no longer needed |

---

### Client Portal Features

#### ✅ Core Patient-Facing Pages
| What We Check | Why It Matters |
|--------------|----------------|
| Patient dashboard loads | Patients can access their portal |
| Navigation links (Appointments, Forms, Billing, Settings) work | Patients can reach all their information |
| Upcoming appointments page loads | Patients can see their schedule |
| Pending forms page loads | Patients can complete required forms |
| Billing page loads | Patients can view their invoices |
| Settings page loads | Patients can update their profile |

#### ✅ Extended Patient Portal
| Section | What's Tested |
|---------|--------------|
| Home page | Loads correctly |
| Appointments | Past, Requested, Cancel Requests, Reschedule Requests |
| Forms | Completed forms, Intake form tab |
| Billing | Invoices, Payment history, Receipts, Statements, Cards |
| Client Records | Records viewer |
| Treatment Plans | Plans list |
| Settings | Profile, Insurance, Payment cards |

---

## How Testing Works — Step by Step

### Before Every Test Run

```
1. The testing system logs in as both a Therapist and a Patient
   → Saves the logged-in session so tests don't need to log in every single time
   → This happens automatically, taking about 30–60 seconds

2. The saved sessions are stored securely on the local machine
   → Never committed to version control
   → Credentials stored in a private file (.env.local)
```

### During the Test Run

```
Real browsers open automatically (Chrome, Firefox, or mobile)
  ↓
Navigate to each feature page
  ↓
Perform actions (fill forms, click buttons, upload files)
  ↓
Verify the expected result happened
  ↓
Report PASS ✅ or FAIL ❌
```

### After the Test Run

```
HTML Report generated → shows every test result with screenshots
Failures include:
  - Screenshot of what went wrong
  - Video recording of the entire test
  - Step-by-step trace for debugging
```

---

## Test Types Explained

### 🟢 Smoke Tests (`@smoke`)
**What:** The most critical tests — the "is the system alive?" check.
**Speed:** Fast (~5 minutes)
**When to run:** Before every deployment, after any change goes live
**Example:** "Can a therapist log in? Can they see their patient list? Can they navigate to billing?"

### 🔵 Regression Tests (`@regression`)
**What:** Full coverage — tests every feature thoroughly.
**Speed:** Complete (~25–30 minutes)
**When to run:** Nightly, before major releases
**Example:** Every CRUD operation, every settings page, every billing tab

### 🟡 CRUD Tests (`@crud`)
**What:** Tests the full lifecycle — Create, Read, Update, Delete — for each data entity.
**Why:** Ensures data can be entered, retrieved, modified, and removed without errors.

---

## Browser & Device Coverage

We test across multiple browsers and devices to ensure the application works for all users:

| Test Project | Browser | Device | Who Tests As | What Gets Tested |
|-------------|---------|--------|-------------|-----------------|
| `therapist-chrome` | Chrome | Desktop | Therapist | All therapist features |
| `therapist-firefox` | Firefox | Desktop | Therapist | Critical (smoke) tests only |
| `client-chrome` | Chrome | Desktop | Patient | All client portal features |
| `client-mobile` | Chrome | Pixel 5 phone | Patient | Critical (smoke) tests only |

> **Why multiple browsers?** Different browsers can behave differently. Testing in Chrome AND Firefox ensures features work for all users regardless of their preferred browser. Mobile testing ensures the patient portal is usable on phones.

---

## Test Results & Reporting

### Where to See Results

After running tests, an **HTML Report** is automatically generated.

```bash
npx playwright show-report
```

This opens a visual dashboard showing:
- ✅ How many tests passed
- ❌ How many tests failed (with screenshots + videos)
- ⏭ How many tests were skipped and why
- ⏱ How long each test took

### What a Failure Looks Like

When a test fails, the system automatically captures:

| Artifact | What It Shows |
|---------|--------------|
| **Screenshot** | A photo of the screen at the exact moment of failure |
| **Video** | A full recording of the test from start to finish |
| **Trace** | A step-by-step timeline of every action taken |
| **Error Context** | A text description of every element visible on the page |

This makes it easy to diagnose whether the issue is a real bug or a test environment problem.

---

## What Is NOT Automated (And Why)

Some features are intentionally not automated. This is a conscious decision, not a gap.

| Feature | Why It's Not Automated |
|---------|----------------------|
| Password reset / Forgot password | Would require a real email inbox to receive the reset link |
| Registering a new account | Would create permanent test data that can't be easily cleaned up |
| Sending actual messages or faxes | Would send real communications — cannot be recalled |
| Submitting billing claims | Financial records with real dollar amounts — no safe test data |
| Creating clinical session notes | Complex clinical workflow requiring multiple preconditions |
| Data CSV import | Bulk database changes with no simple undo |
| Real appointment booking | Requires Google Calendar integration (not enabled on QA) |

---

## How to Run Tests

### Quick Commands

| What You Want | Command |
|--------------|---------|
| Run everything | `npx playwright test` |
| Run smoke tests only (fast) | `npx playwright test --grep @smoke` |
| Run therapist portal only | `npx playwright test --project=therapist-chrome` |
| Run patient portal only | `npx playwright test --project=client-chrome` |
| Run just one feature | `npx playwright test e2e/patients/` |
| See the HTML report | `npx playwright show-report` |
| Run with visible browser (watch it) | `npx playwright test --headed` |
| Debug a single test | `npx playwright test --debug` |

### Before Running Tests — Setup (One Time)

```
1. Copy .env.example to .env.local
2. Fill in the QA credentials (email + password for therapist and patient accounts)
3. Run: npm install
4. Run: npx playwright install --with-deps
```

---

## Credentials & Security

### How Credentials Are Managed

```
.env.local  ← Contains real QA login credentials
             ← NEVER committed to Git (gitignored)
             ← Only exists on the local machine running tests
             ← Must be manually created by each developer from .env.example
```

### What Happens When the Password Changes

If the QA account password is changed:
1. Update `TEST_THERAPIST_PASSWORD` in `.env.local`
2. Delete `auth-sessions/therapist.json` (old saved login session)
3. Re-run the tests — the system will log in fresh with the new password

---

## Test Health Dashboard

### Current Status (as of 2026-03-13)

| Metric | Value |
|--------|-------|
| Total spec files | 68 |
| Total test checks | 300+ |
| Passing | ~289–296 (when QA credentials are valid) |
| Intermittent (parallel load) | ~7 tests |
| Requires manual intervention | 0 |

### What "Intermittent" Means

Some tests occasionally fail when many tests run simultaneously (parallel load on QA server). These tests:
- **Always pass** when run individually
- **Sometimes fail** only when 10+ tests are running at the same time
- Are **not real bugs** — they're QA server resource limitations
- All have graceful handling (they don't block other tests)

---

## Common Questions

**Q: How do I know if a test failure is a real bug or a test problem?**
> Check the screenshot in the HTML report. If the screen shows the login page when it shouldn't, it's a session/credential issue. If it shows an error message from the application, it's likely a real bug.

**Q: Can the tests break the QA data?**
> Tests create data using unique timestamps (e.g., "E2E Patient 843291") so test data is easy to identify. CRUD tests clean up after themselves by deleting what they created. We never touch existing real QA data.

**Q: How long does a full test run take?**
> The complete suite takes 25–30 minutes. Smoke tests only take ~5 minutes. You can also run just one module (e.g., billing) in 2–3 minutes.

**Q: Can tests run automatically on every code change?**
> Yes — the tests are configured for CI/CD (Continuous Integration). Setting `CI=true` in the build environment enables automatic retries, parallel execution, and JUnit XML reports compatible with all major CI platforms (GitHub Actions, Jenkins, GitLab CI, Azure DevOps).

**Q: What happens if the QA server is down?**
> The tests will fail to log in during setup. The system saves the last good session and uses it as a fallback when possible. A clear error message indicates the server is unreachable.

**Q: Are patient records safe? Is this HIPAA compliant for testing?**
> All tests run against the dedicated QA environment — completely separate from production. No real patient data is ever used in tests. Test data uses fake names and synthetic information generated by the test framework.

---

## Glossary — Plain English Definitions

| Term | What It Means |
|------|--------------|
| **E2E (End-to-End) Testing** | Testing the complete user journey from start to finish, like a real user would experience it |
| **Playwright** | The automation tool that controls real browsers (like a robot operating Chrome) |
| **Spec file** | A test script file containing one or more related tests |
| **CRUD** | Create, Read, Update, Delete — the four basic operations on any data record |
| **Smoke test** | A quick sanity check — "is the most important stuff working?" |
| **Regression test** | A thorough check to make sure nothing broke after a change |
| **Serial tests** | Tests that must run in order (step 1 before step 2 before step 3) |
| **Parallel tests** | Tests that can run simultaneously to save time |
| **QA environment** | A copy of the application used only for testing — separate from what real users access |
| **Auth session** | A saved logged-in state — like keeping a browser tab open so you don't need to log in again |
| **JWT token** | A secure digital key that proves who you are after logging in |
| **CDN/WAF** | Network protection layer in front of the website (normal for modern web apps) |
| **CI/CD** | Continuous Integration / Continuous Delivery — automated build and test pipeline |
| **Fixture** | Pre-built test helper (like a pre-made login or pre-created patient) that tests can reuse |
| **Mantine UI** | The interface component library used to build the PSYNAPSYS screens |
| **Graceful skip** | When a test can't complete due to environment issues, it marks itself as "skipped" rather than "failed" — preventing false alarms |

---

*Document maintained by the QA automation team.*
*Last updated: 2026-03-13 | Framework: Playwright + TypeScript | Environment: QA*
