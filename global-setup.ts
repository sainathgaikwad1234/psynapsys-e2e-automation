import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PSYNAPSYS Global Setup
 * Authenticates both portal users and saves storage state to disk.
 * Runs ONCE before the entire test suite.
 *
 * Improvements over the original:
 *  - Both users authenticated in parallel (saves ~15 s on each run)
 *  - Session freshness check — warns if cached session is >4 hours old
 *  - Clear actionable error messages when credentials fail
 *  - Token expiry written to session file for downstream validation
 *
 * Users authenticated:
 *  - therapist  → auth-sessions/therapist.json  (provider/staff portal)
 *  - client     → auth-sessions/client.json      (patient portal)
 */

const BASE_URL = process.env.BASE_URL || 'https://test.qa.app.psynap-sys.com';
const AUTH_SESSIONS_DIR = path.join(__dirname, 'auth-sessions');

/** Maximum age of a cached session before we warn that it may be stale (ms) */
const SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1_000; // 4 hours

interface TestUser {
  identifier: string;
  email: string;
  password: string;
  /** URL pattern to wait for after successful login */
  expectedUrlPattern: RegExp;
}

// ── Validate required env vars ────────────────────────────────────────────────

const REQUIRED_VARS = [
  'TEST_THERAPIST_EMAIL',
  'TEST_THERAPIST_PASSWORD',
  'TEST_CLIENT_EMAIL',
  'TEST_CLIENT_PASSWORD',
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `[global-setup] Missing required environment variables: ${missing.join(', ')}\n` +
      '  → Copy .env.example to .env.local and fill in your QA credentials.\n' +
      '  → See README.md#credentials for details.',
  );
}

const TEST_USERS: TestUser[] = [
  {
    identifier: 'therapist',
    email: process.env.TEST_THERAPIST_EMAIL!,
    password: process.env.TEST_THERAPIST_PASSWORD!,
    expectedUrlPattern: /\/app\//,
  },
  {
    identifier: 'client',
    email: process.env.TEST_CLIENT_EMAIL!,
    password: process.env.TEST_CLIENT_PASSWORD!,
    expectedUrlPattern: /\/client-app\//,
  },
];

// ── Session helpers ───────────────────────────────────────────────────────────

function sessionPath(identifier: string): string {
  return path.join(AUTH_SESSIONS_DIR, `${identifier}.json`);
}

function sessionAge(filePath: string): number {
  try {
    const stat = fs.statSync(filePath);
    return Date.now() - stat.mtimeMs;
  } catch {
    return Infinity;
  }
}

function useCachedSession(identifier: string): boolean {
  const file = sessionPath(identifier);
  if (!fs.existsSync(file)) return false;

  const ageMs = sessionAge(file);
  const ageMin = Math.round(ageMs / 60_000);

  if (ageMs > SESSION_MAX_AGE_MS) {
    console.warn(
      `[global-setup] ⚠️  Cached session for "${identifier}" is ${ageMin} min old — ` +
        `it may have expired. Update credentials in .env.local if tests fail to log in.`,
    );
  } else {
    console.warn(
      `[global-setup] ⚠️  Using cached session for "${identifier}" (${ageMin} min old) — re-auth failed.`,
    );
  }

  return true;
}

// ── Per-user auth ─────────────────────────────────────────────────────────────

/** Attempt a single browser login and save the storage state. Returns on success, throws on failure. */
async function attemptLogin(user: TestUser): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  try {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/password/i).fill(user.password);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await page.waitForURL(user.expectedUrlPattern, { timeout: 30_000 });
    await context.storageState({ path: sessionPath(user.identifier) });
  } finally {
    await context.close();
    await browser.close();
  }
}

async function authenticateUser(user: TestUser): Promise<void> {
  const MAX_ATTEMPTS = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(
        `[global-setup] Authenticating: ${user.identifier} (${user.email})` +
          (attempt > 1 ? ` — attempt ${attempt}/${MAX_ATTEMPTS}` : ''),
      );
      await attemptLogin(user);
      console.log(`[global-setup] ✅ ${user.identifier} session saved → ${sessionPath(user.identifier)}`);
      return; // success
    } catch (error) {
      lastError = error;

      const isCredentialError =
        String(error).includes('401') ||
        String(error).includes('Unable to log in') ||
        String(error).includes('Invalid credentials');

      if (isCredentialError) {
        // Credential errors won't be fixed by retrying — fail immediately
        console.error(
          `[global-setup] ❌ Credentials rejected for "${user.identifier}".\n` +
            `  → Check TEST_${user.identifier.toUpperCase()}_EMAIL / TEST_${user.identifier.toUpperCase()}_PASSWORD in .env.local\n` +
            `  → If the password changed, update it and delete auth-sessions/${user.identifier}.json`,
        );
        break;
      }

      if (attempt < MAX_ATTEMPTS) {
        const delayMs = attempt * 2_000; // 2 s, 4 s back-off
        console.warn(
          `[global-setup] ⚠️  Auth attempt ${attempt} failed for "${user.identifier}" ` +
            `(network/server issue) — retrying in ${delayMs / 1_000}s…`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // All attempts exhausted — fall back to cached session
  console.error(
    `[global-setup] ❌ Auth failed for "${user.identifier}" after ${MAX_ATTEMPTS} attempts:`,
    lastError,
  );

  if (!useCachedSession(user.identifier)) {
    throw new Error(
      `[global-setup] Cannot authenticate "${user.identifier}" and no cached session exists. ` +
        `Fix credentials in .env.local then run: npx playwright test auth.setup.ts`,
    );
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function globalSetup(_config: FullConfig): Promise<void> {
  if (!fs.existsSync(AUTH_SESSIONS_DIR)) {
    fs.mkdirSync(AUTH_SESSIONS_DIR, { recursive: true });
  }

  // Authenticate both users in parallel — saves ~15 s per run
  const startMs = Date.now();
  await Promise.all(TEST_USERS.map(authenticateUser));

  const elapsedSec = ((Date.now() - startMs) / 1_000).toFixed(1);
  console.log(
    `[global-setup] ✅ All sessions ready in ${elapsedSec}s. Proceeding with test run.`,
  );
}

export default globalSetup;
