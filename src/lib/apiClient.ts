import { supabase } from '@/integrations/supabase/client';

export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
  allowedActions?: string[];
}

export class UnauthorizedError extends Error {
  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(public error: ApiError) {
    super(error.message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Standardized API client wrapper with proper error handling
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new UnauthorizedError({
      code: 'unauthorized',
      message: 'Authentication required',
      correlationId: crypto.randomUUID(),
    });
  }

  const response = await supabase.functions.invoke(functionName, {
    body: options.body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (response.error) {
    const error = response.error as any;
    const correlationId = error.correlationId || crypto.randomUUID();

    if (error.code === 'unauthorized' || error.status === 401) {
      throw new UnauthorizedError({
        code: 'unauthorized',
        message: error.message || 'Authentication failed',
        correlationId,
      });
    }

    if (error.code === 'forbidden' || error.status === 403) {
      throw new ForbiddenError({
        code: 'forbidden',
        message: error.message || 'Insufficient permissions',
        correlationId,
        allowedActions: error.allowedActions,
      });
    }

    throw new Error(error.message || 'API request failed');
  }

  return response.data as T;
}

/**
 * Handle API errors with user-friendly toast messages
 */
export function handleApiError(error: unknown, toast: any) {
  if (error instanceof UnauthorizedError) {
    toast({
      variant: 'destructive',
      title: 'Authentication Required',
      description: 'Please log in to continue',
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    toast({
      variant: 'destructive',
      title: 'Access Denied',
      description: error.error.message,
    });
    console.error('Correlation ID:', error.error.correlationId);
    return;
  }

  if (error instanceof Error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message,
    });
    return;
  }

  toast({
    variant: 'destructive',
    title: 'Unknown Error',
    description: 'An unexpected error occurred',
  });
}
