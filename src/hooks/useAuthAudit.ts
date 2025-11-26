import { apiClient } from "@/integrations/api/client";
import { ModuleId } from "@/config/authConfig";

export type AuthAuditEvent =
  | "auth_page_view"
  | "auth_attempt"
  | "auth_success"
  | "auth_failure";

// Lightweight, non-PII auth event logger
// Note: Currently disabled to avoid API errors - can be re-enabled when log-frontend-error endpoint is implemented
export async function logAuthEvent(
  event: AuthAuditEvent,
  module: ModuleId,
  details?: Record<string, unknown>
) {
  // Temporarily disabled - log-frontend-error endpoint not yet implemented
  // This prevents 401/501 errors in the console
  // TODO: Re-enable when backend endpoint is ready
  return;
  
  /* Original implementation - disabled for now
  try {
    // Do NOT include PII (no emails, passwords, tokens)
    const payload = {
      category: "auth_event",
      event,
      module,
      ts: Date.now(),
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      ...details,
    };

    // Best-effort logging to backend function; ignore failures silently
    const result = await apiClient.functions.invoke("log-frontend-error", {
      body: payload,
    });
    
    // Silently ignore errors - this is best-effort logging
    if (result.error) {
      return;
    }
  } catch (_) {
    // Silently ignore errors - this is best-effort logging
  }
  */
}
