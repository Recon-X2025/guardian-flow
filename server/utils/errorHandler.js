/**
 * Standardized error response handler
 * Ensures consistent error format across all API endpoints
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'internal_error', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;
  const code = err.code || 'internal_error';

  // Standardized error response
  // Only expose detailed messages for operational errors or in development
  const isOperational = err.isOperational || false;
  const isDev = process.env.NODE_ENV !== 'production';
  const safeMessage = (isOperational || isDev)
    ? (err.message || 'An unexpected error occurred')
    : 'An unexpected error occurred';

  const errorResponse = {
    success: false,
    error: {
      code,
      message: safeMessage,
      ...(isOperational && err.details && { details: err.details }),
      ...(isDev && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const validationError = (message, details = null) => {
  return new AppError(message, 400, 'validation_error', details);
};

export const notFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404, 'not_found');
};

export const unauthorizedError = (message = 'Unauthorized') => {
  return new AppError(message, 401, 'unauthorized');
};

export const forbiddenError = (message = 'Forbidden') => {
  return new AppError(message, 403, 'forbidden');
};

