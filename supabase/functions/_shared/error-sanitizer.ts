/**
 * Error Sanitization Utility
 * Sanitizes error messages for production environments
 */

export interface SanitizedError {
  error: string;
  code?: string;
  correlationId?: string;
}

/**
 * Sanitize error for client response
 * Logs full error server-side, returns generic message to client
 */
export function sanitizeError(
  error: any,
  correlationId?: string,
  includeDetails: boolean = false
): SanitizedError {
  // Log full error server-side
  console.error('[Error]', {
    correlationId,
    message: error.message,
    stack: error.stack,
    code: error.code,
    details: error
  });

  // Determine error type
  const errorType = getErrorType(error);

  // Return sanitized error to client
  if (includeDetails && Deno.env.get('ENVIRONMENT') === 'development') {
    return {
      error: error.message || 'An error occurred',
      code: error.code || errorType,
      correlationId
    };
  }

  // Production: return generic messages
  return {
    error: getGenericMessage(errorType),
    code: errorType,
    correlationId
  };
}

function getErrorType(error: any): string {
  // Database errors
  if (error.code?.startsWith('23')) return 'DATABASE_CONSTRAINT';
  if (error.code?.startsWith('42')) return 'DATABASE_SYNTAX';
  if (error.code?.startsWith('53')) return 'DATABASE_RESOURCE';
  
  // Auth errors
  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return 'AUTHENTICATION_ERROR';
  }
  
  // Permission errors
  if (error.code === '42501' || error.message?.includes('permission')) {
    return 'AUTHORIZATION_ERROR';
  }
  
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return 'NETWORK_ERROR';
  }
  
  // Validation errors
  if (error.message?.includes('invalid') || error.message?.includes('validation')) {
    return 'VALIDATION_ERROR';
  }
  
  return 'INTERNAL_ERROR';
}

function getGenericMessage(errorType: string): string {
  const messages: Record<string, string> = {
    DATABASE_CONSTRAINT: 'Unable to complete operation due to data constraints',
    DATABASE_SYNTAX: 'Invalid request format',
    DATABASE_RESOURCE: 'Service temporarily unavailable',
    AUTHENTICATION_ERROR: 'Authentication failed',
    AUTHORIZATION_ERROR: 'Insufficient permissions',
    NETWORK_ERROR: 'Network communication error',
    VALIDATION_ERROR: 'Invalid input data',
    INTERNAL_ERROR: 'An internal error occurred'
  };
  
  return messages[errorType] || 'An unexpected error occurred';
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: any,
  status: number = 500,
  correlationId?: string,
  headers: Record<string, string> = {}
): Response {
  const sanitized = sanitizeError(error, correlationId);
  
  return new Response(
    JSON.stringify(sanitized),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}
