import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/contexts/RBACContext';
import { getRedirectRoute } from '@/utils/getRedirectRoute';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // 🔴 DEBUG BREAKPOINT: Set here to debug route protection logic
  // 🔴 WATCH: user, loading, user?.email, user?.id
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: rbacLoading } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 🔴 DEBUG BREAKPOINT: Set here to inspect authentication checks on route access
    // 🔴 WATCH: loading, user, user?.id
    if (!authLoading && !user) {
      // 🔴 DEBUG BREAKPOINT: Set here to debug redirect to auth page
      // This breakpoint hits when unauthenticated user tries to access protected route
      navigate('/auth');
      return;
    }

    // If user is authenticated and lands on /auth, redirect to their module landing page
    if (!authLoading && !rbacLoading && user && location.pathname === '/auth') {
      const redirectPath = getRedirectRoute(roles);
      navigate(redirectPath);
    }
  }, [user, authLoading, rbacLoading, roles, navigate, location.pathname]);

  if (authLoading || rbacLoading) {
    // 🔴 DEBUG BREAKPOINT: Set here to inspect loading state during auth check
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // 🔴 DEBUG BREAKPOINT: Set here when user is not authenticated
    return null;
  }

  // 🔴 DEBUG BREAKPOINT: Set here when user is authenticated and route access is granted
  // 🔴 WATCH: user, children
  return <>{children}</>;
}
