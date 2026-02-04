import { apiClient } from "@/integrations/api/client";
import { ModuleId } from "@/domains/auth/config/authConfig";

export type AuthAuditEvent =
  | "auth_page_view"
  | "auth_attempt"
  | "auth_success"
  | "auth_failure";

// Lightweight, non-PII auth event logger
export async function logAuthEvent(
  event: AuthAuditEvent,
  module: ModuleId,
  details?: Record<string, unknown>
) {
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
    await apiClient.functions.invoke("log-frontend-error", {
      body: payload,
    });
  } catch {
    // Silently ignore errors - this is best-effort logging
  }
}
