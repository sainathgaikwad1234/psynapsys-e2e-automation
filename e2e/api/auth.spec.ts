import { test, expect } from '../../support/merged-fixtures';

/**
 * PSYNAPSYS — Auth API Tests
 *
 * Tests the Django REST Framework simplejwt authentication endpoints.
 *
 * Architecture note:
 *   The QA environment has two separate domains:
 *     - Frontend:  https://test.qa.app.psynap-sys.com  (React SPA + CDN/WAF)
 *     - API:       https://qa.api.psynap-sys.com       (Django REST backend)
 *
 *   The app's Axios client (src/api/client.ts) targets VITE_BASE_URL which
 *   resolves to the API domain. The frontend CDN/WAF blocks direct API calls
 *   to the frontend domain, but the API domain is directly reachable.
 *
 *   All requests must include `Tenant-Name: <subdomain>` — the app's Axios
 *   interceptor derives this from window.location.hostname.split('.')[0].
 *
 * Runs under the 'therapist-chrome' project (browser context).
 *
 * Endpoints:
 *   POST /api/auth/login/         → Returns { access, refresh } JWT tokens
 *   POST /api/auth/token/refresh/ → Refreshes access token using refresh token
 *
 * @tag @smoke @api
 */

// Clear pre-loaded auth state — these tests exercise the auth endpoints directly
test.use({ storageState: { cookies: [], origins: [] } });

const API_URL = process.env.API_URL || 'https://qa.api.psynap-sys.com/api';
const THERAPIST_EMAIL = process.env.TEST_THERAPIST_EMAIL || '';
const THERAPIST_PASSWORD = process.env.TEST_THERAPIST_PASSWORD || '';

/** Standard headers the app's Axios interceptor adds to every API request. */
const API_HEADERS = {
  'Content-Type': 'application/json',
  'Tenant-Name': 'test',          // Derived from BASE_URL subdomain (test.qa.app…)
  'Accept': 'application/json, text/plain, */*',
};

test.describe('Auth API', () => {
  test.describe('POST /api/auth/login/', () => {
    test(
      'should return JWT tokens for valid therapist credentials @smoke',
      async ({ page }) => {
        // GIVEN: Valid therapist credentials
        // WHEN: POST to /api/auth/login/
        const response = await page.request.post(`${API_URL}/auth/login/`, {
          data: { email: THERAPIST_EMAIL, password: THERAPIST_PASSWORD },
          headers: API_HEADERS,
        });

        // THEN: Response is 200 with access + refresh tokens
        expect(response.status()).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('access');
        expect(body).toHaveProperty('refresh');
        expect(typeof body.access).toBe('string');
        expect(body.access.length).toBeGreaterThan(10);
      },
    );

    test(
      'should return 400/401 for invalid credentials @smoke',
      // skipNetworkMonitoring: expected 4xx must not fail the test
      { annotation: [{ type: 'skipNetworkMonitoring' }] },
      async ({ page }) => {
        // GIVEN: Invalid credentials
        // WHEN: POST with wrong password
        const response = await page.request.post(`${API_URL}/auth/login/`, {
          data: { email: 'invalid@example.com', password: 'WrongPassword123!' },
          headers: API_HEADERS,
        });

        // THEN: Response indicates authentication failure (400 or 401)
        expect([400, 401]).toContain(response.status());
      },
    );

    test(
      'should return 400 for missing email field',
      // skipNetworkMonitoring: expected 400 must not fail the test
      { annotation: [{ type: 'skipNetworkMonitoring' }] },
      async ({ page }) => {
        // GIVEN: Missing email
        // WHEN: POST with only password
        const response = await page.request.post(`${API_URL}/auth/login/`, {
          data: { password: 'SomePassword123!' },
          headers: API_HEADERS,
        });

        // THEN: Validation error (400)
        expect(response.status()).toBe(400);
      },
    );
  });

  test.describe('POST /api/auth/refresh/', () => {
    test(
      'should refresh access token with valid refresh token @smoke',
      async ({ page }) => {
        // GIVEN: First login to get a refresh token
        const loginResponse = await page.request.post(`${API_URL}/auth/login/`, {
          data: { email: THERAPIST_EMAIL, password: THERAPIST_PASSWORD },
          headers: API_HEADERS,
        });
        expect(loginResponse.status()).toBe(200);
        const { refresh } = await loginResponse.json();

        // WHEN: POST refresh token to get new access token
        const refreshResponse = await page.request.post(`${API_URL}/auth/token/refresh/`, {
          data: { refresh },
          headers: API_HEADERS,
        });

        // THEN: New access token is returned
        expect(refreshResponse.status()).toBe(200);
        const body = await refreshResponse.json();
        expect(body).toHaveProperty('access');
        expect(typeof body.access).toBe('string');
      },
    );

    test(
      'should return 401 for invalid refresh token',
      // skipNetworkMonitoring: expected 401 must not fail the test
      { annotation: [{ type: 'skipNetworkMonitoring' }] },
      async ({ page }) => {
        // GIVEN: An invalid refresh token string
        const response = await page.request.post(`${API_URL}/auth/token/refresh/`, {
          data: { refresh: 'invalid.refresh.token.string' },
          headers: API_HEADERS,
        });

        // THEN: 401 Unauthorized
        expect(response.status()).toBe(401);
      },
    );
  });
});
