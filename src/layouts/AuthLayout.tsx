import * as React from "react";
import { useTheme } from "../domains/shared/hooks/useTheme";
import { ThemeToggle } from "../components/ui/ThemeToggle";

export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div
      data-theme={resolvedTheme}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, var(--gf-color-primary-900) 0%, var(--gf-color-secondary-700) 100%)",
        fontFamily: "var(--gf-font-family-sans)",
        position: "relative",
        padding: "var(--gf-space-4)",
      }}
    >
      {/* Theme toggle — absolute top-right */}
      <div style={{ position: "absolute", top: "var(--gf-space-4)", right: "var(--gf-space-4)" }}>
        <ThemeToggle />
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--gf-color-bg)",
          borderRadius: "var(--gf-radius-2xl)",
          boxShadow: "var(--gf-shadow-xl)",
          padding: "var(--gf-space-10) var(--gf-space-8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--gf-space-4)",
        }}
      >
        {/* Logo placeholder */}
        <div
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "9999px",
            background: "var(--gf-color-primary-600)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--gf-font-size-lg)",
            fontWeight: "var(--gf-font-weight-bold)",
            flexShrink: 0,
          }}
        >
          GF
        </div>

        {title && (
          <h1
            style={{
              margin: 0,
              fontSize: "var(--gf-font-size-2xl)",
              fontWeight: "var(--gf-font-weight-semibold)",
              color: "var(--gf-color-text-primary)",
              textAlign: "center",
            }}
          >
            {title}
          </h1>
        )}

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--gf-font-size-sm)",
              color: "var(--gf-color-text-muted)",
              textAlign: "center",
            }}
          >
            {subtitle}
          </p>
        )}

        <div style={{ width: "100%" }}>{children}</div>
      </div>
    </div>
  );
}
