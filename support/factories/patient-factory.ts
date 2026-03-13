import { faker } from '@faker-js/faker';

/**
 * PSYNAPSYS Patient Factory
 * Generates parallel-safe patient test data with sensible defaults.
 */

export interface Patient {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  insuranceId?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  isActive: boolean;
}

export const createPatient = (overrides: Partial<Patient> = {}): Patient => ({
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  email: faker.internet.email({ provider: 'psynapsys-test.local' }),
  phone: faker.phone.number({ style: 'national' }),
  dateOfBirth: faker.date
    .birthdate({ min: 18, max: 80, mode: 'age' })
    .toISOString()
    .split('T')[0],
  gender: faker.helpers.arrayElement(['male', 'female', 'other', 'prefer_not_to_say']),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    zipCode: faker.location.zipCode(),
    country: 'US',
  },
  emergencyContact: {
    name: faker.person.fullName(),
    relationship: faker.helpers.arrayElement(['spouse', 'parent', 'sibling', 'friend']),
    phone: faker.phone.number({ style: 'national' }),
  },
  isActive: true,
  ...overrides,
});

// Specialized factories
export const createMinorPatient = (overrides: Partial<Patient> = {}): Patient =>
  createPatient({
    dateOfBirth: faker.date.birthdate({ min: 1, max: 17, mode: 'age' }).toISOString().split('T')[0],
    ...overrides,
  });

export const createInactivePatient = (overrides: Partial<Patient> = {}): Patient =>
  createPatient({ isActive: false, ...overrides });

export const createInsuredPatient = (overrides: Partial<Patient> = {}): Patient =>
  createPatient({
    insuranceId: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
    ...overrides,
  });
