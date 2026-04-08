import * as React from "react";
import { useTheme } from "../../domains/shared/hooks/useTheme";

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        padding: "var(--gf-space-2)",
        background: "var(--gf-color-bg-surface)",
        border: "1px solid var(--gf-color-border)",
        cursor: "pointer",
        fontSize: "var(--gf-font-size-lg)",
        transition: `background var(--gf-duration-normal)`,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--gf-color-bg-subtle)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "var(--gf-color-bg-surface)";
      }}
    >
      {resolvedTheme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
