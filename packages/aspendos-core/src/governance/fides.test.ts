import { afterEach, describe, expect, it } from 'vitest';
import { FidesService } from './fides';

const originalNodeEnv = process.env.NODE_ENV;
const originalVitestEnv = process.env.VITEST;

function forceMissingFidesSdk(fides: FidesService) {
    (fides as unknown as { loadSdk: () => Promise<null> }).loadSdk = async () => null;
}

describe('core FIDES fallback posture', () => {
    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        delete process.env.ALLOW_IN_MEMORY_GOVERNANCE;
        delete process.env.FIDES_TEST_SIGNING_SECRET;
        if (originalVitestEnv === undefined) {
            delete process.env.VITEST;
        } else {
            process.env.VITEST = originalVitestEnv;
        }
    });

    it('refuses fallback signatures in production when the FIDES SDK is unavailable', async () => {
        process.env.NODE_ENV = 'production';
        process.env.FIDES_TEST_SIGNING_SECRET = 'prod-secret';
        process.env.ALLOW_IN_MEMORY_GOVERNANCE = 'true';

        const fides = new FidesService();
        forceMissingFidesSdk(fides);

        await expect(fides.initialize()).rejects.toThrow(/Refusing fallback FIDES signatures/);
    });

    it('refuses fallback signatures outside test without explicit local governance opt-in', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        process.env.FIDES_TEST_SIGNING_SECRET = 'dev-secret';

        const fides = new FidesService();
        forceMissingFidesSdk(fides);

        await expect(fides.initialize()).rejects.toThrow(
            /explicit local\/test governance fallback/
        );
    });
});
