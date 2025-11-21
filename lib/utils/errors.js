/** Classes de erro customizadas com statusCode HTTP e code para tratamento no frontend */

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Validation failed', details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
    this.code = 'VALIDATION_ERROR';
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database error', originalError = null) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.originalError = originalError;
    this.code = 'DATABASE_ERROR';
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    this.code = 'UNAUTHORIZED';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.code = 'FORBIDDEN';
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(message = 'Usuário não encontrado') {
    super(message);
    this.name = 'UserNotFoundError';
    this.code = 'USER_NOT_FOUND';
  }
}

export class InvalidPasswordError extends UnauthorizedError {
  constructor(message = 'Senha incorreta') {
    super(message);
    this.name = 'InvalidPasswordError';
    this.code = 'INVALID_PASSWORD';
  }
}

export class EmailAlreadyExistsError extends ValidationError {
  constructor(message = 'Email já cadastrado') {
    super(message);
    this.name = 'EmailAlreadyExistsError';
    this.code = 'EMAIL_ALREADY_REGISTERED';
  }
}

/** Cria objeto de resposta padronizado com statusCode, name, message e code */
export function errorResponse(error) {
  return {
    error: {
      name: error.name || 'Error',
      message: error.message,
      statusCode: error.statusCode || 500,
      details: error.details || null,
      code: error.code || null
    }
  };
}
