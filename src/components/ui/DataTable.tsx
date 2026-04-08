import * as React from "react";

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

type SortDir = "asc" | "desc";

function getCellValue<T extends Record<string, unknown>>(
  row: T,
  key: keyof T | string,
): unknown {
  return row[key as keyof T];
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyState,
  onRowClick,
  pageSize = 10,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<keyof T | string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [page, setPage] = React.useState(1);

  /* ── Sorting ───────────────────────────────────────────── */
  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = getCellValue(a, sortKey);
      const bv = getCellValue(b, sortKey);
      if (av === bv) return 0;
      const cmp = String(av) < String(bv) ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  /* ── Pagination ────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  function handleSort(col: ColumnDef<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
    setPage(1);
  }

  /* ── Styles ────────────────────────────────────────────── */
  const containerStyle: React.CSSProperties = {
    borderRadius: "var(--gf-radius-xl)",
    border: "1px solid var(--gf-color-border)",
    overflow: "hidden",
    fontFamily: "var(--gf-font-family-sans)",
  };

  const thStyle: React.CSSProperties = {
    background: "var(--gf-color-bg-subtle)",
    fontWeight: "var(--gf-font-weight-semibold)",
    fontSize: "var(--gf-font-size-xs)",
    textTransform: "uppercase" as const,
    letterSpacing: "var(--gf-letter-spacing-widest, 0.1em)",
    color: "var(--gf-color-text-muted)",
    padding: "var(--gf-space-3) var(--gf-space-4)",
    textAlign: "left" as const,
    borderBottom: "1px solid var(--gf-color-border)",
    whiteSpace: "nowrap" as const,
  };

  const tdStyle: React.CSSProperties = {
    padding: "var(--gf-space-3) var(--gf-space-4)",
    borderBottom: "1px solid var(--gf-color-border)",
    fontSize: "var(--gf-font-size-sm)",
    color: "var(--gf-color-text-primary)",
  };

  /* ── Skeleton rows ─────────────────────────────────────── */
  if (loading) {
    return (
      <div style={containerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ ...thStyle, width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={String(col.key)} style={tdStyle}>
                    <div
                      className="animate-pulse"
                      style={{
                        height: "1rem",
                        borderRadius: "var(--gf-radius-md)",
                        background: "var(--gf-color-bg-surface)",
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  /* ── Empty state ───────────────────────────────────────── */
  if (!loading && data.length === 0) {
    return (
      <div style={containerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ ...thStyle, width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div
          style={{
            padding: "var(--gf-space-12) var(--gf-space-4)",
            textAlign: "center",
            color: "var(--gf-color-text-muted)",
            fontSize: "var(--gf-font-size-sm)",
          }}
        >
          {emptyState ?? "No data found"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={containerStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{
                    ...thStyle,
                    width: col.width,
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: col.sortable ? "none" : undefined,
                  }}
                  onClick={() => handleSort(col)}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    {col.header}
                    {col.sortable && (
                      <span style={{ opacity: sortKey === col.key ? 1 : 0.35 }}>
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? " ↑"
                            : " ↓"
                          : " ↕"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "var(--gf-color-bg-subtle)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                }}
              >
                {columns.map((col) => {
                  const raw = getCellValue(row, col.key);
                  return (
                    <td
                      key={String(col.key)}
                      style={{
                        ...tdStyle,
                        // Remove bottom border on last row
                        borderBottom:
                          rowIdx === pageRows.length - 1
                            ? "none"
                            : "1px solid var(--gf-color-border)",
                      }}
                    >
                      {col.render ? col.render(raw, row) : String(raw ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination controls ─────────────────────────────── */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--gf-space-3) var(--gf-space-1)",
            fontSize: "var(--gf-font-size-sm)",
            color: "var(--gf-color-text-muted)",
            flexWrap: "wrap",
            gap: "var(--gf-space-2)",
          }}
        >
          <span>
            Showing {startIdx + 1}–{Math.min(startIdx + pageSize, sorted.length)} of{" "}
            {sorted.length} rows
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--gf-space-2)" }}>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                padding: "var(--gf-space-1) var(--gf-space-3)",
                border: "1px solid var(--gf-color-border)",
                borderRadius: "var(--gf-radius-md)",
                background: "var(--gf-color-bg)",
                color: "var(--gf-color-text-secondary)",
                cursor: safePage <= 1 ? "not-allowed" : "pointer",
                opacity: safePage <= 1 ? 0.4 : 1,
                fontSize: "var(--gf-font-size-sm)",
              }}
            >
              Prev
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: "var(--gf-space-1) var(--gf-space-3)",
                border: "1px solid var(--gf-color-border)",
                borderRadius: "var(--gf-radius-md)",
                background: "var(--gf-color-bg)",
                color: "var(--gf-color-text-secondary)",
                cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                opacity: safePage >= totalPages ? 0.4 : 1,
                fontSize: "var(--gf-font-size-sm)",
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
