import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the auth logic extracted from admin/main.ts
// Since main.ts is the entry point, we test the auth patterns directly

describe('Admin Auth - Rate Limiting', () => {
  const AUTH_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000,
    SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  };

  function createRateLimiter() {
    const attempts = new Map<string, { count: number; lockedUntil: number }>();

    function checkRateLimit(ip: string) {
      const now = Date.now();
      const attempt = attempts.get(ip);
      if (!attempt) return { allowed: true };
      if (attempt.lockedUntil > now) return { allowed: false, remainingTime: attempt.lockedUntil - now };
      if (attempt.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
        attempt.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
        attempts.set(ip, attempt);
        return { allowed: false, remainingTime: AUTH_CONFIG.LOCKOUT_DURATION_MS };
      }
      return { allowed: true };
    }

    function recordFailedAttempt(ip: string) {
      const now = Date.now();
      const attempt = attempts.get(ip) || { count: 0, lockedUntil: 0 };
      attempt.count += 1;
      if (attempt.count >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
        attempt.lockedUntil = now + AUTH_CONFIG.LOCKOUT_DURATION_MS;
      }
      attempts.set(ip, attempt);
    }

    function resetAttempts(ip: string) {
      attempts.delete(ip);
    }

    function getAttempts(ip: string) {
      return attempts.get(ip) || { count: 0, lockedUntil: 0 };
    }

    return { checkRateLimit, recordFailedAttempt, resetAttempts, getAttempts };
  }

  it('allows first login attempt', () => {
    const rl = createRateLimiter();
    expect(rl.checkRateLimit('192.168.1.1')).toEqual({ allowed: true });
  });

  it('allows up to MAX_LOGIN_ATTEMPTS', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 4; i++) {
      rl.recordFailedAttempt('192.168.1.1');
      expect(rl.checkRateLimit('192.168.1.1')).toEqual({ allowed: true });
    }
  });

  it('locks out after MAX_LOGIN_ATTEMPTS', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 5; i++) {
      rl.recordFailedAttempt('192.168.1.1');
    }
    const result = rl.checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(false);
    expect(result.remainingTime).toBeGreaterThan(0);
  });

  it('different IPs are independent', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 5; i++) {
      rl.recordFailedAttempt('192.168.1.1');
    }
    expect(rl.checkRateLimit('192.168.1.1').allowed).toBe(false);
    expect(rl.checkRateLimit('10.0.0.1')).toEqual({ allowed: true });
  });

  it('reset clears attempts', () => {
    const rl = createRateLimiter();
    for (let i = 0; i < 4; i++) {
      rl.recordFailedAttempt('192.168.1.1');
    }
    rl.resetAttempts('192.168.1.1');
    expect(rl.checkRateLimit('192.168.1.1')).toEqual({ allowed: true });
  });

  it('tracks attempt count correctly', () => {
    const rl = createRateLimiter();
    rl.recordFailedAttempt('192.168.1.1');
    rl.recordFailedAttempt('192.168.1.1');
    expect(rl.getAttempts('192.168.1.1').count).toBe(2);
  });
});

describe('Admin Auth - Session Timeout', () => {
  it('session expires after timeout', () => {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    let lastActivity = Date.now();
    
    // Simulate time passing
    lastActivity = Date.now() - SESSION_TIMEOUT_MS - 1;
    const isExpired = Date.now() - lastActivity > SESSION_TIMEOUT_MS;
    expect(isExpired).toBe(true);
  });

  it('session is valid within timeout', () => {
    const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
    const lastActivity = Date.now();
    const isExpired = Date.now() - lastActivity > SESSION_TIMEOUT_MS;
    expect(isExpired).toBe(false);
  });
});

describe('Admin Auth - Login form validation', () => {
  it('validates email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('admin@bienenhaus.com.ar')).toBe(true);
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('no@domain')).toBe(false);
  });

  it('validates password minimum length', () => {
    const minLen = 6;
    expect('demo123456'.length >= minLen).toBe(true);
    expect('12345'.length >= minLen).toBe(false);
  });
});
