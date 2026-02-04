/**
 * API Client to replace Supabase
 * Connects to local PostgreSQL backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
}

export interface Session {
  access_token: string;
  expires_at: number;
  user: AuthUser;
}

// Generic record type for database operations
export type DbRecord = Record<string, unknown>;

// Database query options
export interface QueryOptions {
  select?: string;
  where?: Record<string, unknown>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

// Database filter with operator
export interface FilterOperator {
  operator: string;
  value: unknown;
}

// WebSocket message payload
export interface WebSocketMessage {
  event: string;
  channel?: string;
  payload?: unknown;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          this.token = session.access_token;
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
  }

  // Public method for direct API calls
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this._request<T>(endpoint, options);
  }

  private async _request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { error: text } : { error: 'Request failed' };
      }

      if (!response.ok) {
        return {
          error: {
            message: data.error || data.message || 'Request failed',
            code: data.code || String(response.status),
          },
        };
      }

      return { data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      return {
        error: {
          message: errorMessage,
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Auth methods
  async signUp(email: string, password: string, fullName: string) {
    const response = await this._request<{ user: AuthUser; session: Session }>(
      '/api/auth/signup',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, fullName }),
      }
    );

    if (response.data?.session) {
      this.setToken(response.data.session.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_session', JSON.stringify(response.data.session));
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      }
    }

    return response;
  }

  async signIn(email: string, password: string) {
    const response = await this.request<{ user: AuthUser; session: Session }>(
      '/api/auth/signin',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );

    if (response.data?.session) {
      this.setToken(response.data.session.access_token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_session', JSON.stringify(response.data.session));
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      }
    }

    return response;
  }

  async signOut() {
    await this._request('/api/auth/signout', { method: 'POST' });
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
      localStorage.removeItem('auth_user');
    }
  }

  async getUser() {
    return this.request<{ user: AuthUser }>('/api/auth/user');
  }

  async getSession(): Promise<Session | null> {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_session');
      if (stored) {
        try {
          const session = JSON.parse(stored);
          // Check if session exists and has access_token
          // Don't check expiration here - let the backend validate it
          if (session && session.access_token) {
            return session;
          }
        } catch (e) {
          console.error('Error parsing stored session:', e);
          // Clear invalid session
          localStorage.removeItem('auth_session');
          localStorage.removeItem('auth_user');
        }
      }
    }
    return null;
  }

  // Database methods (Supabase-like interface)
  from(table: string) {
    const self = this;

    class QueryBuilder {
      private options: QueryOptions = { select: '*', where: {} };

      select(columns: string = '*') {
        this.options.select = columns;
        return this;
      }

      eq(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: value };
        return this;
      }

      neq(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: { operator: '!=', value } };
        return this;
      }

      gt(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: { operator: '>', value } };
        return this;
      }

      gte(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: { operator: '>=', value } };
        return this;
      }

      lt(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: { operator: '<', value } };
        return this;
      }

      lte(column: string, value: unknown) {
        this.options.where = { ...this.options.where, [column]: { operator: '<=', value } };
        return this;
      }

      in(column: string, values: unknown[]) {
        this.options.where = { ...this.options.where, [column]: values };
        return this;
      }

      order(column: string, options?: { ascending?: boolean }) {
        this.options.orderBy = `${column} ${options?.ascending === false ? 'DESC' : 'ASC'}`;
        return this;
      }

      limit(count: number) {
        this.options.limit = count;
        return this;
      }

      range(from: number, to: number) {
        this.options.offset = from;
        this.options.limit = to - from + 1;
        return this;
      }

      single() {
        this.options.limit = 1;
        return this;
      }

      async then<TResult>(callback?: (result: { data: DbRecord[] | null; error: ApiResponse<unknown>['error'] | null; count: number }) => TResult) {
        const result = await self.query(table, this.options);
        if (callback) {
          return callback(result);
        }
        return result;
      }
    }

    const builder = new QueryBuilder();

    // Return the builder with additional methods
    // Use Object.assign to preserve prototype chain
    return Object.assign(builder, {
      insert: (data: DbRecord) => self.insert(table, data),
      update: (data: DbRecord) => ({
        eq: (column: string, value: unknown) => self.update(table, data, { [column]: value }),
      }),
      delete: () => ({
        eq: (column: string, value: unknown) => self.delete(table, { [column]: value }),
      }),
    });
  }

  async query(table: string, options: QueryOptions) {
    const response = await this._request<{ data: DbRecord[]; count: number }>(
      '/api/db/query',
      {
        method: 'POST',
        body: JSON.stringify({ table, ...options }),
      }
    );

    if (response.error) {
      return { data: null, error: response.error };
    }

    return {
      data: response.data?.data || [],
      error: null,
      count: response.data?.count || 0,
    };
  }

  private async insert(table: string, data: DbRecord) {
    const response = await this._request<{ data: DbRecord }>(
      `/api/db/${table}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (response.error) {
      return { data: null, error: response.error };
    }

    return { data: response.data?.data || null, error: null };
  }

  private async update(table: string, data: DbRecord, where: Record<string, unknown>) {
    // For simplicity, we'll use the first where condition as the ID
    const id = Object.values(where)[0];
    const response = await this._request<{ data: DbRecord }>(
      `/api/db/${table}/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );

    if (response.error) {
      return { data: null, error: response.error };
    }

    return { data: response.data?.data || null, error: null };
  }

  private async delete(table: string, where: Record<string, unknown>) {
    const id = Object.values(where)[0];
    const response = await this._request<{ data: DbRecord }>(
      `/api/db/${table}/${id}`,
      {
        method: 'DELETE',
      }
    );

    if (response.error) {
      return { data: null, error: response.error };
    }

    return { data: response.data?.data || null, error: null };
  }

  // Auth methods (Supabase-like interface)
  auth = {
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      return this.signIn(credentials.email, credentials.password);
    },
    signUp: async (credentials: { email: string; password: string; options?: { data?: { full_name?: string } } }) => {
      const fullName = credentials.options?.data?.full_name || '';
      return this.signUp(credentials.email, credentials.password, fullName);
    },
    signOut: async () => {
      return this.signOut();
    },
    getUser: async () => {
      const response = await this.getUser();
      if (response.error) {
        return { data: { user: null }, error: response.error };
      }
      return { data: { user: response.data?.user || null }, error: null };
    },
    getSession: async () => {
      const session = await this.getSession();
      return { data: { session }, error: null };
    },
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      // Poll for session changes (can be enhanced with WebSocket)
      let lastSession: Session | null = null;
      
      const checkSession = async () => {
        const session = await this.getSession();
        if (session !== lastSession) {
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
          lastSession = session;
        }
      };

      // Check immediately
      checkSession();

      // Poll every 5 seconds
      const interval = setInterval(checkSession, 5000);

      return {
        data: {
          subscription: {
            unsubscribe: () => clearInterval(interval),
          },
        },
      };
    },
  };

  // Edge functions replacement
  functions = {
    invoke: async <T = unknown>(functionName: string, options?: { body?: unknown; headers?: Record<string, string> }) => {
      const response = await this._request<T>(
        `/api/functions/${functionName}`,
        {
          method: 'POST',
          body: options?.body ? JSON.stringify(options.body) : undefined,
          headers: options?.headers,
        }
      );

      if (response.error) {
        return { data: null, error: response.error };
      }

      return { data: response.data || null, error: null };
    },
  };

  // Storage implementation
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`${this.baseUrl}/api/storage/${bucket}/upload`, {
            method: 'POST',
            headers: {
              Authorization: this.token ? `Bearer ${this.token}` : '',
            },
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            return { data: null, error };
          }

          const data = await response.json();
          return { data, error: null };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          return { data: null, error: { message: errorMessage } };
        }
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `${API_URL}/api/storage/${bucket}/${path}` },
      }),
      remove: async (paths: string[]) => {
        try {
          const results = await Promise.all(
            paths.map(async (filePath) => {
              const response = await fetch(`${this.baseUrl}/api/storage/${bucket}/${filePath}`, {
                method: 'DELETE',
                headers: {
                  Authorization: this.token ? `Bearer ${this.token}` : '',
                },
              });
              return response.ok;
            })
          );
          return { data: results, error: null };
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Delete failed';
          return { data: null, error: { message: errorMessage } };
        }
      },
    }),
  };

  // Real-time WebSocket implementation
  private ws: WebSocket | null = null;
  private wsChannels: Map<string, Set<(payload: unknown) => void>> = new Map();
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const token = this.token;
    const url = token ? `${wsUrl}/ws?token=${token}` : `${wsUrl}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.wsReconnectAttempts = 0;
        // Resubscribe to all channels
        this.wsChannels.forEach((_, channel) => {
          this.subscribeToChannel(channel);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        // Attempt to reconnect
        if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
          this.wsReconnectAttempts++;
          setTimeout(() => this.connectWebSocket(), 1000 * this.wsReconnectAttempts);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  private handleWebSocketMessage(data: WebSocketMessage) {
    const { event, channel, payload } = data;

    if (event === 'broadcast' && channel && this.wsChannels.has(channel)) {
      const callbacks = this.wsChannels.get(channel);
      if (callbacks) {
        callbacks.forEach((callback) => callback(payload));
      }
    }
  }

  private subscribeToChannel(channel: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'subscribe',
        channel,
      }));
    }
  }

  channel(name: string) {
    if (!this.wsChannels.has(name)) {
      this.wsChannels.set(name, new Set());
    }

    // Connect WebSocket if not connected
    this.connectWebSocket();

    const channelObj = {
      on: (event: string, configOrCallback: unknown, callback?: (payload: unknown) => void) => {
        // Handle both Supabase-style: .on('postgres_changes', config, callback)
        // and simple: .on('broadcast', callback)
        const actualCallback = (callback || configOrCallback) as (payload: unknown) => void;

        if (event === 'postgres_changes' || event === 'broadcast' || event === '*') {
          const callbacks = this.wsChannels.get(name);
          if (callbacks) {
            callbacks.add(actualCallback);
          }
          // Subscribe to channel
          setTimeout(() => this.subscribeToChannel(name), 100);
        }
        // Return channel object for chaining
        return channelObj;
      },
      subscribe: () => {
        this.subscribeToChannel(name);
        return channelObj;
      },
      unsubscribe: () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            event: 'unsubscribe',
            channel: name,
          }));
        }
        this.wsChannels.delete(name);
      },
    };
    
    return channelObj;
  }

  removeChannel(channel: { unsubscribe?: () => void } | null) {
    // Channel is an object with unsubscribe method
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  }
}

export const apiClient = new ApiClient(API_URL);

// For backward compatibility, export as "supabase"
export const supabase = apiClient;

