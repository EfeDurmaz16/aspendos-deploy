/**
 * Vitest Setup File
 *
 * This file runs before all tests to configure the test environment.
 */

import { prisma } from '@aspendos/db';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Setup runs once before all tests
beforeAll(async () => {
    // Environment configuration
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-key';

    // Database setup - ensure test database is clean
    // In a real scenario, you'd use a separate test database
    console.log('[Test Setup] Environment configured for testing');
});

// Cleanup after each test
afterEach(async () => {
    // Optionally clear test data between tests
    // await prisma.testData.deleteMany(); // Example
});

// Cleanup after all tests
afterAll(async () => {
    // Disconnect from database
    await prisma.$disconnect();
    console.log('[Test Cleanup] Database disconnected');
});
