/**
 * Typed application errors thrown by the service layer (AGENTS.md §8).
 * Map these to HTTP/tRPC/Server Action responses at the boundary.
 */

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super(message);
  }
}

export class ConflictError extends AppError {
  /** When set, the conflicting record id (e.g. for dedupe/merge flows). */
  existingId?: string;

  constructor(message: string, existingId?: string) {
    super(message);
    this.existingId = existingId;
  }
}
