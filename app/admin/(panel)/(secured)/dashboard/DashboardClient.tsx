"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import mammoth from "mammoth";
import CoachTooltip from "@/app/components/CoachTooltip";
import JobsClient from "@/app/admin/jobs/JobsClient";

/* ─── Types ──────────────────────────────────────────────────────────── */

type AdminUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: number;
  publicMetadata: Record<string, string | number | undefined>;
};

type DbStats = { total: number } | null;
type Tab = "overview" | "users" | "refinery";
type PdfTextContent = { items: Array<{ str?: string }> };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (index: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};
type PdfJsWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib; pdfjs?: PdfJsLib };

/* ─── Static data ────────────────────────────────────────────────────── */

const MODULE_USAGE = [
  { name: "Mock Interview Simulator", pct: 42, color: "#0d9488" },
  { name: "STARR Accelerator", pct: 28, color: "#7c3aed" },
  { name: "Job Targeting", pct: 18, color: "#0ea5e9" },
  { name: "Growth Hub", pct: 8, color: "#f59e0b" },
  { name: "Voice Coach", pct: 4, color: "#10b981" },
];

const ACCEL_LEVELS = ["", "Beginner", "Intermediate", "Advanced", "Expert"];

/* ─── Helpers ────────────────────────────────────────────────────────── */

function buildGrowthData(users: AdminUser[]) {
  const today = new Date();
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = users.filter(
      (u) => new Date(u.createdAt).toISOString().slice(0, 10) === dateStr,
    ).length;
    return { date: dateStr, count };
  });
}

function displayName(u: AdminUser) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || "—";
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function GrowthChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const W = 560;
  const H = 90;
  const gap = 3;
  const barW = (W - gap * (data.length - 1)) / data.length;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H + 20}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * H, 2);
        const x = i * (barW + gap);
        const opacity = 0.45 + (d.count / max) * 0.55;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={H - h}
              width={barW}
              height={h}
              rx={2}
              fill="#0d9488"
              opacity={opacity}
            />
            {i % 7 === 0 && (
              <text
                x={x + barW / 2}
                y={H + 14}
                fontSize={7}
                textAnchor="middle"
                fill="#9ca3af"
              >
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dbStats, setDbStats] = useState<DbStats>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Users tab state
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editKj, setEditKj] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editResumeText, setEditResumeText] = useState("");
  const [leadershipWeight, setLeadershipWeight] = useState(50);
  const [technicalWeight, setTechnicalWeight] = useState(50);
  const [founderNote, setFounderNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const resumeFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/seed-jobs/stats").then((r) => r.json()),
    ])
      .then(([usersData, statsData]) => {
        if (Array.isArray(usersData)) setUsers(usersData);
        if (typeof statsData?.total === "number")
          setDbStats({ total: statsData.total });
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, []);

  function openEdit(u: AdminUser) {
    setEditUser(u);
    setEditKj(String(u.publicMetadata?.kj ?? ""));
    setEditLevel(String(u.publicMetadata?.acceleratorLevel ?? ""));
    setEditResumeText(String(u.publicMetadata?.resumeText ?? ""));
    setLeadershipWeight(Number(u.publicMetadata?.leadershipWeight ?? 50));
    setTechnicalWeight(Number(u.publicMetadata?.technicalWeight ?? 50));
    setFounderNote(String(u.publicMetadata?.founderNote ?? ""));
    setSaveMsg("");
  }

  const readTextFile = async (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const readPDFFile = async (file: File) => {
    const pdfWindow = window as PdfJsWindow;

    if (!pdfWindow.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
      pdfWindow.pdfjsLib = pdfWindow.pdfjsLib || pdfWindow.pdfjs;
      if (!pdfWindow.pdfjsLib) {
        throw new Error("pdfjs failed to load");
      }
      pdfWindow.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdfjsLib = pdfWindow.pdfjsLib;
    if (!pdfjsLib) {
      throw new Error("pdfjs unavailable");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item) => item.str || "").join(" ") + "\n";
    }
    return text;
  };

  async function handleResumeUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let text = "";
      if (file.type === "text/plain") {
        text = await readTextFile(file);
      } else if (file.type === "application/pdf") {
        text = await readPDFFile(file);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        setSaveMsg("Unsupported file type. Use PDF, DOCX, or TXT.");
        return;
      }
      setEditResumeText(text.trim());
      setSaveMsg(`Loaded ${file.name}. Save changes to publish it.`);
    } catch {
      setSaveMsg("Could not read that resume file.");
    }
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editUser.id,
          kj: editKj,
          acceleratorLevel: editLevel,
          resumeText: editResumeText,
          leadershipWeight,
          technicalWeight,
          founderNote,
        }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                publicMetadata: {
                  ...u.publicMetadata,
                  kj: editKj,
                  acceleratorLevel: editLevel,
                  resumeText: editResumeText,
                  leadershipWeight,
                  technicalWeight,
                  founderNote,
                },
              }
            : u,
        ),
      );
      setSaveMsg("Saved successfully.");
    } catch {
      setSaveMsg("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      displayName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.publicMetadata?.kj ?? "").toLowerCase().includes(q)
    );
  });

  const growthData = buildGrowthData(users);
  const signupsThisMonth = growthData.reduce((s, d) => s + d.count, 0);

  return (
    <div style={S.page}>
      {/* ── Top Header ── */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={S.logoBadge}>HC</div>
          <div>
            <p style={S.logoEyebrow}>ADMIN CONSOLE</p>
            <h1 style={S.logoTitle}>Command Center</h1>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={S.vaultBadge}>🔒 Vault Unlocked</span>
          <Link href="/" style={S.exitLink}>
            ← Exit to App
          </Link>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={S.tabBar}>
        {(
          [
            { id: "overview", label: "📊  Overview" },
            { id: "users", label: "👥  Users" },
            { id: "refinery", label: "⚙️  Job Refinery" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...S.tabBtn,
              ...(tab === t.id ? S.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={S.content}>
        <AnimatePresence mode="wait">
          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              {/* Stats row */}
              <div style={S.statsGrid}>
                <div style={S.statCard}>
                  <p style={S.statNum}>
                    {loadingUsers ? "—" : users.length}
                  </p>
                  <p style={S.statLabel}>Total Users</p>
                </div>
                <div style={S.statCard}>
                  <p style={S.statNum}>
                    {dbStats === null ? "—" : dbStats.total}
                  </p>
                  <p style={S.statLabel}>Jobs in DB</p>
                </div>
                <div style={S.statCard}>
                  <p style={S.statNum}>
                    {loadingUsers ? "—" : signupsThisMonth}
                  </p>
                  <p style={S.statLabel}>New Sign-ups (30d)</p>
                </div>
              </div>

              {/* User Growth */}
              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>User Growth</h2>
                  <span style={S.sectionSub}>Last 30 days</span>
                </div>
                {loadingUsers ? (
                  <div style={S.skeleton} />
                ) : (
                  <>
                    <p
                      style={{
                        color: "#6b7280",
                        fontSize: "0.78rem",
                        margin: "0 0 10px",
                      }}
                    >
                      {signupsThisMonth} new sign-up
                      {signupsThisMonth !== 1 ? "s" : ""} in the last 30 days
                    </p>
                    <GrowthChart data={growthData} />
                  </>
                )}
              </div>

              {/* Module Usage */}
              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>Module Usage</h2>
                  <span style={S.sectionSub}>5 Pillars breakdown (estimated)</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {MODULE_USAGE.map((m) => (
                    <div key={m.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 5,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.83rem",
                            color: "#e2e8f0",
                            fontWeight: 500,
                          }}
                        >
                          {m.name}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          {m.pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 7,
                          background: "rgba(255,255,255,0.08)",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${m.pct}%` }}
                          transition={{
                            duration: 0.9,
                            ease: "easeOut",
                            delay: 0.1,
                          }}
                          style={{
                            height: "100%",
                            background: m.color,
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Churn Insights */}
              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>Churn Insights</h2>
                  <span style={S.sectionSub}>Deletion survey responses</span>
                </div>
                <div style={S.emptyState}>
                  <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: 0 }}>
                    No deletion survey data recorded yet. Responses will appear
                    here once users complete the exit survey.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ USERS ═════════════════════════════════════════════════════ */}
          {tab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "#f8fafc",
                    }}
                  >
                    User Management
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#94a3b8",
                      fontSize: "0.8rem",
                    }}
                  >
                    {loadingUsers ? "Loading…" : `${users.length} users registered`}
                  </p>
                </div>
                <input
                  type="search"
                  placeholder="Search name, email, or Kj…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={S.searchInput}
                />
              </div>

              {loadingUsers ? (
                <div style={{ ...S.skeleton, height: 200 }} />
              ) : (
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {[
                          "Name",
                          "Email",
                          "Known Job (Kj)",
                          "Accelerator Level",
                          "Joined",
                          "",
                        ].map((h) => (
                          <th key={h} style={S.th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              ...S.td,
                              textAlign: "center",
                              color: "#94a3b8",
                              padding: "32px",
                            }}
                          >
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr
                            key={u.id}
                            style={S.trRow}
                            onClick={() => openEdit(u)}
                          >
                            <td style={S.td}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: "#f8fafc",
                                  fontSize: "0.87rem",
                                }}
                              >
                                {displayName(u)}
                              </span>
                            </td>
                            <td style={{ ...S.td, color: "#94a3b8" }}>
                              {u.email}
                            </td>
                            <td style={S.td}>
                              {u.publicMetadata?.kj ? (
                                <span style={S.kjBadge}>
                                  {String(u.publicMetadata.kj)}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.78rem",
                                  }}
                                >
                                  Not set
                                </span>
                              )}
                            </td>
                            <td style={S.td}>
                              {u.publicMetadata?.acceleratorLevel ? (
                                <span style={S.levelBadge}>
                                  {String(u.publicMetadata.acceleratorLevel)}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.78rem",
                                  }}
                                >
                                  Not set
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                ...S.td,
                                color: "#94a3b8",
                                fontSize: "0.76rem",
                              }}
                            >
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td style={S.td}>
                              <button
                                style={S.editBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(u);
                                }}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ JOB REFINERY ══════════════════════════════════════════════ */}
          {tab === "refinery" && (
            <motion.div
              key="refinery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 4,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "#f8fafc",
                  }}
                >
                  Job Refinery
                </h2>
                <CoachTooltip
                  message="Ensure your CSV columns match 'Title', 'Company', 'Location', and 'Description' headers before uploading. LinkedIn and Indeed CSV exports work best. Max ~2,000 rows per upload recommended."
                  context="general"
                  triggerSymbol="!"
                  placement="right"
                />
              </div>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "0.82rem",
                  margin: "0 0 24px",
                }}
              >
                Upload LinkedIn/Indeed CSVs to populate the Targeting Array
                database.
              </p>
              <JobsClient />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Edit User Drawer ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {editUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditUser(null)}
              style={S.overlay}
            />
            {/* Drawer panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 36 }}
              style={S.drawer}
            >
              <div style={S.drawerHead}>
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "0.98rem",
                    color: "#f8fafc",
                  }}
                >
                  Edit User
                </h3>
                <button
                  onClick={() => setEditUser(null)}
                  style={S.closeBtn}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto" }}>
                <p
                  style={{
                    fontWeight: 600,
                    color: "#f8fafc",
                    margin: "0 0 2px",
                    fontSize: "0.95rem",
                  }}
                >
                  {displayName(editUser)}
                </p>
                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.8rem",
                    margin: "0 0 24px",
                  }}
                >
                  {editUser.email}
                </p>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  {/* Kj field */}
                  <div>
                    <label style={S.drawerLabel}>
                      Known Job (Kj)
                      <CoachTooltip
                        message="The user's target job title used for personalised job matching and coaching context throughout the app."
                        context="general"
                        triggerSymbol="?"
                        placement="right"
                      />
                    </label>
                    <input
                      type="text"
                      value={editKj}
                      onChange={(e) => setEditKj(e.target.value)}
                      placeholder="e.g. Product Manager"
                      style={S.drawerInput}
                    />
                  </div>

                  {/* Accelerator Level */}
                  <div>
                    <label style={S.drawerLabel}>
                      Accelerator Level
                      <CoachTooltip
                        message="Controls which Hirely Coach challenges and modules the user is enrolled in. Changing this immediately updates their in-app experience."
                        context="general"
                        triggerSymbol="?"
                        placement="right"
                      />
                    </label>
                    <select
                      value={editLevel}
                      onChange={(e) => setEditLevel(e.target.value)}
                      style={S.drawerInput}
                    >
                      {ACCEL_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l || "— Not set —"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={S.drawerLabel}>
                      Resume Upload / Override
                      <CoachTooltip
                        message="Upload the user's current resume or paste an override. This powers stronger admin review and more accurate coaching context."
                        context="general"
                        triggerSymbol="?"
                        placement="right"
                      />
                    </label>
                    <input
                      ref={resumeFileRef}
                      type="file"
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={handleResumeUpload}
                      style={{ display: "none" }}
                    />
                    <div style={S.resumeUploadBox}>
                      <button type="button" onClick={() => resumeFileRef.current?.click()} style={S.secondaryBtn}>
                        Upload Resume File
                      </button>
                      <button type="button" onClick={() => setEditResumeText("")} style={S.ghostDangerBtn}>
                        Clear Resume
                      </button>
                    </div>
                    <textarea
                      value={editResumeText}
                      onChange={(e) => setEditResumeText(e.target.value)}
                      placeholder="Paste or upload resume text here"
                      style={S.drawerTextarea}
                    />
                  </div>

                  <div>
                    <label style={S.drawerLabel}>Attribute Weighting</label>
                    <div style={S.sliderBlock}>
                      <div>
                        <div style={S.sliderLabelRow}>
                          <span>Leadership signal</span>
                          <strong>{leadershipWeight}%</strong>
                        </div>
                        <input type="range" min={0} max={100} value={leadershipWeight} onChange={(e) => setLeadershipWeight(Number(e.target.value))} style={S.slider} />
                      </div>
                      <div>
                        <div style={S.sliderLabelRow}>
                          <span>Technical depth</span>
                          <strong>{technicalWeight}%</strong>
                        </div>
                        <input type="range" min={0} max={100} value={technicalWeight} onChange={(e) => setTechnicalWeight(Number(e.target.value))} style={S.slider} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={S.drawerLabel}>Founder Note</label>
                    <textarea
                      value={founderNote}
                      onChange={(e) => setFounderNote(e.target.value)}
                      placeholder="Add a private operator note for this user's coaching profile"
                      style={S.drawerTextarea}
                    />
                  </div>
                </div>

                {saveMsg && (
                  <p
                    style={{
                      marginTop: 16,
                      fontSize: "0.8rem",
                      color: saveMsg.includes("failed") ? "#dc2626" : "#15803d",
                      background: saveMsg.includes("failed")
                        ? "#fef2f2"
                        : "#f0fdf4",
                      border: `1px solid ${saveMsg.includes("failed") ? "#fecaca" : "#bbf7d0"}`,
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    {saveMsg}
                  </p>
                )}
              </div>

              <div style={S.drawerFooter}>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{
                    ...S.primaryBtn,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditUser(null)}
                  style={S.secondaryBtn}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes adm-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .adm-tr:hover { background: #f9fafb !important; }
      `}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 12% 0%, rgba(16,185,129,0.16), transparent 60%), radial-gradient(900px 500px at 100% 20%, rgba(14,165,233,0.12), transparent 55%), #020617",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  /* Header */
  header: {
    background: "rgba(15, 23, 42, 0.72)",
    borderBottom: "1px solid rgba(148,163,184,0.24)",
    backdropFilter: "blur(10px)",
    padding: "14px 32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  logoBadge: {
    width: 40,
    height: 40,
    background: "#111827",
    color: "#fff",
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "0.88rem",
    letterSpacing: "0.06em",
    flexShrink: 0,
  },
  logoEyebrow: {
    margin: 0,
    fontSize: "0.62rem",
    color: "#9ca3af",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  },
  logoTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  vaultBadge: {
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: "0.7rem",
    fontWeight: 600,
  },
  exitLink: {
    color: "#cbd5e1",
    fontSize: "0.82rem",
    textDecoration: "none",
    fontWeight: 500,
  },

  /* Tabs */
  tabBar: {
    background: "rgba(15, 23, 42, 0.68)",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
    padding: "0 32px",
    display: "flex",
    gap: 0,
  },
  tabBtn: {
    background: "transparent",
    border: "none",
    borderBottom: "2.5px solid transparent",
    padding: "13px 20px",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#94a3b8",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
    letterSpacing: "0.01em",
  },
  tabActive: {
    color: "#e2e8f0",
    borderBottomColor: "#10b981",
    fontWeight: 700,
  },

  /* Content area */
  content: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "32px 24px 80px",
  },

  /* Stats */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: "rgba(15, 23, 42, 0.62)",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    padding: "22px 24px",
    textAlign: "center",
    boxShadow: "0 1px 10px rgba(0,0,0,0.24)",
  },
  statNum: {
    margin: "0 0 4px",
    fontSize: "2.4rem",
    fontWeight: 800,
    color: "#f8fafc",
    lineHeight: 1,
  },
  statLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "0.76rem",
    fontWeight: 500,
    letterSpacing: "0.04em",
  },

  /* Section card */
  section: {
    background: "rgba(15, 23, 42, 0.62)",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    padding: "24px",
    marginBottom: 16,
    boxShadow: "0 1px 10px rgba(0,0,0,0.22)",
  },
  sectionHead: {
    display: "flex",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: "0.95rem",
    color: "#e2e8f0",
  },
  sectionSub: { color: "#94a3b8", fontSize: "0.76rem" },

  /* Skeleton */
  skeleton: {
    height: 80,
    borderRadius: 8,
    background:
      "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
    backgroundSize: "200% 100%",
    animation: "adm-shimmer 1.6s ease-in-out infinite",
  },

  /* Empty state */
  emptyState: {
    background: "rgba(2, 6, 23, 0.5)",
    border: "1px dashed rgba(148,163,184,0.24)",
    borderRadius: 10,
    padding: "28px 20px",
    textAlign: "center",
  },

  /* User table */
  searchInput: {
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.28)",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: "0.84rem",
    color: "#e2e8f0",
    width: 280,
    outline: "none",
    fontFamily: "inherit",
  },
  tableWrap: {
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 1px 10px rgba(0,0,0,0.24)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.84rem",
  },
  th: {
    background: "rgba(2, 6, 23, 0.64)",
    padding: "10px 14px",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#94a3b8",
    letterSpacing: "0.09em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(148,163,184,0.24)",
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(148,163,184,0.12)",
    verticalAlign: "middle",
  },
  trRow: {
    cursor: "pointer",
    transition: "background 0.1s",
  },
  kjBadge: {
    background: "rgba(59, 130, 246, 0.12)",
    color: "#93c5fd",
    border: "1px solid rgba(59, 130, 246, 0.28)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: "0.74rem",
    fontWeight: 600,
  },
  levelBadge: {
    background: "rgba(16, 185, 129, 0.12)",
    color: "#6ee7b7",
    border: "1px solid rgba(16, 185, 129, 0.28)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: "0.74rem",
    fontWeight: 600,
  },
  editBtn: {
    background: "transparent",
    border: "1px solid rgba(148,163,184,0.28)",
    color: "#e2e8f0",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: "0.76rem",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  /* Drawer */
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.72)",
    zIndex: 40,
  },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: 390,
    background: "#020617",
    boxShadow: "-6px 0 28px rgba(0,0,0,0.28)",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
  },
  drawerHead: {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(148,163,184,0.2)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    fontSize: "1.1rem",
    lineHeight: 1,
    padding: 4,
  },
  drawerLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: 7,
  },
  drawerInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 8,
    fontSize: "0.88rem",
    color: "#f8fafc",
    background: "rgba(15,23,42,0.8)",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  drawerTextarea: {
    width: "100%",
    minHeight: 132,
    padding: "12px 14px",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 10,
    fontSize: "0.84rem",
    color: "#f8fafc",
    background: "rgba(15,23,42,0.8)",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
  },
  resumeUploadBox: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  sliderBlock: {
    display: "grid",
    gap: 14,
    padding: "14px",
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: 10,
    background: "rgba(15,23,42,0.56)",
  },
  sliderLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    color: "#cbd5e1",
    fontSize: "0.82rem",
    marginBottom: 6,
  },
  slider: {
    width: "100%",
    accentColor: "#10b981",
  },
  drawerFooter: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(148,163,184,0.2)",
    display: "flex",
    gap: 10,
    flexShrink: 0,
  },

  /* Buttons */
  primaryBtn: {
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid rgba(148,163,184,0.28)",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  ghostDangerBtn: {
    background: "transparent",
    border: "1px solid rgba(248, 113, 113, 0.32)",
    color: "#fca5a5",
    borderRadius: 8,
    padding: "10px 18px",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
};
