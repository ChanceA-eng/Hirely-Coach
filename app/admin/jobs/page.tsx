"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

type ParsedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
  category: string;
  alignmentReason: string;
  scaryQuestions: string[];
};

const TAG_MAP: Record<string, string[]> = {
  product: ["Product Management", "Roadmap", "Stakeholders"],
  engineer: ["Engineering", "System Design", "Code Review"],
  developer: ["Engineering", "Software Development"],
  data: ["Data Analysis", "SQL", "Python"],
  analyst: ["Analysis", "Reporting", "Data"],
  manager: ["Leadership", "Team Management", "Strategy"],
  director: ["Leadership", "Executive Strategy"],
  design: ["UX", "Figma", "User Research"],
  security: ["Security", "Risk Assessment", "Compliance"],
  marketing: ["Marketing", "Growth", "Analytics"],
  sales: ["Sales", "CRM", "Pipeline"],
  finance: ["Finance", "Budgeting", "Forecasting"],
};

function autoTagFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const [kw, kTags] of Object.entries(TAG_MAP)) {
    if (lower.includes(kw)) tags.push(...kTags);
  }
  return [...new Set(tags)].slice(0, 6);
}

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("engineer") || t.includes("developer")) return "Engineering";
  if (t.includes("product")) return "Product";
  if (t.includes("data") || t.includes("analyst")) return "Data";
  if (t.includes("design")) return "Design";
  if (t.includes("manager") || t.includes("director")) return "Leadership";
  if (t.includes("security")) return "Security";
  if (t.includes("finance") || t.includes("accounting")) return "Finance";
  return "General";
}

function parseCSV(text: string): ParsedJob[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Simple CSV parser that handles quoted fields
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const get = (cols: string[], key: string, ...aliases: string[]) => {
    const idx = [key, ...aliases].map((k) => headers.indexOf(k)).find((i) => i >= 0) ?? -1;
    return idx >= 0 ? (cols[idx] ?? "") : "";
  };

  return lines
    .slice(1)
    .map((line, i) => {
      const cols = parseLine(line);
      const title = get(cols, "title", "job_title", "position", "role");
      const company = get(cols, "company", "employer", "organization");
      const location = get(cols, "location", "city", "place");
      const desc = get(cols, "description", "desc", "job_description", "summary");
      const salaryRaw = get(cols, "salary", "compensation", "pay");
      const salNum = parseInt(salaryRaw.replace(/[^0-9]/g, ""), 10) || 0;
      const tags = autoTagFromText(desc + " " + title);
      return {
        id: `csv-${Date.now()}-${i}`,
        title,
        company,
        location,
        salaryMin: salNum,
        salaryMax: salNum ? Math.round(salNum * 1.2) : 0,
        description: desc,
        tags,
        category: inferCategory(title),
        alignmentReason: `Strong fit for candidates with ${tags.slice(0, 2).join(" and ")} experience.`,
        scaryQuestions: [
          `Tell me about a time you led a high-stakes project at ${company || "a fast-paced company"}.`,
          `How do you handle ambiguity in a ${title || "senior"} role?`,
        ],
      };
    })
    .filter((j) => j.title && j.company);
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<ParsedJob[]>([]);
  const [pageStatus, setPageStatus] = useState<"idle" | "preview" | "saving" | "done" | "error">("idle");
  const [result, setResult] = useState<{ added: number; total: number } | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setJobs(parsed);
      if (parsed.length) {
        setPageStatus("preview");
      } else {
        setErrMsg("No valid jobs found. Ensure your CSV has Title, Company, Location columns.");
        setPageStatus("error");
      }
    };
    reader.readAsText(file);
  }

  async function handleSeed() {
    setPageStatus("saving");
    try {
      const res = await fetch("/api/admin/seed-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = (await res.json()) as { added: number; total: number };
      setResult(data);
      setPageStatus("done");
    } catch {
      setErrMsg("Failed to seed database. Check server logs.");
      setPageStatus("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#f8fafc", padding: "40px 24px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Back link */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/growthhub" style={{ color: "#10b981", fontSize: "0.84rem", textDecoration: "none", letterSpacing: "0.02em" }}>
            ← GrowthHub
          </Link>
        </div>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16,
            padding: "36px 40px",
            marginBottom: 20,
          }}
        >
          <p style={{ color: "#10b981", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 8px" }}>
            Admin · Job Database
          </p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 8px", color: "#f8fafc" }}>
            CSV Job Seeder
          </h1>
          <p style={{ color: "#6b7280", margin: "0 0 32px", fontSize: "0.88rem", lineHeight: 1.6 }}>
            Upload a CSV file to bulk-add jobs to the Targeting Array database. Required columns:{" "}
            <code style={{ color: "#a7f3d0", background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: 4 }}>Title</code>,{" "}
            <code style={{ color: "#a7f3d0", background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: 4 }}>Company</code>,{" "}
            <code style={{ color: "#a7f3d0", background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: 4 }}>Location</code>,{" "}
            <code style={{ color: "#a7f3d0", background: "rgba(16,185,129,0.08)", padding: "1px 6px", borderRadius: 4 }}>Description</code>.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "52px 24px",
              textAlign: "center",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
              background: "rgba(255,255,255,0.01)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.35)";
              e.currentTarget.style.background = "rgba(16,185,129,0.03)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.background = "rgba(255,255,255,0.01)";
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ margin: "0 auto 12px", display: "block", stroke: "#6b7280" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#e2e8f0" }}>Click to select CSV file</p>
            <p style={{ margin: 0, color: "#4b5563", fontSize: "0.82rem" }}>
              .csv · Any size · Auto-tagged on import
            </p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: "none" }} />
          </div>
        </motion.div>

        {/* Preview */}
        {pageStatus === "preview" && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "32px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 16 }}>
              <div>
                <p style={{ color: "#10b981", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 4px" }}>
                  Preview
                </p>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: "1.25rem" }}>
                  {jobs.length} Jobs Ready to Seed
                </h2>
              </div>
              <button
                onClick={handleSeed}
                style={{
                  background: "#064e3b",
                  color: "#fff",
                  border: "1px solid rgba(16,185,129,0.4)",
                  borderRadius: 10,
                  padding: "10px 22px",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  transition: "filter 0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
                onMouseOut={(e) => (e.currentTarget.style.filter = "")}
              >
                Seed Database →
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto" }}>
              {jobs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.title}
                    </p>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.78rem" }}>
                      {job.company} · {job.location}
                      {job.salaryMin > 0 && ` · $${(job.salaryMin / 1000).toFixed(0)}k`}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
                    {job.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        style={{
                          background: "rgba(16,185,129,0.08)",
                          border: "1px solid rgba(16,185,129,0.18)",
                          color: "#10b981",
                          borderRadius: 6,
                          padding: "2px 7px",
                          fontSize: "0.7rem",
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Saving */}
        {pageStatus === "saving" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "48px 24px" }}
          >
            <div style={{
              width: 36, height: 36,
              border: "3px solid rgba(255,255,255,0.08)",
              borderTopColor: "#10b981",
              borderRadius: "50%",
              animation: "admin-spin 0.75s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ color: "#6b7280", margin: 0 }}>Seeding database…</p>
          </motion.div>
        )}

        {/* Done */}
        {pageStatus === "done" && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 16,
              padding: "36px",
              textAlign: "center",
            }}
          >
            <div style={{ width: 48, height: 48, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", fontWeight: 700 }}>Database Updated</h2>
            <p style={{ color: "#6b7280", margin: "0 0 24px", fontSize: "0.9rem" }}>
              <strong style={{ color: "#10b981" }}>{result.added}</strong> jobs added ·{" "}
              <strong style={{ color: "#e2e8f0" }}>{result.total}</strong> total in database
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => { setPageStatus("idle"); setJobs([]); setResult(null); if (fileRef.current) fileRef.current.value = ""; }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#e2e8f0",
                  borderRadius: 8,
                  padding: "10px 20px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Upload Another
              </button>
              <Link
                href="/growthhub/targeting"
                style={{
                  background: "#064e3b",
                  border: "1px solid rgba(16,185,129,0.4)",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "10px 20px",
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                }}
              >
                View Targeting Array →
              </Link>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {pageStatus === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: "rgba(239,68,68,0.04)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12,
              padding: "18px 22px",
              color: "#fca5a5",
              fontSize: "0.88rem",
            }}
          >
            {errMsg || "An unexpected error occurred."}
          </motion.div>
        )}
      </div>

      <style>{`@keyframes admin-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
