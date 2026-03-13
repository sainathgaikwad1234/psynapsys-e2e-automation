import { faker } from '@faker-js/faker';

/**
 * PSYNAPSYS Appointment Factory
 */

export interface Appointment {
  id?: string;
  patientId: string;
  providerId?: string;
  officeId?: string;
  scheduledAt: string;
  durationMinutes: number;
  type: 'initial_consultation' | 'follow_up' | 'urgent' | 'telehealth';
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reason?: string;
  notes?: string;
}

export const createAppointment = (overrides: Partial<Appointment> = {}): Appointment => {
  const futureDate = faker.date.soon({ days: 30 });
  // Align to 30-min slots (9am–5pm)
  futureDate.setHours(faker.number.int({ min: 9, max: 16 }));
  futureDate.setMinutes(faker.helpers.arrayElement([0, 30]));
  futureDate.setSeconds(0, 0);

  return {
    patientId: overrides.patientId || faker.string.uuid(),
    scheduledAt: futureDate.toISOString(),
    durationMinutes: faker.helpers.arrayElement([30, 45, 60]),
    type: faker.helpers.arrayElement(['initial_consultation', 'follow_up', 'urgent', 'telehealth']),
    status: 'scheduled',
    reason: faker.helpers.arrayElement([
      'Annual checkup',
      'Follow-up on previous visit',
      'New symptoms',
      'Medication review',
      'Mental health consultation',
    ]),
    ...overrides,
  };
};

export const createTelehealthAppointment = (
  overrides: Partial<Appointment> = {},
): Appointment => createAppointment({ type: 'telehealth', ...overrides });

export const createUrgentAppointment = (overrides: Partial<Appointment> = {}): Appointment =>
  createAppointment({ type: 'urgent', durationMinutes: 30, ...overrides });
