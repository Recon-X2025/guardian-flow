import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient, Session } from '@/integrations/api/client';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // First, try to restore from localStorage immediately (synchronous)
        if (typeof window !== 'undefined') {
          const storedUser = localStorage.getItem('auth_user');
          const storedSession = localStorage.getItem('auth_session');
          
          if (storedUser && storedSession) {
            try {
              const user = JSON.parse(storedUser);
              const session = JSON.parse(storedSession);
              
              // Set token immediately for API calls
              if (session.access_token) {
                apiClient.setToken(session.access_token);
                setUser(user);
                setSession(session);
              }
            } catch (e) {
              console.error('Error parsing stored session/user:', e);
            }
          }
        }
        
        // Then verify the session with the backend
        const currentSession = await apiClient.getSession();
        if (currentSession && currentSession.access_token) {
          // Set token first so API calls work
          apiClient.setToken(currentSession.access_token);
          
          // Verify session is still valid with backend
          const { data, error } = await apiClient.getUser();
          if (error || !data?.user) {
            // Session invalid, clear it
            console.warn('Session validation failed:', error);
            setSession(null);
            setUser(null);
            apiClient.setToken(null);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_session');
              localStorage.removeItem('auth_user');
            }
          } else {
            // Session is valid, update user from backend
            setSession(currentSession);
            setUser(data.user);
            // Update localStorage with fresh user data
            if (typeof window !== 'undefined') {
              localStorage.setItem('auth_user', JSON.stringify(data.user));
            }
          }
        } else {
          // No valid session found
          if (typeof window !== 'undefined') {
            // Clear invalid stored data
            localStorage.removeItem('auth_session');
            localStorage.removeItem('auth_user');
          }
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Session check error:', error);
        // On error, clear session but don't fail completely
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_session');
          localStorage.removeItem('auth_user');
        }
        setSession(null);
        setUser(null);
        apiClient.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Starting signIn...');
      const response = await apiClient.signIn(email, password);
      
      if (response.error) {
        console.error('AuthContext: SignIn error:', response.error);
        return { error: response.error };
      }

      if (!response.data?.session) {
        console.error('AuthContext: No session in response:', response);
        return { error: { message: 'No session received from server' } };
      }

      console.log('AuthContext: SignIn successful, setting session and user');
      
      // Set token immediately
      apiClient.setToken(response.data.session.access_token);
      
      // Store in localStorage first for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_session', JSON.stringify(response.data.session));
        localStorage.setItem('auth_user', JSON.stringify(response.data.user));
      }
      
      // Store session and user immediately (this will trigger navigation in Auth.tsx)
      setSession(response.data.session);
      setUser(response.data.user);
      
      console.log('AuthContext: Session and user set, login complete');
      console.log('AuthContext: User:', response.data.user);
      console.log('AuthContext: Session token:', response.data.session.access_token.substring(0, 20) + '...');
      
      return { error: null };
    } catch (error: any) {
      console.error('AuthContext: SignIn exception:', error);
      return { error: { message: error.message || 'Login failed' } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await apiClient.signUp(email, password, fullName);
      
      if (response.error) {
        return { error: response.error };
      }

      if (response.data?.session) {
        // Set token immediately
        apiClient.setToken(response.data.session.access_token);
        
        // Store session and user
        setSession(response.data.session);
        setUser(response.data.user);
        
        // Verify the session is valid by getting user info
        const { data: userData, error: userError } = await apiClient.getUser();
        if (!userError && userData?.user) {
          setUser(userData.user);
        }
      }
      
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.signOut();
      setSession(null);
      setUser(null);
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local state anyway
      setSession(null);
      setUser(null);
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
