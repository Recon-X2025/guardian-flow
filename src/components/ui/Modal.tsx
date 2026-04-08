import * as React from "react";
import ReactDOM from "react-dom";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnBackdrop?: boolean;
}

const SIZE_MAP: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "380px",
  md: "520px",
  lg: "720px",
  xl: "960px",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  closeOnBackdrop = true,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  /* ── Body scroll lock ──────────────────────────────────── */
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* ── Focus trap + Escape ───────────────────────────────── */
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;

    const el = dialogRef.current;

    // Focus first focusable element
    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusableEls = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--gf-color-bg-overlay)",
          zIndex: "var(--gf-z-modal)",
          animation: `gf-modal-fade-in var(--gf-duration-normal) var(--gf-easing-out) both`,
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: `min(${SIZE_MAP[size]}, calc(100vw - var(--gf-space-8)))`,
          maxHeight: "calc(100vh - var(--gf-space-12))",
          overflowY: "auto",
          background: "var(--gf-color-bg)",
          borderRadius: "var(--gf-radius-2xl)",
          boxShadow: "var(--gf-shadow-2xl, var(--gf-shadow-xl))",
          padding: "var(--gf-space-6)",
          zIndex: "calc(var(--gf-z-modal) + 1)",
          animation: `gf-modal-scale-in var(--gf-duration-normal) var(--gf-easing-out) both`,
          outline: "none",
          fontFamily: "var(--gf-font-family-sans)",
        }}
      >
        {/* Header */}
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "var(--gf-space-4)",
              gap: "var(--gf-space-4)",
            }}
          >
            <h2
              id={titleId}
              style={{
                margin: 0,
                fontSize: "var(--gf-font-size-xl)",
                fontWeight: "var(--gf-font-weight-semibold)",
                color: "var(--gf-color-text-primary)",
                lineHeight: 1.3,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "1px solid var(--gf-color-border)",
                borderRadius: "var(--gf-radius-md)",
                cursor: "pointer",
                padding: "var(--gf-space-1) var(--gf-space-2)",
                color: "var(--gf-color-text-muted)",
                fontSize: "var(--gf-font-size-md)",
                lineHeight: 1,
                transition: `background var(--gf-duration-fast)`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--gf-color-bg-subtle)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div>{children}</div>
      </div>

      {/* Keyframe animations injected once */}
      <style>{`
        @keyframes gf-modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes gf-modal-scale-in {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );

  return ReactDOM.createPortal(modal, document.body);
}
