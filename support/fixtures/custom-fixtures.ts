import { test as base, type APIRequestContext } from '@playwright/test';
import { authenticate, extractToken } from '../auth/auth-provider';
import { createPatient } from '../factories/patient-factory';
import { createAppointment } from '../factories/appointment-factory';

const API_URL = process.env.API_URL || 'http://localhost:8000';

// ------------------------------------------------------------------
// Custom fixture types
// ------------------------------------------------------------------

interface TestPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  cleanup: () => Promise<void>;
}

interface TestAppointment {
  id: string;
  patientId: string;
  providerId: string;
  scheduledAt: string;
  status: string;
  cleanup: () => Promise<void>;
}

interface CustomFixtures {
  /** Authenticated API request context (Bearer JWT) */
  authRequest: APIRequestContext;
  /** JWT access token for the default test user */
  accessToken: string;
  /** Pre-seeded test patient (auto-cleaned up after test) */
  testPatient: TestPatient;
  /** Pre-seeded test appointment (auto-cleaned up after test) */
  testAppointment: TestAppointment;
}

// ------------------------------------------------------------------
// Custom fixture implementations
// ------------------------------------------------------------------

export const test = base.extend<CustomFixtures>({

  /**
   * Authenticated API request context — injects Bearer token on every request.
   */
  authRequest: async ({ request }, use) => {
    const storageState = await authenticate(request);
    const token = extractToken(storageState);

    const authRequest = await base.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    await use(authRequest);
    await authRequest.dispose();
  },

  /**
   * Raw JWT access token — use when you need to manually set Authorization header.
   */
  accessToken: async ({ request }, use) => {
    const storageState = await authenticate(request);
    const token = extractToken(storageState);

    if (!token) {
      throw new Error('Failed to retrieve access token from auth storage state');
    }

    await use(token);
  },

  /**
   * Auto-seeded test patient — cleaned up after each test.
   */
  testPatient: async ({ authRequest }, use) => {
    const patientData = createPatient();

    const response = await authRequest.post(`${API_URL}/api/patients/`, {
      data: patientData,
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to seed test patient (${response.status()}): ${body}`);
    }

    const created = await response.json();

    const testPatient: TestPatient = {
      ...patientData,
      id: created.id,
      cleanup: async () => {
        await authRequest.delete(`${API_URL}/api/patients/${created.id}/`).catch(() => {
          // Ignore cleanup errors — test data may already be removed
        });
      },
    };

    await use(testPatient);
    await testPatient.cleanup();
  },

  /**
   * Auto-seeded test appointment — requires testPatient fixture.
   */
  testAppointment: async ({ authRequest, testPatient }, use) => {
    const appointmentData = createAppointment({ patientId: testPatient.id });

    const response = await authRequest.post(`${API_URL}/api/appointments/`, {
      data: appointmentData,
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(`Failed to seed test appointment (${response.status()}): ${body}`);
    }

    const created = await response.json();

    const testAppointment: TestAppointment = {
      ...appointmentData,
      id: created.id,
      cleanup: async () => {
        await authRequest.delete(`${API_URL}/api/appointments/${created.id}/`).catch(() => {});
      },
    };

    await use(testAppointment);
    await testAppointment.cleanup();
  },
});
