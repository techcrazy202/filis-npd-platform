// backend/src/database/errors.ts
// Custom Database Error Classes

export class DatabaseError extends Error {
  public code?: string;
  public severity?: string;
  public detail?: string;

  constructor(message: string, code?: string, severity?: string, detail?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.severity = severity;
    this.detail = detail;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with id ${id}` : ''} not found`);
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends Error {
  constructor(resource: string, field?: string) {
    super(`${resource}${field ? ` with ${field}` : ''} already exists`);
    this.name = 'DuplicateError';
  }
}