/**
 * @typedef {Object} RateLimitResult
 * @property {boolean} allowed - Whether the action is allowed
 * @property {number} remaining - Number of remaining attempts
 * @property {number} resetAt - Timestamp when the rate limit resets
 */

/**
 * Rate limiter utility using sliding window algorithm
 */
class RateLimiter {
  /**
   * @param {number} maxAttempts - Maximum number of attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxAttempts, windowMs) {
    /** @type {Map<string, number[]>} */
    this.attempts = new Map();
    /** @type {number} */
    this.maxAttempts = maxAttempts;
    /** @type {number} */
    this.windowMs = windowMs;
  }

  /**
   * Check if an action is allowed for a given key
   * @param {string} key - The key to check rate limit for (e.g., user ID)
   * @returns {RateLimitResult}
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or initialize attempts array for this key
    let attempts = this.attempts.get(key);
    if (!attempts) {
      attempts = [];
      this.attempts.set(key, attempts);
    }

    // Remove attempts outside the current window
    const validAttempts = attempts.filter((timestamp) => timestamp > windowStart);
    this.attempts.set(key, validAttempts);

    // Check if limit is exceeded
    const remaining = Math.max(0, this.maxAttempts - validAttempts.length);
    const allowed = validAttempts.length < this.maxAttempts;

    // Calculate reset time (oldest attempt + window duration)
    const resetAt = validAttempts.length > 0 ? Math.min(...validAttempts) + this.windowMs : now;

    return {
      allowed,
      remaining,
      resetAt,
    };
  }

  /**
   * Record an attempt for a given key
   * @param {string} key - The key to record attempt for
   * @returns {RateLimitResult}
   */
  attempt(key) {
    const result = this.check(key);
    if (result.allowed) {
      const attempts = this.attempts.get(key);
      if (attempts) {
        attempts.push(Date.now());
      }
    }
    return result;
  }

  /**
   * Reset rate limit for a given key
   * @param {string} key - The key to reset
   * @returns {void}
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Clear all rate limit data
   * @returns {void}
   */
  clear() {
    this.attempts.clear();
  }

  /**
   * Clean up expired entries (attempts older than window)
   * @returns {number} Number of keys removed
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let removed = 0;

    for (const [key, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter((timestamp) => timestamp > windowStart);
      if (validAttempts.length === 0) {
        this.attempts.delete(key);
        removed++;
      } else {
        this.attempts.set(key, validAttempts);
      }
    }

    return removed;
  }
}

/**
 * Create a rate limiter instance
 * @param {number} maxAttempts - Maximum number of attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {RateLimiter}
 */
function createRateLimiter(maxAttempts, windowMs) {
  return new RateLimiter(maxAttempts, windowMs);
}

export { RateLimiter, createRateLimiter };
