import type { APIRequestContext } from '@playwright/test';

/**
 * PSYNAPSYS Auth Provider — JWT authentication via Django REST Framework
 * Uses djangorestframework_simplejwt endpoints
 *
 * Supported user identifiers:
 *  - 'therapist'  → Therapist/provider portal user  (TEST_THERAPIST_EMAIL)
 *  - 'client'     → Client/patient portal user       (TEST_CLIENT_EMAIL)
 */

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

export interface AuthOptions {
  userIdentifier?: string;
  environment?: string;
}

const API_URL = process.env.API_URL || 'https://test.qa.app.psynap-sys.com/api';
const FRONTEND_ORIGIN = process.env.BASE_URL || 'https://test.qa.app.psynap-sys.com';

/**
 * Credentials map — all values sourced from environment variables.
 *
 * Primary identifiers:
 *  - 'therapist' → provider/staff portal (TEST_THERAPIST_EMAIL)
 *  - 'client'    → patient portal        (TEST_CLIENT_EMAIL)
 */
const TEST_CREDENTIALS: Record<string, { email: string; password: string }> = {
  /** Therapist / provider portal user */
  therapist: {
    email: process.env.TEST_THERAPIST_EMAIL || '',
    password: process.env.TEST_THERAPIST_PASSWORD || '',
  },

  /** Client / patient portal user */
  client: {
    email: process.env.TEST_CLIENT_EMAIL || '',
    password: process.env.TEST_CLIENT_PASSWORD || '',
  },

  // Legacy aliases — map to therapist for backward compatibility
  'default-user': {
    email: process.env.TEST_THERAPIST_EMAIL || '',
    password: process.env.TEST_THERAPIST_PASSWORD || '',
  },
  provider: {
    email: process.env.TEST_THERAPIST_EMAIL || '',
    password: process.env.TEST_THERAPIST_PASSWORD || '',
  },
  patient: {
    email: process.env.TEST_CLIENT_EMAIL || '',
    password: process.env.TEST_CLIENT_PASSWORD || '',
  },
};

/**
 * Authenticate against PSYNAPSYS Django JWT endpoint.
 * Returns storage state with JWT stored in localStorage.
 */
export async function authenticate(
  request: APIRequestContext,
  userIdentifier = 'therapist',
): Promise<StorageState> {
  const credentials = TEST_CREDENTIALS[userIdentifier];

  if (!credentials) {
    throw new Error(
      `No credentials configured for user identifier: "${userIdentifier}". ` +
        `Available identifiers: therapist, client`,
    );
  }

  if (!credentials.email || !credentials.password) {
    throw new Error(
      `Credentials for "${userIdentifier}" are empty. ` +
        `Set TEST_THERAPIST_EMAIL / TEST_CLIENT_EMAIL env vars in .env.local.`,
    );
  }

  const response = await request.post(`${API_URL}/auth/login/`, {
    data: {
      email: credentials.email,
      password: credentials.password,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Authentication failed for "${userIdentifier}" (${response.status()}): ${body}`,
    );
  }

  const { access, refresh } = await response.json();
  const expiryTime = Date.now() + 60 * 60 * 1000; // 1 hour

  return {
    cookies: [],
    origins: [
      {
        origin: FRONTEND_ORIGIN,
        localStorage: [
          { name: 'access_token', value: access },
          { name: 'refresh_token', value: refresh },
          { name: 'token_expiry', value: String(expiryTime) },
          { name: 'user_identifier', value: userIdentifier },
        ],
      },
    ],
  };
}

/**
 * Check if stored token is expired
 */
export function isTokenExpired(storageState: StorageState): boolean {
  const expiryEntry = storageState.origins?.[0]?.localStorage?.find(
    (item) => item.name === 'token_expiry',
  );
  if (!expiryEntry) return true;
  return Date.now() > parseInt(expiryEntry.value, 10);
}

/**
 * Extract JWT access token from storage state
 */
export function extractToken(storageState: StorageState): string | undefined {
  return storageState.origins?.[0]?.localStorage?.find(
    (item) => item.name === 'access_token',
  )?.value;
}
