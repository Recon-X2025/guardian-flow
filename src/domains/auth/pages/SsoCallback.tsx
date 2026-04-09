/**
 * /auth/sso-callback
 *
 * Landing page after a successful SSO flow (OIDC or SAML).
 * The server redirects here with tokens in the URL fragment:
 *   /auth/sso-callback#access_token=...&refresh_token=...&expires_at=...
 *
 * This page reads the fragment, persists the session to localStorage,
 * notifies the AuthContext, and navigates to the dashboard.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';

export default function SsoCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const fragment = window.location.hash.slice(1); // strip leading #
      if (!fragment) {
        setError('No session data received from identity provider.');
        return;
      }

      const params = new URLSearchParams(fragment);
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresAt    = params.get('expires_at');
      const errorParam   = params.get('error');

      if (errorParam) {
        setError(`Identity provider returned an error: ${errorParam}`);
        return;
      }

      if (!accessToken) {
        setError('No access token received from identity provider.');
        return;
      }

      // Persist session in the same format the rest of the app uses
      const session = {
        access_token:  accessToken,
        refresh_token: refreshToken ?? undefined,
        expires_at:    expiresAt ? parseInt(expiresAt, 10) : Date.now() + 3600_000,
      };

      localStorage.setItem('auth_session', JSON.stringify(session));

      // Clear the fragment from the URL before navigating away
      history.replaceState(null, '', window.location.pathname);

      // Reload so AuthContext picks up the new session from localStorage
      navigate('/dashboard', { replace: true });
      window.location.reload();
    } catch (err) {
      setError('An unexpected error occurred while processing your sign-in.');
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">Sign-in failed</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/auth" className="text-sm text-primary underline underline-offset-4">
            Return to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
