/**
 * YULA SDK Errors
 */

/**
 * Base error class for YULA SDK
 */
export class YulaError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'YulaError';
    Object.setPrototypeOf(this, YulaError.prototype);
  }
}

/**
 * Authentication error (401)
 */
export class YulaAuthError extends YulaError {
  constructor(message = 'Authentication failed', details?: unknown) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'YulaAuthError';
    Object.setPrototypeOf(this, YulaAuthError.prototype);
  }
}

/**
 * Rate limit error (429)
 */
export class YulaRateLimitError extends YulaError {
  constructor(
    message = 'Rate limit exceeded',
    public retryAfter?: number,
    details?: unknown
  ) {
    super(message, 'RATE_LIMIT', 429, details);
    this.name = 'YulaRateLimitError';
    Object.setPrototypeOf(this, YulaRateLimitError.prototype);
  }
}

/**
 * Resource not found error (404)
 */
export class YulaNotFoundError extends YulaError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'YulaNotFoundError';
    Object.setPrototypeOf(this, YulaNotFoundError.prototype);
  }
}

/**
 * Bad request error (400)
 */
export class YulaBadRequestError extends YulaError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 'BAD_REQUEST', 400, details);
    this.name = 'YulaBadRequestError';
    Object.setPrototypeOf(this, YulaBadRequestError.prototype);
  }
}

/**
 * Server error (500)
 */
export class YulaServerError extends YulaError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(message, 'SERVER_ERROR', 500, details);
    this.name = 'YulaServerError';
    Object.setPrototypeOf(this, YulaServerError.prototype);
  }
}

/**
 * Network error
 */
export class YulaNetworkError extends YulaError {
  constructor(message = 'Network request failed', details?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, details);
    this.name = 'YulaNetworkError';
    Object.setPrototypeOf(this, YulaNetworkError.prototype);
  }
}

/**
 * Map HTTP status code to appropriate error class
 */
export function mapStatusToError(
  status: number,
  message: string,
  details?: unknown
): YulaError {
  switch (status) {
    case 400:
      return new YulaBadRequestError(message, details);
    case 401:
      return new YulaAuthError(message, details);
    case 404:
      return new YulaNotFoundError(message, details);
    case 429:
      return new YulaRateLimitError(message, undefined, details);
    case 500:
    case 502:
    case 503:
    case 504:
      return new YulaServerError(message, details);
    default:
      return new YulaError(message, 'UNKNOWN_ERROR', status, details);
  }
}
