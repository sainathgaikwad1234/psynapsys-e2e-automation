# PSYNAPSYS E2E Test Framework

Playwright-based end-to-end test framework for PSYNAPSYS (Custom EHR System).

**Stack:** Playwright 1.54+ · TypeScript 5.7 · `@seontechnologies/playwright-utils` · Faker.js

---

## Quick Start

### 1. Prerequisites

- Node.js 20+ (or `nvm use` with `.nvmrc`)
- Access to the PSYNAPSYS QA environment

### 2. Install dependencies

```bash
cd psynapsys-e2e
npm install
npx playwright install --with-deps
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

Minimum required in `.env.local`:
```
BASE_URL=https://test.qa.app.psynap-sys.com
TEST_USER_EMAIL=sahil.padode+237@thinkitive.com
TEST_USER_PASSWORD=Pass@123
```

### 4. Run tests

```bash
# All tests (headless)
npm test

# Interactive UI mode (recommended for development)
npm run test:ui

# Specific tag
npm run test:smoke

# Specific domain
npm run test:auth
npm run test:patients
npm run test:appointments
```

---

## Project Structure

```
psynapsys-e2e/
├── playwright.config.ts          # Playwright configuration
├── global-setup.ts               # Auth state setup (runs once)
├── package.json
├── tsconfig.json
├── .env.example                  # Environment variable template
├── .gitignore
│
├── e2e/                          # Test files
│   ├── auth/
│   │   └── login.spec.ts         # @smoke @auth
│   ├── patients/
│   │   └── patient-management.spec.ts  # @regression @patients
│   ├── appointments/
│   │   └── appointments.spec.ts  # @regression @appointments
│   └── intake-forms/
│       └── intake-form.spec.ts   # @regression @intake-forms
│
├── support/
│   ├── merged-fixtures.ts        # ⭐ Single test import for all tests
│   ├── auth/
│   │   └── auth-provider.ts      # JWT auth against Django backend
│   ├── fixtures/
│   │   └── custom-fixtures.ts    # authRequest, testPatient, testAppointment
│   ├── factories/
│   │   ├── patient-factory.ts    # createPatient(), createInsuredPatient()
│   │   ├── appointment-factory.ts
│   │   └── user-factory.ts       # createAdminUser(), createProviderUser()
│   ├── helpers/
│   │   └── seed-helpers.ts       # seedPatient(), seedAppointment()
│   └── page-objects/
│       ├── login-page.ts
│       └── dashboard-page.ts
│
└── auth-sessions/                # Token storage — gitignored!
```

---

## Test Tags

| Tag | Purpose |
|-----|---------|
| `@smoke` | Critical path — run before every deploy |
| `@regression` | Full regression suite |
| `@auth` | Authentication flows |
| `@patients` | Patient management |
| `@appointments` | Appointment scheduling |
| `@intake-forms` | Intake form flows |

Run by tag:
```bash
npx playwright test --grep @smoke
npx playwright test --grep "@patients|@appointments"
```

---

## Environments

| Environment | BASE_URL |
|-------------|----------|
| QA (default) | `https://test.qa.app.psynap-sys.com` |
| Local dev | `http://test.localhost:5173` |
| Staging | `https://staging.psynap-sys.com` |

Override environment:
```bash
BASE_URL=https://staging.psynap-sys.com npm test
```

---

## Writing Tests

### Import pattern — always use merged fixtures

```typescript
import { test, expect } from '../support/merged-fixtures';

test('example', async ({ page, testPatient, apiRequest, interceptNetworkCall }) => {
  // testPatient — auto-seeded and auto-cleaned patient
  // apiRequest  — typed HTTP client from playwright-utils
  // interceptNetworkCall — network spy/stub
});
```

### Given / When / Then format

```typescript
test('should create a new patient', async ({ page, interceptNetworkCall }) => {
  // GIVEN: User is on the new patient form
  await page.goto('/patients/new');

  // WHEN: User fills the form and submits
  const createCall = interceptNetworkCall({ url: '**/api/patients/**' });
  await page.getByTestId('patient-form-submit').click();

  // THEN: API receives the request and success message shows
  const { responseJson } = await createCall;
  expect(responseJson.id).toBeDefined();
  await expect(page.getByTestId('success-notification')).toBeVisible();
});
```

### Data factory usage

```typescript
import { createPatient, createInsuredPatient } from '../support/factories/patient-factory';

// Default patient with random data
const patient = createPatient();

// Override specific fields to express test intent
const insuredPatient = createInsuredPatient({ firstName: 'John' });
```

---

## CI / CD

Set these environment variables in your CI pipeline:

```yaml
BASE_URL: https://test.qa.app.psynap-sys.com
TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
CI: true
```

Run command:
```bash
npm test
```

Reports are generated in:
- `playwright-report/` — HTML report
- `test-results/junit.xml` — JUnit XML (for CI dashboards)

---

## Troubleshooting

**Auth sessions expire:** Delete `auth-sessions/` and re-run. `global-setup` will re-authenticate.

**Tests failing due to wrong selectors:** Run `npm run test:codegen` to use Playwright's codegen to inspect the actual selectors in the app, then update the page objects.

**Flaky tests:** Check `playwright-report/` trace viewer — it shows every action, screenshot, and network request.
