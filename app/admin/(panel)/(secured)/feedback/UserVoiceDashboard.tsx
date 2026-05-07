"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

type Row = {
  id: string;
  createdAt: number;
  kind: "pulse" | "module_milestone";
  category: string;
  moduleNumber: number | null;
  sentimentScore: number;
  userComment: string;
  deviceType: string;
  screenResolution: string;
  viewportSize: string;
  url: string;
  resolved: boolean;
  starred: boolean;
};

type Summary = {
  total: number;
  unresolved: number;
  starred: number;
  layoutIssueCount: number;
  layoutIssuesByDevice: Array<{ deviceType: string; count: number }>;
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "layout_issue", label: "Layout Issue" },
  { value: "translation_error", label: "Translation Error" },
  { value: "pronunciation_help", label: "Pronunciation Help" },
  { value: "idea", label: "Idea" },
  { value: "translation_quality", label: "Translation Quality" },
  { value: "pronunciation_clarity", label: "Pronunciation Clarity" },
  { value: "confusing_content", label: "Confusing Content" },
];

function categoryLabel(input: string): string {
  return CATEGORY_OPTIONS.find((entry) => entry.value === input)?.label ?? input;
}

export default function UserVoiceDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [resolvedFilter, setResolvedFilter] = useState("all");

  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (search.trim()) q.set("q", search.trim());
    if (moduleFilter !== "all") q.set("module", moduleFilter);
    if (categoryFilter !== "all") q.set("category", categoryFilter);
    if (resolvedFilter === "resolved") q.set("resolved", "true");
    if (resolvedFilter === "open") q.set("resolved", "false");
    return q;
  }, [search, moduleFilter, categoryFilter, resolvedFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/beta-feedback?${params.toString()}`);
      const data = (await res.json()) as { rows: Row[]; summary: Summary };
      if (!res.ok) throw new Error("Failed to load");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary ?? null);
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [params]);

  async function toggle(id: string, patch: { resolved?: boolean; starred?: boolean }) {
    await fetch("/api/admin/beta-feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    await loadData();
  }

  function exportStarred() {
    const q = new URLSearchParams(params);
    q.set("starred", "true");
    q.set("format", "csv");
    window.open(`/api/admin/beta-feedback?${q.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0, color: "#f8fafc", fontSize: "1.35rem" }}>User Voice</h1>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>
          Feedback from beta testers across all pages and modules.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <StatCard label="Total Entries" value={summary?.total ?? 0} />
        <StatCard label="Open Issues" value={summary?.unresolved ?? 0} />
        <StatCard label="Layout Bugs" value={summary?.layoutIssueCount ?? 0} />
        <StatCard label="Starred Testimonials" value={summary?.starred ?? 0} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search comments, devices, or URLs"
          style={inputStyle}
        />
        <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} style={inputStyle}>
          <option value="all">All Modules</option>
          {Array.from({ length: 12 }, (_, idx) => idx + 1).map((moduleNum) => (
            <option key={moduleNum} value={String(moduleNum)}>Module {moduleNum}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={inputStyle}>
          {CATEGORY_OPTIONS.map((entry) => (
            <option key={entry.value} value={entry.value}>{entry.label}</option>
          ))}
        </select>
        <select value={resolvedFilter} onChange={(event) => setResolvedFilter(event.target.value)} style={inputStyle}>
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <button type="button" style={buttonStyle} onClick={exportStarred}>Export Starred CSV</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={panelStyle}>
          <h2 style={panelTitle}>Feedback Table</h2>
          {loading ? (
            <p style={mutedText}>Loading...</p>
          ) : rows.length === 0 ? (
            <p style={mutedText}>No feedback entries match the current filters.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th>Module</Th>
                    <Th>Category</Th>
                    <Th>Comment</Th>
                    <Th>Device</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid rgba(148,163,184,0.18)" }}>
                      <Td>{new Date(row.createdAt).toLocaleString()}</Td>
                      <Td>{row.kind === "module_milestone" ? "Milestone" : "Pulse"}</Td>
                      <Td>{row.moduleNumber ? `M${row.moduleNumber}` : "-"}</Td>
                      <Td>{categoryLabel(row.category)}</Td>
                      <Td>
                        <div style={{ maxWidth: 310 }}>
                          <div style={{ color: "#f8fafc" }}>{row.userComment}</div>
                          <div style={mutedMini}>{row.url}</div>
                          <div style={mutedMini}>Sentiment: {row.sentimentScore}/5</div>
                        </div>
                      </Td>
                      <Td>
                        <div>{row.deviceType}</div>
                        <div style={mutedMini}>{row.screenResolution} | {row.viewportSize}</div>
                      </Td>
                      <Td>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <input
                            type="checkbox"
                            checked={row.resolved}
                            onChange={(event) => void toggle(row.id, { resolved: event.target.checked })}
                          />
                          Resolved
                        </label>
                        <button
                          type="button"
                          style={{ ...buttonStyle, padding: "0.32rem 0.55rem", fontSize: "0.75rem" }}
                          onClick={() => void toggle(row.id, { starred: !row.starred })}
                        >
                          {row.starred ? "Unstar" : "Star"}
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={panelStyle}>
          <h2 style={panelTitle}>Bug Tracker by Device</h2>
          {!summary?.layoutIssuesByDevice?.length ? (
            <p style={mutedText}>No layout bugs reported yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, color: "#e2e8f0" }}>
              {summary.layoutIssuesByDevice.map((entry) => (
                <li key={entry.deviceType} style={{ marginBottom: 6 }}>
                  {entry.deviceType}: {entry.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={panelStyle}>
      <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.75rem" }}>{label}</p>
      <p style={{ margin: "0.3rem 0 0", color: "#f8fafc", fontSize: "1.2rem", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th style={{ textAlign: "left", color: "#9ca3af", padding: "0.45rem", fontWeight: 600 }}>{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ verticalAlign: "top", color: "#e2e8f0", padding: "0.45rem" }}>{children}</td>;
}

const panelStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  padding: 12,
  background: "rgba(2,6,23,0.72)",
};

const panelTitle: CSSProperties = {
  margin: "0 0 10px",
  color: "#f8fafc",
  fontSize: "0.95rem",
};

const inputStyle: CSSProperties = {
  minWidth: 180,
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "rgba(15,23,42,0.8)",
  color: "#e2e8f0",
  padding: "0.5rem 0.65rem",
  fontSize: "0.82rem",
};

const buttonStyle: CSSProperties = {
  borderRadius: 8,
  border: "1px solid rgba(16,185,129,0.5)",
  background: "rgba(16,185,129,0.15)",
  color: "#d1fae5",
  padding: "0.45rem 0.65rem",
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
};

const mutedText: CSSProperties = {
  margin: 0,
  color: "#9ca3af",
  fontSize: "0.84rem",
};

const mutedMini: CSSProperties = {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: "0.7rem",
};
