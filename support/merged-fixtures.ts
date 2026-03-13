/**
 * PSYNAPSYS — Merged Fixtures
 *
 * Single test object combining:
 *  - @seontechnologies/playwright-utils (API request, auth session, network monitoring)
 *  - Custom PSYNAPSYS fixtures (authRequest, testPatient, testAppointment)
 *
 * Usage in tests:
 *   import { test, expect } from '@fixtures';
 *   // or
 *   import { test, expect } from '../support/merged-fixtures';
 *
 * Network monitor note:
 *   The QA server (test.qa.app.psynap-sys.com) returns HTTP 404 for all SPA frontend
 *   routes — this is a known server misconfiguration. React handles routing client-side
 *   so these 404s are false positives. The excludePatterns below suppress them while
 *   keeping real API error monitoring active (all /api/ routes are still monitored).
 *
 *   To skip monitoring entirely for a specific test (e.g., testing invalid credentials
 *   where 4xx is expected):
 *     test('name', { annotation: [{ type: 'skipNetworkMonitoring' }] }, async ({ page }) => { ... })
 */

import { test as base, mergeTests } from '@playwright/test';

// playwright-utils fixtures
import { test as apiRequestFixture } from '@seontechnologies/playwright-utils/api-request/fixtures';
import { test as recurseFixture } from '@seontechnologies/playwright-utils/recurse/fixtures';
import { test as logFixture } from '@seontechnologies/playwright-utils/log/fixtures';
import {
  createNetworkErrorMonitorFixture,
} from '@seontechnologies/playwright-utils/network-error-monitor/fixtures';
import { test as interceptFixture } from '@seontechnologies/playwright-utils/intercept-network-call/fixtures';

// Custom PSYNAPSYS fixtures
import { test as customFixtures } from './fixtures/custom-fixtures';

/**
 * Network error monitor with QA-environment exclusions.
 *
 * Excluded patterns (false positives on QA):
 *  - /auth/...      → SPA login/auth routes — server returns 404 but React loads fine
 *  - /app/...       → Staff portal SPA routes
 *  - /client-app/   → Client portal SPA routes
 *  - /assets/       → Missing static assets (e.g., header-logo.png) on QA server
 *
 * NOT excluded (real errors that should fail tests):
 *  - /api/...       → All Django REST API endpoints remain monitored
 */
const networkMonitorFixture = base.extend(
  createNetworkErrorMonitorFixture({
    excludePatterns: [
      // SPA frontend routes return 404 from server (known QA server misconfiguration)
      /psynap-sys\.com\/(auth|app|client-app)/,
      // Missing static assets on QA server
      /\/assets\//,
    ],
    // Only fail the first test per unique error pattern to avoid cascading failures
    maxTestsPerError: 1,
  }),
);

// Merge all fixtures into single test object
export const test = mergeTests(
  apiRequestFixture,
  recurseFixture,
  logFixture,
  networkMonitorFixture,
  interceptFixture,
  customFixtures,
);

export { expect } from '@playwright/test';
