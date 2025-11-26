import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { user, loading } = auth;
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authRef = useRef(auth);
  const [checkingSession, setCheckingSession] = useState(true);

  // Keep auth ref updated
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

  // Helper to check if user exists in localStorage (for immediate check)
  const checkLocalStorageUser = () => {
    try {
      if (typeof window === 'undefined') return false;
      const storedUser = localStorage.getItem('auth_user');
      const storedSession = localStorage.getItem('auth_session');
      if (storedUser && storedSession) {
        try {
          // Validate that the data can be parsed
          JSON.parse(storedUser);
          JSON.parse(storedSession);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Give AuthContext time to restore session from localStorage
  useEffect(() => {
    // Wait a bit for AuthContext to restore session
    const timer = setTimeout(() => {
      setCheckingSession(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Clear any pending redirects
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }

    // CRITICAL: If user exists in localStorage, NEVER redirect
    // This is the source of truth - if localStorage has it, user is logged in
    if (checkLocalStorageUser()) {
      console.log('ProtectedRoute: User found in localStorage, waiting for React state...');
      // User exists in localStorage - React state will catch up
      // Don't redirect, just wait
      return;
    }

    // Only proceed with redirect logic if:
    // 1. We're done checking session
    // 2. AuthContext is done loading
    // 3. No user in React state
    // 4. No user in localStorage
    if (!checkingSession && !loading && !user && !checkLocalStorageUser()) {
      // Check if we just logged in (to prevent redirect loops)
      const justLoggedIn = typeof window !== 'undefined' ? sessionStorage.getItem('just_logged_in') === 'true' : false;
      
      if (justLoggedIn) {
        console.log('ProtectedRoute: Just logged in flag detected, waiting for user state...');
        // Wait longer when we just logged in
        redirectTimeoutRef.current = setTimeout(() => {
          // After waiting, check one more time
          if (authRef.current.user || checkLocalStorageUser()) {
            console.log('ProtectedRoute: User found after wait, canceling redirect');
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('just_logged_in');
            }
            return;
          }
          // If still no user, clear flag
          console.warn('ProtectedRoute: User still not found after login wait');
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('just_logged_in');
          }
        }, 3000); // Wait 3 seconds for user state to propagate
        return;
      }
      
      // Longer delay to allow session restoration and state updates
      redirectTimeoutRef.current = setTimeout(() => {
        // Re-check user from auth ref one more time before redirecting
        if (authRef.current.user || checkLocalStorageUser()) {
          console.log('ProtectedRoute: User found during timeout, canceling redirect');
          return;
        }
        
        // Double-check the just_logged_in flag
        const stillJustLoggedIn = typeof window !== 'undefined' ? sessionStorage.getItem('just_logged_in') === 'true' : false;
        if (stillJustLoggedIn) {
          console.log('ProtectedRoute: Still waiting for login to complete, canceling redirect');
          return;
        }
        
        const pathname = location.pathname;
        console.log('ProtectedRoute: No user found anywhere, redirecting from', pathname);
        
        // Don't redirect if we're already on an auth page
        if (pathname.includes('/auth')) {
          console.log('ProtectedRoute: Already on auth page, not redirecting');
          return;
        }
        
        // Determine the appropriate auth page based on route
        let authPath = '/auth';
        
        if (pathname.startsWith('/customer-portal')) {
          authPath = '/auth/customer';
        } else if (pathname.startsWith('/work-orders') || pathname.startsWith('/dispatch')) {
          authPath = '/auth/fsm';
        } else if (pathname.startsWith('/equipment') || pathname.startsWith('/assets')) {
          authPath = '/auth/asset';
        } else if (pathname.startsWith('/forecast') || pathname.startsWith('/scheduler')) {
          authPath = '/auth/forecasting';
        } else if (pathname.startsWith('/modules/image-forensics') || pathname.startsWith('/fraud')) {
          authPath = '/auth/fraud';
        } else if (pathname.startsWith('/marketplace')) {
          authPath = '/auth/marketplace';
        } else if (pathname.startsWith('/analytics') || pathname.startsWith('/analytics-platform')) {
          authPath = '/auth/analytics';
        } else if (pathname.startsWith('/knowledge-base') || pathname.startsWith('/training')) {
          authPath = '/auth/training';
        }
        
        console.log(`ProtectedRoute: Redirecting to ${authPath}`);
        navigate(authPath, { replace: true });
      }, 2000); // Wait 2 seconds before redirecting
    } else if (user || checkLocalStorageUser()) {
      // User exists, clear any pending redirects
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      // Clear the just_logged_in flag once user is confirmed
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('just_logged_in');
      }
    }

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [user, loading, checkingSession, navigate, location.pathname, auth]);

  // Show loading if:
  // 1. AuthContext is still loading
  // 2. We're still checking session
  // 3. User exists in localStorage but not in React state yet
  if (loading || checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check localStorage first - if user exists there, wait for React state to catch up
  const hasStoredUser = checkLocalStorageUser();
  const justLoggedIn = typeof window !== 'undefined' ? sessionStorage.getItem('just_logged_in') === 'true' : false;
  
  if (!user) {
    // If user exists in localStorage or we just logged in, show loading while state updates
    // This prevents redirects right after login
    if (hasStoredUser || justLoggedIn) {
      console.log('ProtectedRoute: User in localStorage or just logged in, showing loading (NOT redirecting)...');
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    // Show loading while checking - useEffect above will handle redirect after timeout
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
