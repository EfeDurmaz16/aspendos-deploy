import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  type Provider,
  type CircuitState,
  recordSuccess,
  recordFailure,
  isProviderHealthy,
  getBestProvider,
  getHealthStatus,
  getProviderHealth,
  resetHealthTracking,
} from '../provider-health';

describe('Provider Health Tracking', () => {
  beforeEach(() => {
    resetHealthTracking();
    vi.clearAllMocks();
  });

  describe('recordSuccess', () => {
    it('should record successful requests with latency', () => {
      recordSuccess('openai', 150);
      recordSuccess('openai', 200);

      const health = getProviderHealth('openai');
      expect(health.successCount).toBe(2);
      expect(health.failureCount).toBe(0);
      expect(health.errorRate).toBe(0);
      expect(health.avgLatencyMs).toBe(175);
    });

    it('should reset consecutive failures on success', () => {
      const error = new Error('API Error');
      recordFailure('openai', error);
      recordFailure('openai', error);
      recordFailure('openai', error);

      recordSuccess('openai', 100);

      const health = getProviderHealth('openai');
      expect(health.consecutiveFailures).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('should record failed requests', () => {
      const error = new Error('API Error');
      recordFailure('anthropic', error);
      recordFailure('anthropic', error);

      const health = getProviderHealth('anthropic');
      expect(health.successCount).toBe(0);
      expect(health.failureCount).toBe(2);
      expect(health.errorRate).toBe(1);
    });

    it('should increment consecutive failures', () => {
      const error = new Error('API Error');
      recordFailure('google', error);
      recordFailure('google', error);
      recordFailure('google', error);

      const health = getProviderHealth('google');
      expect(health.consecutiveFailures).toBe(3);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after 5 consecutive failures', () => {
      const error = new Error('API Error');

      for (let i = 0; i < 5; i++) {
        recordFailure('groq', error);
      }

      const health = getProviderHealth('groq');
      expect(health.circuitState).toBe('OPEN');
      expect(health.circuitOpenedAt).toBeDefined();
    });

    it('should keep circuit closed with fewer than 5 consecutive failures', () => {
      const error = new Error('API Error');

      for (let i = 0; i < 4; i++) {
        recordFailure('openai', error);
      }

      const health = getProviderHealth('openai');
      expect(health.circuitState).toBe('CLOSED');
    });

    it('should transition to HALF_OPEN after 30 seconds', () => {
      const error = new Error('API Error');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        recordFailure('anthropic', error);
      }

      expect(getProviderHealth('anthropic').circuitState).toBe('OPEN');

      // Advance time by 30 seconds
      vi.useFakeTimers();
      vi.advanceTimersByTime(30 * 1000);

      const health = getProviderHealth('anthropic');
      expect(health.circuitState).toBe('HALF_OPEN');

      vi.useRealTimers();
    });

    it('should close circuit on success in HALF_OPEN state', () => {
      const error = new Error('API Error');

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        recordFailure('google', error);
      }

      expect(getProviderHealth('google').circuitState).toBe('OPEN');

      // Advance time to HALF_OPEN
      vi.useFakeTimers();
      vi.advanceTimersByTime(30 * 1000);

      expect(getProviderHealth('google').circuitState).toBe('HALF_OPEN');

      // Record success
      recordSuccess('google', 100);

      const health = getProviderHealth('google');
      expect(health.circuitState).toBe('CLOSED');
      expect(health.circuitOpenedAt).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe('isProviderHealthy', () => {
    it('should return true for healthy provider', () => {
      recordSuccess('openai', 100);
      recordSuccess('openai', 150);
      recordSuccess('openai', 120);

      expect(isProviderHealthy('openai')).toBe(true);
    });

    it('should return false when circuit is OPEN', () => {
      const error = new Error('API Error');

      for (let i = 0; i < 5; i++) {
        recordFailure('anthropic', error);
      }

      expect(isProviderHealthy('anthropic')).toBe(false);
    });

    it('should return false when error rate exceeds 50%', () => {
      const error = new Error('API Error');

      // 6 failures, 4 successes = 60% error rate
      for (let i = 0; i < 4; i++) {
        recordSuccess('google', 100);
        recordFailure('google', error);
      }
      recordFailure('google', error);
      recordFailure('google', error);

      const health = getProviderHealth('google');
      expect(health.errorRate).toBeGreaterThan(0.5);
      expect(isProviderHealthy('google')).toBe(false);
    });

    it('should return true when error rate is below 50%', () => {
      const error = new Error('API Error');

      // 3 failures, 7 successes = 30% error rate
      for (let i = 0; i < 7; i++) {
        recordSuccess('groq', 100);
      }
      for (let i = 0; i < 3; i++) {
        recordFailure('groq', error);
      }

      const health = getProviderHealth('groq');
      expect(health.errorRate).toBe(0.3);
      expect(isProviderHealthy('groq')).toBe(true);
    });
  });

  describe('getBestProvider', () => {
    it('should return provider with lowest latency', () => {
      recordSuccess('openai', 200);
      recordSuccess('anthropic', 100);
      recordSuccess('google', 150);

      const best = getBestProvider(['openai', 'anthropic', 'google']);
      expect(best).toBe('anthropic');
    });

    it('should exclude unhealthy providers', () => {
      const error = new Error('API Error');

      // Make anthropic fastest but unhealthy
      recordSuccess('anthropic', 50);
      for (let i = 0; i < 5; i++) {
        recordFailure('anthropic', error);
      }

      recordSuccess('openai', 200);
      recordSuccess('google', 150);

      const best = getBestProvider(['openai', 'anthropic', 'google']);
      expect(best).toBe('google'); // Second fastest, but healthy
    });

    it('should return null if all providers are unhealthy', () => {
      const error = new Error('API Error');

      for (let i = 0; i < 5; i++) {
        recordFailure('openai', error);
        recordFailure('anthropic', error);
        recordFailure('google', error);
      }

      const best = getBestProvider(['openai', 'anthropic', 'google']);
      expect(best).toBeNull();
    });

    it('should return first healthy provider if none have history', () => {
      const best = getBestProvider(['openai', 'anthropic', 'google']);
      expect(['openai', 'anthropic', 'google']).toContain(best);
    });

    it('should handle empty provider list', () => {
      const best = getBestProvider([]);
      expect(best).toBeNull();
    });
  });

  describe('getHealthStatus', () => {
    it('should return health metrics for all providers', () => {
      recordSuccess('openai', 100);
      recordFailure('anthropic', new Error('API Error'));

      const status = getHealthStatus();

      expect(status).toHaveLength(4);
      expect(status.map(s => s.provider)).toContain('openai');
      expect(status.map(s => s.provider)).toContain('anthropic');
      expect(status.map(s => s.provider)).toContain('google');
      expect(status.map(s => s.provider)).toContain('groq');
    });

    it('should include all required metrics', () => {
      recordSuccess('openai', 150);
      recordFailure('openai', new Error('API Error'));

      const health = getProviderHealth('openai');

      expect(health).toHaveProperty('provider');
      expect(health).toHaveProperty('circuitState');
      expect(health).toHaveProperty('totalRequests');
      expect(health).toHaveProperty('successCount');
      expect(health).toHaveProperty('failureCount');
      expect(health).toHaveProperty('consecutiveFailures');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('avgLatencyMs');
    });
  });

  describe('Sliding Window', () => {
    it('should only include requests from last 5 minutes', () => {
      vi.useFakeTimers();

      // Record old requests
      recordSuccess('openai', 100);
      recordFailure('openai', new Error('Old error'));

      // Advance time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Record new requests
      recordSuccess('openai', 200);

      const health = getProviderHealth('openai');
      expect(health.totalRequests).toBe(1); // Only recent request
      expect(health.successCount).toBe(1);
      expect(health.avgLatencyMs).toBe(200);

      vi.useRealTimers();
    });
  });

  describe('Error Rate Calculation', () => {
    it('should calculate error rate correctly', () => {
      const error = new Error('API Error');

      // 2 successes, 3 failures = 60% error rate
      recordSuccess('groq', 100);
      recordSuccess('groq', 100);
      recordFailure('groq', error);
      recordFailure('groq', error);
      recordFailure('groq', error);

      const health = getProviderHealth('groq');
      expect(health.errorRate).toBe(0.6);
      expect(health.totalRequests).toBe(5);
    });

    it('should handle zero requests', () => {
      const health = getProviderHealth('openai');
      expect(health.errorRate).toBe(0);
      expect(health.totalRequests).toBe(0);
    });
  });

  describe('Average Latency', () => {
    it('should calculate average latency from successful requests', () => {
      recordSuccess('anthropic', 100);
      recordSuccess('anthropic', 200);
      recordSuccess('anthropic', 300);

      const health = getProviderHealth('anthropic');
      expect(health.avgLatencyMs).toBe(200);
    });

    it('should ignore failed requests in latency calculation', () => {
      recordSuccess('google', 100);
      recordFailure('google', new Error('API Error'));
      recordSuccess('google', 200);

      const health = getProviderHealth('google');
      expect(health.avgLatencyMs).toBe(150);
    });

    it('should return 0 when no successful requests', () => {
      recordFailure('openai', new Error('API Error'));

      const health = getProviderHealth('openai');
      expect(health.avgLatencyMs).toBe(0);
    });
  });

  describe('resetHealthTracking', () => {
    it('should reset all metrics', () => {
      const error = new Error('API Error');

      recordSuccess('openai', 100);
      recordFailure('anthropic', error);

      for (let i = 0; i < 5; i++) {
        recordFailure('google', error);
      }

      resetHealthTracking();

      const openaiHealth = getProviderHealth('openai');
      const anthropicHealth = getProviderHealth('anthropic');
      const googleHealth = getProviderHealth('google');

      expect(openaiHealth.totalRequests).toBe(0);
      expect(anthropicHealth.totalRequests).toBe(0);
      expect(googleHealth.totalRequests).toBe(0);
      expect(googleHealth.circuitState).toBe('CLOSED');
      expect(googleHealth.consecutiveFailures).toBe(0);
    });
  });
});
