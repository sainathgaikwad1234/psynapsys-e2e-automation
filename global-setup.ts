import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PSYNAPSYS Global Setup
 * Authenticates both portal users and saves storage state to disk.
 * Runs ONCE before the entire test suite.
 *
 * Users authenticated:
 *  - therapist  → auth-sessions/therapist.json  (provider/staff portal)
 *  - client     → auth-sessions/client.json      (patient portal)
 */

const BASE_URL = process.env.BASE_URL || 'https://test.qa.app.psynap-sys.com';
const AUTH_SESSIONS_DIR = path.join(__dirname, 'auth-sessions');

interface TestUser {
  identifier: string;
  email: string;
  password: string;
  /** URL to wait for after successful login */
  expectedUrlPattern: RegExp;
}

// Validate required env vars before building the user list
const requiredVars = [
  'TEST_THERAPIST_EMAIL',
  'TEST_THERAPIST_PASSWORD',
  'TEST_CLIENT_EMAIL',
  'TEST_CLIENT_PASSWORD',
];

const missing = requiredVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `[global-setup] Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env.local and fill in your credentials.',
  );
}

const TEST_USERS: TestUser[] = [
  {
    identifier: 'therapist',
    email: process.env.TEST_THERAPIST_EMAIL!,
    password: process.env.TEST_THERAPIST_PASSWORD!,
    // Staff users are redirected to /app/setting/profile or /app/dashboard after login
    expectedUrlPattern: /\/app\//,
  },
  {
    identifier: 'client',
    email: process.env.TEST_CLIENT_EMAIL!,
    password: process.env.TEST_CLIENT_PASSWORD!,
    // Client/patient users are redirected to /client-app/dashboard after login
    expectedUrlPattern: /\/client-app\//,
  },
];

async function globalSetup(config: FullConfig) {
  // Ensure auth-sessions directory exists
  if (!fs.existsSync(AUTH_SESSIONS_DIR)) {
    fs.mkdirSync(AUTH_SESSIONS_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  for (const user of TEST_USERS) {
    console.log(`[global-setup] Authenticating: ${user.identifier} (${user.email})`);

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    try {
      await page.goto(`${BASE_URL}/auth/login`);

      // Fill login form — selectors use role/label to be resilient
      await page.getByLabel(/email/i).fill(user.email);
      await page.getByLabel(/password/i).fill(user.password);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();

      // Wait for post-login navigation
      await page.waitForURL(user.expectedUrlPattern, { timeout: 30_000 });

      // Save storage state (cookies + localStorage with JWT)
      const storageStatePath = path.join(AUTH_SESSIONS_DIR, `${user.identifier}.json`);
      await context.storageState({ path: storageStatePath });

      console.log(`[global-setup] ✅ ${user.identifier} → ${storageStatePath}`);
    } catch (error) {
      console.error(`[global-setup] ❌ Auth failed for "${user.identifier}":`, error);
      // Fall back to existing session file if available (e.g. QA server temporarily slow)
      const sessionPath = path.join(AUTH_SESSIONS_DIR, `${user.identifier}.json`);
      if (fs.existsSync(sessionPath)) {
        console.warn(`[global-setup] ⚠️  Using cached session for "${user.identifier}" — re-auth failed`);
      } else {
        throw error;
      }
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('[global-setup] ✅ All users authenticated. Proceeding with test run.');
}

export default globalSetup;
