import * as React from "react";
import { useTheme } from "../domains/shared/hooks/useTheme";
import { ThemeToggle } from "../components/ui/ThemeToggle";

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    path: "/",            icon: "🏠" },
  { label: "Work Orders",  path: "/work-orders",  icon: "📋" },
  { label: "Tickets",      path: "/tickets",      icon: "🎫" },
  { label: "Customers",    path: "/customers",    icon: "👥" },
  { label: "Technicians",  path: "/technicians",  icon: "👷" },
  { label: "Invoices",     path: "/invoices",     icon: "💰" },
  { label: "Analytics",    path: "/analytics",    icon: "📊" },
  { label: "Settings",     path: "/settings",     icon: "⚙️" },
];

export interface AppLayoutProps {
  children: React.ReactNode;
}

/* ── Sub-components ──────────────────────────────────────────────────── */

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "var(--gf-space-6)",
      }}
    >
      <h1
        style={{
          fontSize: "var(--gf-font-size-2xl)",
          fontWeight: "var(--gf-font-weight-semibold)",
          color: "var(--gf-color-text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {action && <div>{action}</div>}
    </div>
  );
}

function Content({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

/* ── Main layout ─────────────────────────────────────────────────────── */

export function AppLayout({ children }: AppLayoutProps) {
  const { resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const sidebarWidth = collapsed
    ? "var(--gf-sidebar-collapsed-width)"
    : "var(--gf-sidebar-width)";

  return (
    <div
      data-theme={resolvedTheme}
      style={{
        minHeight: "100vh",
        background: "var(--gf-color-bg)",
        color: "var(--gf-color-text-primary)",
        fontFamily: "var(--gf-font-family-sans)",
      }}
    >
      {/* ── Mobile backdrop ─────────────────────────────────── */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--gf-color-bg-overlay)",
            zIndex: "calc(var(--gf-z-overlay) - 1)",
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          background: "var(--gf-color-bg-subtle)",
          borderRight: "1px solid var(--gf-color-border)",
          display: "flex",
          flexDirection: "column",
          transition: `width var(--gf-duration-normal) var(--gf-easing-out)`,
          zIndex: "var(--gf-z-overlay)",
          overflow: "hidden",
          /* Hide on mobile unless toggled open */
          transform:
            typeof window !== "undefined" && window.innerWidth < 768
              ? mobileOpen
                ? "translateX(0)"
                : "translateX(-100%)"
              : "translateX(0)",
        }}
        // Recalculate transform on window resize via inline style isn't reactive —
        // we use a className-based approach via a wrapping element instead.
      >
        {/* Logo area */}
        <div
          style={{
            height: "var(--gf-topbar-height)",
            display: "flex",
            alignItems: "center",
            padding: collapsed
              ? `0 var(--gf-space-3)`
              : `0 var(--gf-space-4)`,
            borderBottom: "1px solid var(--gf-color-border)",
            flexShrink: 0,
            gap: "var(--gf-space-3)",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <span
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--gf-radius-lg)",
              background: "var(--gf-color-primary-600)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--gf-font-size-sm)",
              fontWeight: "var(--gf-font-weight-bold)",
              flexShrink: 0,
            }}
          >
            GF
          </span>
          {!collapsed && (
            <span
              style={{
                fontWeight: "var(--gf-font-weight-semibold)",
                fontSize: "var(--gf-font-size-md)",
                color: "var(--gf-color-text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              Guardian Flow
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--gf-space-4) var(--gf-space-3)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--gf-space-1)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.path}
              href={item.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--gf-space-3)",
                padding: `var(--gf-space-3) var(--gf-space-4)`,
                borderRadius: "var(--gf-radius-lg)",
                textDecoration: "none",
                color: "var(--gf-color-text-secondary)",
                fontSize: "var(--gf-font-size-sm)",
                fontWeight: "var(--gf-font-weight-medium)",
                justifyContent: collapsed ? "center" : "flex-start",
                transition: `background var(--gf-duration-fast)`,
                whiteSpace: "nowrap",
              }}
              title={collapsed ? item.label : undefined}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "var(--gf-color-bg-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "transparent";
              }}
            >
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>
                {item.icon}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div
          style={{
            padding: "var(--gf-space-3)",
            borderTop: "1px solid var(--gf-color-border)",
            flexShrink: 0,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
          }}
        >
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
            style={{
              background: "transparent",
              border: "1px solid var(--gf-color-border)",
              borderRadius: "var(--gf-radius-lg)",
              cursor: "pointer",
              padding: "var(--gf-space-2)",
              color: "var(--gf-color-text-muted)",
              fontSize: "var(--gf-font-size-sm)",
              lineHeight: 1,
              transition: `background var(--gf-duration-fast)`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--gf-color-bg-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
      </aside>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "var(--gf-topbar-height)",
          background: "var(--gf-color-bg)",
          borderBottom: "1px solid var(--gf-color-border)",
          display: "flex",
          alignItems: "center",
          padding: `0 var(--gf-space-4)`,
          gap: "var(--gf-space-3)",
          zIndex: "calc(var(--gf-z-overlay) - 1)",
          // Responsive left offset handled via CSS custom property fallback
          left: sidebarWidth,
          transition: `left var(--gf-duration-normal) var(--gf-easing-out)`,
        }}
      >
        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen((o) => !o)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "var(--gf-font-size-xl)",
            color: "var(--gf-color-text-secondary)",
            padding: "var(--gf-space-2)",
            borderRadius: "var(--gf-radius-md)",
            display: "none", // visible via media query fallback; shown below with className
          }}
          className="gf-mobile-hamburger"
        >
          ☰
        </button>

        <span
          style={{
            fontWeight: "var(--gf-font-weight-semibold)",
            fontSize: "var(--gf-font-size-md)",
            color: "var(--gf-color-text-primary)",
          }}
        >
          Guardian Flow
        </span>

        <div style={{ flex: 1 }} />

        <ThemeToggle />
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        style={{
          marginLeft: sidebarWidth,
          paddingTop: "var(--gf-topbar-height)",
          padding: `var(--gf-topbar-height) var(--gf-space-6) var(--gf-space-6)`,
          transition: `margin-left var(--gf-duration-normal) var(--gf-easing-out)`,
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>

      {/* Inline style for mobile responsiveness */}
      <style>{`
        @media (max-width: 767px) {
          .gf-mobile-hamburger { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
}

AppLayout.PageHeader = PageHeader;
AppLayout.Content = Content;
