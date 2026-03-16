import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load .env.local first (gitignored, contains real credentials), then .env.example fallback
loadEnv({ path: path.join(__dirname, '.env.local') });
loadEnv({ path: path.join(__dirname, '.env.example') });

/**
 * PSYNAPSYS E2E Test Framework — Playwright Configuration
 * Stack: React 19 + TanStack Router + Mantine UI + Django REST backend
 *
 * Portal users:
 *  - therapist  → Therapist/provider portal  (sahil.padole+123@thinkitive.com)
 *  - client     → Client/patient portal       (sahil.padole+635@thinkitive.com)
 */

const BASE_URL = process.env.BASE_URL || 'https://test.qa.app.psynap-sys.com';
// API server runs on a separate subdomain from the frontend app
const API_URL = process.env.API_URL || 'https://qa.api.psynap-sys.com/api';

const AUTH = (identifier: string) =>
  path.join(__dirname, 'auth-sessions', `${identifier}.json`);

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test file patterns
  testMatch: '**/*.spec.ts',

  // Global timeout standards (TEA knowledge: playwright-config)
  timeout: 60_000,        // Per-test timeout: 60s
  expect: {
    timeout: 10_000,      // Assertion timeout: 10s
  },

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests: 2 on CI, 0 locally
  retries: process.env.CI ? 2 : 0,

  // Parallelism: use available CPU cores on CI
  workers: process.env.CI ? '50%' : 4,

  // Reporters: HTML for local, JUnit + HTML for CI
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
        ['list'],
      ],

  // Global test artifacts
  outputDir: 'test-results',

  // Global setup — authenticates therapist + client, saves storage states
  globalSetup: require.resolve('./global-setup'),

  use: {
    // Base URL for all navigation
    baseURL: BASE_URL,

    // Artifact retention — only on failure
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Action / navigation timeouts (TEA knowledge: playwright-config)
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // Ignore HTTPS errors in QA/test environments
    ignoreHTTPSErrors: true,

    // Extra HTTP headers for test identification
    extraHTTPHeaders: {
      'X-Test-Run': 'playwright',
    },
  },

  // ----------------------------------------------------------------
  // Projects — separated by user role
  // ----------------------------------------------------------------
  projects: [
    // ── Setup project (produces auth-sessions/*.json) ──────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ── THERAPIST PORTAL (provider/staff) — Desktop Chrome ─────────
    {
      name: 'therapist-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH('therapist'),
      },
      dependencies: ['setup'],
      // 'api' tests also run here — page.request uses Chromium's network stack
      // to bypass CDN/WAF restrictions that block non-browser HTTP clients
      testMatch: '**/e2e/{auth,patients,appointments,intake-forms,billing,api,dashboard,communication,settings,tasks,groups}/**/*.spec.ts',
    },

    // ── THERAPIST PORTAL — Firefox ──────────────────────────────────
    {
      name: 'therapist-firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH('therapist'),
      },
      dependencies: ['setup'],
      // Same scope as therapist-chrome but @smoke only — client portal tests
      // are intentionally excluded (they need the client storageState, not therapist)
      testMatch: '**/e2e/{auth,patients,appointments,intake-forms,billing,api,dashboard,communication,settings,tasks,groups}/**/*.spec.ts',
      grep: /@smoke/,
    },

    // ── CLIENT PORTAL (patient) — Desktop Chrome ────────────────────
    {
      name: 'client-chrome',
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH('client'),
      },
      dependencies: ['setup'],
      testMatch: '**/e2e/client/**/*.spec.ts',
    },

    // ── CLIENT PORTAL — Mobile Chrome ───────────────────────────────
    {
      name: 'client-mobile',
      use: {
        ...devices['Pixel 5'],
        storageState: AUTH('client'),
      },
      dependencies: ['setup'],
      testMatch: '**/e2e/client/**/*.spec.ts',
      grep: /@smoke/,
    },

    // NOTE: API tests run under 'therapist-chrome' via page.request (Chromium network
    // stack) because the QA CDN/WAF blocks non-browser HTTP clients with HTTP 403.
    // A dedicated no-browser 'api' project would only work in environments with
    // direct API access (no WAF), e.g. internal staging or CI with VPN.
  ],

  // No local web server — targeting deployed QA environment
  // Set BASE_URL env var to switch between environments
});
