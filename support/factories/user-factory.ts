import { faker } from '@faker-js/faker';

/**
 * PSYNAPSYS User / Staff Factory
 */

export type UserRole = 'admin' | 'provider' | 'staff' | 'patient';

export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
}

export const createUser = (overrides: Partial<User> = {}): User => ({
  email: faker.internet.email({ provider: 'psynapsys-test.local' }),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: 'staff',
  isActive: true,
  phone: faker.phone.number({ style: 'national' }),
  ...overrides,
});

export const createAdminUser = (overrides: Partial<User> = {}): User =>
  createUser({ role: 'admin', ...overrides });

export const createProviderUser = (overrides: Partial<User> = {}): User =>
  createUser({ role: 'provider', ...overrides });

export const createInactiveUser = (overrides: Partial<User> = {}): User =>
  createUser({ isActive: false, ...overrides });
