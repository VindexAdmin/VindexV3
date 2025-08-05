import { PrismaClient } from '@prisma/client';

// Setup function for tests
beforeAll(async () => {
  // Setup test database connection
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('🧹 Cleaning up test environment...');
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Suppress console logs during testing unless debugging
if (process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Global test timeout
jest.setTimeout(30000);
