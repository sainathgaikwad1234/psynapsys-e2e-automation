import type { APIRequestContext } from '@playwright/test';
import { createPatient, type Patient } from '../factories/patient-factory';
import { createAppointment, type Appointment } from '../factories/appointment-factory';
import { createUser, type User } from '../factories/user-factory';

const API_URL = process.env.API_URL || 'http://localhost:8000';

/**
 * Seed a patient via the API.
 * Returns the created patient with server-assigned ID.
 */
export async function seedPatient(
  request: APIRequestContext,
  overrides: Partial<Patient> = {},
): Promise<Patient & { id: string }> {
  const patient = createPatient(overrides);

  const response = await request.post(`${API_URL}/api/patients/`, {
    data: patient,
  });

  if (!response.ok()) {
    throw new Error(`seedPatient failed (${response.status()}): ${await response.text()}`);
  }

  const created = await response.json();
  return { ...patient, id: created.id };
}

/**
 * Seed an appointment via the API.
 */
export async function seedAppointment(
  request: APIRequestContext,
  overrides: Partial<Appointment> = {},
): Promise<Appointment & { id: string }> {
  const appointment = createAppointment(overrides);

  const response = await request.post(`${API_URL}/api/appointments/`, {
    data: appointment,
  });

  if (!response.ok()) {
    throw new Error(`seedAppointment failed (${response.status()}): ${await response.text()}`);
  }

  const created = await response.json();
  return { ...appointment, id: created.id };
}

/**
 * Seed a staff user via the API.
 */
export async function seedUser(
  request: APIRequestContext,
  overrides: Partial<User> = {},
): Promise<User & { id: string }> {
  const user = createUser(overrides);

  const response = await request.post(`${API_URL}/api/users/`, {
    data: user,
  });

  if (!response.ok()) {
    throw new Error(`seedUser failed (${response.status()}): ${await response.text()}`);
  }

  const created = await response.json();
  return { ...user, id: created.id };
}

/**
 * Delete a resource by URL (for teardown).
 * Silently ignores 404 — resource may already be deleted.
 */
export async function deleteResource(
  request: APIRequestContext,
  url: string,
): Promise<void> {
  const response = await request.delete(url);
  if (!response.ok() && response.status() !== 404) {
    console.warn(`deleteResource: unexpected status ${response.status()} for ${url}`);
  }
}
