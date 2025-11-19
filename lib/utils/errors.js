/**
 * Custom Error classes para melhor tratamento de erros.
 * Cada erro possui um statusCode HTTP apropriado.
 */

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed', details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database error', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

/**
 * Helper para criar resposta de erro padronizada.
 */
export function errorResponse(error) {
  return {
    error: {
      name: error.name || 'Error',
      message: error.message,
      statusCode: error.statusCode || 500,
      details: error.details || null
    }
  };
}
