"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import mammoth from "mammoth";
import CoachTooltip from "@/app/components/CoachTooltip";
import JobsClient from "@/app/admin/jobs/JobsClient";
import FoundationAdminTab from "./FoundationAdminTab";

/* ─── Types ──────────────────────────────────────────────────────────── */

type AdminUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  createdAt: number;
  publicMetadata: Record<string, unknown>;
};

type DbStats = { total: number } | null;
type Tab = "overview" | "users" | "refinery" | "advanced" | "foundation";
type StarrLabTierConfig = {
  tier: number;
  title: string;
  scenarioTitle: string;
  persona: string;
  questionCount: number;
  systemPrompt: string;
  focusSkill: string;
  temperature: number;
  presencePenalty: number;
  silenceAnchorMs: number;
  interruptThresholdSeconds: number;
  multiPartSegments: number;
};
type AcademyLessonConfig = {
  tier: number;
  title: string;
  description: string;
  videoId: string;
  logicCheck: string;
  ipReward: number;
  tierUnlockIpCost: number;
  prerequisiteTier: number | null;
};
type CanvasRegistryConfig = {
  templates: string[];
  assetLibrary: string[];
  approvedPalettes: string[];
  approvedFontPairings: string[];
  minFontSizePt: number;
  minMarginInches: number;
};
type ImpactLedgerVerbWeight = {
  verb: string;
  weight: number;
};
type HcConfig = {
  systemPrompt: string;
  temperature: number;
  model: string;
  modelOptions: string[];
  resumeCacheVersion: number;
  starrLab: {
    tiers: Record<string, StarrLabTierConfig>;
  };
  academy: {
    lessons: AcademyLessonConfig[];
  };
  canvas: CanvasRegistryConfig;
  impactLedger: {
    powerVerbs: ImpactLedgerVerbWeight[];
  };
  updatedAt: number;
};
type AuditUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
};
type UserAuditResponse = {
  user: AuditUser;
  impactLedger: Array<{
    id: string;
    createdAt: number;
    action: string;
    proof: string;
    result: string;
  }>;
  resumeAuditState: {
    overallScore?: number;
    updatedAt?: number;
    fileName?: string;
  } | null;
};
type LeaderboardRow = {
  userId: string;
  name: string;
  email: string;
  score: number;
  updatedAt: number;
  fileName: string;
};
type RawAuditLog = {
  id: string;
  createdAt: number;
  userId: string | null;
  email: string | null;
  model: string;
  temperature: number;
  promptPreview: string;
  resumeSnippet: string;
  impactEntries: Array<{
    id: string;
    createdAt: number;
    action: string;
    proof: string;
    result: string;
  }>;
  rawResponse: string;
  normalizedReport: {
    overallScore?: number;
  };
};
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

function toLineInput(value: string[]) {
  return value.join("\n");
}

function fromLineInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function communicationHealth(metadata: Record<string, unknown>): "Imepokelewa" | "Imezuiwa" | "Imeshindikana" {
  const deliveryState = String(metadata.foundationDeliveryStatus ?? metadata.notificationStatus ?? "").toLowerCase();
  if (deliveryState === "failed" || deliveryState === "error") return "Imeshindikana";
  if (deliveryState === "blocked") return "Imezuiwa";

  const hasToken = Boolean(
    metadata.pushToken ||
    metadata.webPushToken ||
    metadata.expoPushToken ||
    metadata.foundationPushToken ||
    metadata.webPushSubscription
  );

  return hasToken ? "Imepokelewa" : "Imezuiwa";
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
  const [masterUnlock, setMasterUnlock] = useState(false);
  const [forcedTier, setForcedTier] = useState<number | "">("");
  const [forcedCourseLevel, setForcedCourseLevel] = useState<number | "">("");
  const [promotionSupportUnlock, setPromotionSupportUnlock] = useState(false);
  const [foundationUnlockedModules, setFoundationUnlockedModules] = useState<number[]>([]);
  const [impactPointsDelta, setImpactPointsDelta] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // Advanced Controls state
  const [hcConfig, setHcConfig] = useState<HcConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<HcConfig | null>(null);
  const [configMsg, setConfigMsg] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [auditUserId, setAuditUserId] = useState("");
  const [auditResult, setAuditResult] = useState<UserAuditResponse | null>(null);
  const [auditMsg, setAuditMsg] = useState("");
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [rawLogs, setRawLogs] = useState<RawAuditLog[]>([]);
  const [loadingRawLogs, setLoadingRawLogs] = useState(false);
  const [selectedRawLogId, setSelectedRawLogId] = useState("");

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

  async function loadHcConfig() {
    try {
      const res = await fetch("/api/admin/hc-config");
      const data = (await res.json()) as HcConfig | { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to load config");
      const config = data as HcConfig;
      setHcConfig(config);
      setConfigDraft(config);
    } catch {
      setConfigMsg("Could not load AI global config.");
    }
  }

  async function loadLeaderboard() {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/admin/leaderboard");
      const data = (await res.json()) as { leaderboard?: LeaderboardRow[] };
      if (!res.ok) throw new Error();
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
    } catch {
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  }

  async function loadRawLogs() {
    setLoadingRawLogs(true);
    try {
      const res = await fetch("/api/admin/raw-audit-logs");
      const data = (await res.json()) as { logs?: RawAuditLog[] };
      if (!res.ok) throw new Error();
      const nextLogs = Array.isArray(data.logs) ? data.logs : [];
      setRawLogs(nextLogs);
      if (nextLogs.length && !selectedRawLogId) {
        setSelectedRawLogId(nextLogs[0].id);
      }
    } catch {
      setRawLogs([]);
    } finally {
      setLoadingRawLogs(false);
    }
  }

  async function saveGlobalConfig(options?: { clearCache?: boolean }) {
    if (!configDraft) return;
    setSavingConfig(true);
    setConfigMsg("");
    try {
      const res = await fetch("/api/admin/hc-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: configDraft,
          clearResumeCache: Boolean(options?.clearCache),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; config?: HcConfig; error?: string };
      if (!res.ok || !data.ok || !data.config) {
        throw new Error(data.error || "Failed to save");
      }

      setHcConfig(data.config);
      setConfigDraft(data.config);
      setConfigMsg(options?.clearCache ? "Saved and cache invalidation issued." : "Global config saved.");
    } catch {
      setConfigMsg("Failed to save global config.");
    } finally {
      setSavingConfig(false);
    }
  }

  async function loadUserAudit() {
    if (!auditUserId.trim()) {
      setAuditMsg("Enter a user ID first.");
      return;
    }

    setLoadingAudit(true);
    setAuditMsg("");
    setAuditResult(null);
    try {
      const res = await fetch(`/api/admin/user-audit/${encodeURIComponent(auditUserId.trim())}`);
      const data = (await res.json()) as UserAuditResponse | { error?: string };
      if (!res.ok) throw new Error((data as { error?: string }).error || "Not found");
      setAuditResult(data as UserAuditResponse);
    } catch {
      setAuditMsg("Could not load that user audit.");
    } finally {
      setLoadingAudit(false);
    }
  }

  function openEdit(u: AdminUser) {
    setEditUser(u);
    setEditKj(String(u.publicMetadata?.kj ?? ""));
    setEditLevel(String(u.publicMetadata?.acceleratorLevel ?? ""));
    setEditResumeText(String(u.publicMetadata?.resumeText ?? ""));
    setLeadershipWeight(Number(u.publicMetadata?.leadershipWeight ?? 50));
    setTechnicalWeight(Number(u.publicMetadata?.technicalWeight ?? 50));
    setFounderNote(String(u.publicMetadata?.founderNote ?? ""));
    const override = (u.publicMetadata?.interviewAdminOverride ?? {}) as {
      masterUnlock?: boolean;
      forcedTier?: number | null;
      forcedCourseLevel?: number | null;
      promotionSupportUnlock?: boolean;
      foundationUnlockedModules?: number[];
    };
    setMasterUnlock(Boolean(override.masterUnlock));
    setForcedTier(typeof override.forcedTier === "number" ? override.forcedTier : "");
    setForcedCourseLevel(typeof override.forcedCourseLevel === "number" ? override.forcedCourseLevel : "");
    setPromotionSupportUnlock(Boolean(override.promotionSupportUnlock));
    setFoundationUnlockedModules(
      Array.isArray(override.foundationUnlockedModules)
        ? override.foundationUnlockedModules.map(Number).filter((m) => Number.isFinite(m) && m >= 1 && m <= 12)
        : []
    );
    setImpactPointsDelta(Number(u.publicMetadata?.adminImpactPointsDelta ?? 0));
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
          masterUnlock,
          forcedTier: forcedTier === "" ? null : forcedTier,
          forcedCourseLevel: forcedCourseLevel === "" ? null : forcedCourseLevel,
          promotionSupportUnlock,
          foundationUnlockedModules,
          impactPointsDelta,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; publicMetadata?: Record<string, unknown> };
      if (!res.ok || !data.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editUser.id
            ? {
                ...u,
                publicMetadata: data.publicMetadata || u.publicMetadata,
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

  async function runUserSnapshotAction(action: "save" | "restore") {
    if (!editUser) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editUser.id,
          snapshotAction: action,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; publicMetadata?: Record<string, unknown> };
      if (!res.ok || !data.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, publicMetadata: data.publicMetadata || u.publicMetadata } : u))
      );
      if (data.publicMetadata) {
        openEdit({ ...editUser, publicMetadata: data.publicMetadata });
      }
      setSaveMsg(action === "save" ? "Snapshot captured." : "Snapshot restored.");
    } catch {
      setSaveMsg(action === "save" ? "Snapshot failed." : "Restore failed.");
    } finally {
      setSaving(false);
    }
  }

  async function resetUserOnboarding() {
    if (!editUser) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: editUser.id,
          resetOnboarding: true,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; publicMetadata?: Record<string, unknown> };
      if (!res.ok || !data.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, publicMetadata: data.publicMetadata || u.publicMetadata } : u))
      );
      if (data.publicMetadata) {
        openEdit({ ...editUser, publicMetadata: data.publicMetadata });
      }
      setSaveMsg("Onboarding reset. The Two Door gate will show again on next login.");
    } catch {
      setSaveMsg("Onboarding reset failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateConfigDraft(updater: (current: HcConfig) => HcConfig) {
    setConfigDraft((current) => (current ? updater(current) : current));
  }

  function updateTierDraft(tier: number, updater: (current: StarrLabTierConfig) => StarrLabTierConfig) {
    updateConfigDraft((current) => ({
      ...current,
      starrLab: {
        ...current.starrLab,
        tiers: {
          ...current.starrLab.tiers,
          [tier]: updater(current.starrLab.tiers[String(tier)]),
        },
      },
    }));
  }

  function updateLessonDraft(tier: number, updater: (current: AcademyLessonConfig) => AcademyLessonConfig) {
    updateConfigDraft((current) => ({
      ...current,
      academy: {
        ...current.academy,
        lessons: current.academy.lessons.map((lesson) =>
          lesson.tier === tier ? updater(lesson) : lesson,
        ),
      },
    }));
  }

  const battleMonitor = Array.from({ length: 7 }, (_, index) => index + 1).map((tier) => {
    const inTier = users.filter((user) => {
      const progress = (user.publicMetadata?.interviewProgress ?? {}) as { highestCompletedTier?: number; latestStarrScore?: number };
      return Number(progress.highestCompletedTier || 0) >= tier;
    });
    const passCount = inTier.filter((user) => {
      const progress = (user.publicMetadata?.interviewProgress ?? {}) as { latestStarrScore?: number };
      return Number(progress.latestStarrScore || 0) >= 70;
    }).length;

    return {
      tier,
      activeUsers: inTier.length,
      passRate: inTier.length ? Math.round((passCount / inTier.length) * 100) : 0,
      dropOff: Math.max(users.length - inTier.length, 0),
    };
  });

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
          <span style={S.vaultBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 5 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Vault Unlocked
          </span>
          <Link href="/" style={S.exitLink}>
            ← Exit to App
          </Link>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={S.tabBar}>
        {(
          [
            {
              id: "overview",
              label: "Overview",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="2" width="9" height="9" rx="1" /><rect x="13" y="2" width="9" height="9" rx="1" /><rect x="2" y="13" width="9" height="9" rx="1" /><rect x="13" y="13" width="9" height="9" rx="1" />
                </svg>
              ),
            },
            {
              id: "users",
              label: "Users",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" /><path d="M19 8v6M22 11h-6" />
                </svg>
              ),
            },
            {
              id: "refinery",
              label: "Job Refinery",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
                </svg>
              ),
            },
            {
              id: "advanced",
              label: "Advanced Controls",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12H4M20 12h2" />
                </svg>
              ),
            },
            {
              id: "foundation",
              label: "Foundation Mode",
              icon: (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              ),
            },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (t.id === "advanced") {
                void loadHcConfig();
                void loadLeaderboard();
                void loadRawLogs();
              }
            }}
            style={{
              ...S.tabBtn,
              ...(tab === t.id ? S.tabActive : {}),
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {t.icon}
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
                            colSpan={7}
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
                              <span style={{ ...S.levelBadge, borderColor: "rgba(148,163,184,0.3)", color: "#e2e8f0" }}>
                                {communicationHealth(u.publicMetadata ?? {})}
                              </span>
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

          {/* ══ ADVANCED CONTROLS ═══════════════════════════════════════ */}
          {tab === "advanced" && (
            <motion.div
              key="advanced"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>The Master Key</h2>
                  <span style={S.sectionSub}>Global AI and command-center persistence</span>
                </div>

                {!configDraft ? (
                  <div style={S.emptyState}><p style={{ margin: 0, color: "#9ca3af", fontSize: "0.84rem" }}>Load the admin config to edit command-center settings.</p></div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <label style={S.drawerLabel}>Prompt Editor (System Instructions)</label>
                      <textarea
                        value={configDraft.systemPrompt}
                        onChange={(e) => updateConfigDraft((current) => ({ ...current, systemPrompt: e.target.value }))}
                        style={{ ...S.drawerTextarea, minHeight: 220 }}
                        placeholder="System prompt for resume auditing"
                      />
                    </div>

                    <div style={{ ...S.sliderBlock, gap: 16 }}>
                      <div>
                        <div style={S.sliderLabelRow}>
                          <span>Temperature</span>
                          <strong>{configDraft.temperature.toFixed(2)}</strong>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={configDraft.temperature}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, temperature: Number(e.target.value) }))}
                          style={S.slider}
                        />
                        {configDraft.temperature !== 0 && (
                          <p style={S.warningText}>
                            Non-zero temperature can cause scoring drift between scans.
                          </p>
                        )}
                      </div>

                      <div>
                        <label style={S.drawerLabel}>Model Version</label>
                        <select
                          value={configDraft.model}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, model: e.target.value }))}
                          style={S.drawerInput}
                        >
                          {(hcConfig?.modelOptions || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.77rem" }}>
                        Cache version: {hcConfig?.resumeCacheVersion ?? "—"}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        style={{ ...S.primaryBtn, opacity: savingConfig ? 0.6 : 1 }}
                        disabled={savingConfig}
                        onClick={() => saveGlobalConfig()}
                      >
                        {savingConfig ? "Saving..." : "Save Control Panel"}
                      </button>
                      <button
                        type="button"
                        style={S.ghostDangerBtn}
                        disabled={savingConfig}
                        onClick={() => saveGlobalConfig({ clearCache: true })}
                      >
                        Clear All Resume Cache
                      </button>
                      <button type="button" style={S.secondaryBtn} onClick={() => void loadHcConfig()}>
                        Reload
                      </button>
                    </div>

                    {configMsg && <p style={S.inlineMsg}>{configMsg}</p>}
                  </div>
                )}
              </div>

              {configDraft && (
                <>
                  <div style={S.section}>
                    <div style={S.sectionHead}>
                      <h2 style={S.sectionTitle}>Persona Lab</h2>
                      <span style={S.sectionSub}>Tier prompts, silence anchor, interrupt threshold, and logic strictness</span>
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                      {Object.values(configDraft.starrLab.tiers)
                        .sort((a, b) => a.tier - b.tier)
                        .map((tierConfig) => (
                          <div key={tierConfig.tier} style={S.miniPanel}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                              <div>
                                <p style={S.miniTitle}>Tier {tierConfig.tier}: {tierConfig.title}</p>
                                <p style={S.sectionSub}>{tierConfig.scenarioTitle} • {tierConfig.persona}</p>
                              </div>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <input
                                  value={tierConfig.persona}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, persona: e.target.value }))}
                                  style={{ ...S.drawerInput, minWidth: 180 }}
                                  placeholder="Persona name"
                                />
                                <input
                                  value={tierConfig.scenarioTitle}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, scenarioTitle: e.target.value }))}
                                  style={{ ...S.drawerInput, minWidth: 220 }}
                                  placeholder="Scenario"
                                />
                              </div>
                            </div>
                            <textarea
                              value={tierConfig.systemPrompt}
                              onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, systemPrompt: e.target.value }))}
                              style={{ ...S.drawerTextarea, minHeight: 140, marginBottom: 12 }}
                              placeholder="Tier system instructions"
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                              <div>
                                <label style={S.drawerLabel}>Questions</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={12}
                                  value={tierConfig.questionCount}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, questionCount: Number(e.target.value) || current.questionCount }))}
                                  style={S.drawerInput}
                                />
                              </div>
                              <div>
                                <label style={S.drawerLabel}>Silence Anchor (ms)</label>
                                <input
                                  type="number"
                                  min={500}
                                  step={100}
                                  value={tierConfig.silenceAnchorMs}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, silenceAnchorMs: Number(e.target.value) || current.silenceAnchorMs }))}
                                  style={S.drawerInput}
                                />
                              </div>
                              <div>
                                <label style={S.drawerLabel}>Interrupt Threshold (s)</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={120}
                                  value={tierConfig.interruptThresholdSeconds}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, interruptThresholdSeconds: Number(e.target.value) || current.interruptThresholdSeconds }))}
                                  style={S.drawerInput}
                                />
                              </div>
                              <div>
                                <label style={S.drawerLabel}>Multi-Part Pips</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  value={tierConfig.multiPartSegments}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, multiPartSegments: Number(e.target.value) || 0 }))}
                                  style={S.drawerInput}
                                />
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
                              <div>
                                <div style={S.sliderLabelRow}>
                                  <span>Logic Strictness</span>
                                  <strong>{tierConfig.temperature.toFixed(2)}</strong>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={tierConfig.temperature}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, temperature: Number(e.target.value) }))}
                                  style={S.slider}
                                />
                              </div>
                              <div>
                                <div style={S.sliderLabelRow}>
                                  <span>Presence Penalty</span>
                                  <strong>{tierConfig.presencePenalty.toFixed(2)}</strong>
                                </div>
                                <input
                                  type="range"
                                  min={-0.2}
                                  max={0.2}
                                  step={0.01}
                                  value={tierConfig.presencePenalty}
                                  onChange={(e) => updateTierDraft(tierConfig.tier, (current) => ({ ...current, presencePenalty: Number(e.target.value) }))}
                                  style={S.slider}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionHead}>
                      <h2 style={S.sectionTitle}>Battle Monitor</h2>
                      <span style={S.sectionSub}>Active tier counts, pass-rate snapshots, and drop-off points</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
                      {battleMonitor.map((row) => (
                        <div key={`battle-${row.tier}`} style={S.statCard}>
                          <p style={{ ...S.statNum, fontSize: "1.6rem" }}>T{row.tier}</p>
                          <p style={S.statLabel}>{row.activeUsers} active</p>
                          <p style={{ ...S.sectionSub, display: "block", marginTop: 8 }}>Pass rate {row.passRate}%</p>
                          <p style={{ ...S.sectionSub, display: "block", marginTop: 4 }}>Drop-off {row.dropOff}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionHead}>
                      <h2 style={S.sectionTitle}>Academy Registry</h2>
                      <span style={S.sectionSub}>Lesson CMS, IP valuator, and prerequisite flow</span>
                    </div>
                    <div style={{ display: "grid", gap: 14 }}>
                      {configDraft.academy.lessons
                        .sort((a, b) => a.tier - b.tier)
                        .map((lesson) => (
                          <div key={`lesson-${lesson.tier}`} style={S.miniPanel}>
                            <p style={S.miniTitle}>Tier {lesson.tier} lesson</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 12 }}>
                              <input
                                value={lesson.title}
                                onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, title: e.target.value }))}
                                style={S.drawerInput}
                                placeholder="Lesson title"
                              />
                              <input
                                value={lesson.videoId}
                                onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, videoId: e.target.value }))}
                                style={S.drawerInput}
                                placeholder="Video ID"
                              />
                            </div>
                            <textarea
                              value={lesson.description}
                              onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, description: e.target.value }))}
                              style={{ ...S.drawerTextarea, minHeight: 90, marginBottom: 12 }}
                              placeholder="Lesson description"
                            />
                            <textarea
                              value={lesson.logicCheck}
                              onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, logicCheck: e.target.value }))}
                              style={{ ...S.drawerTextarea, minHeight: 90, marginBottom: 12 }}
                              placeholder="3-question logic check"
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                              <input
                                type="number"
                                value={lesson.ipReward}
                                onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, ipReward: Number(e.target.value) || current.ipReward }))}
                                style={S.drawerInput}
                                placeholder="IP reward"
                              />
                              <input
                                type="number"
                                value={lesson.tierUnlockIpCost}
                                onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, tierUnlockIpCost: Number(e.target.value) || current.tierUnlockIpCost }))}
                                style={S.drawerInput}
                                placeholder="Next tier cost"
                              />
                              <select
                                value={lesson.prerequisiteTier ?? ""}
                                onChange={(e) => updateLessonDraft(lesson.tier, (current) => ({ ...current, prerequisiteTier: e.target.value ? Number(e.target.value) : null }))}
                                style={S.drawerInput}
                              >
                                <option value="">No prerequisite</option>
                                {Array.from({ length: 7 }, (_, index) => index + 1).map((tier) => (
                                  <option key={`lesson-prereq-${tier}`} value={tier}>Tier {tier}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionHead}>
                      <h2 style={S.sectionTitle}>Canvas Registry</h2>
                      <span style={S.sectionSub}>Template forge, asset injector, and redline rules</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                      <div>
                        <label style={S.drawerLabel}>Templates</label>
                        <textarea
                          value={toLineInput(configDraft.canvas.templates)}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, templates: fromLineInput(e.target.value) } }))}
                          style={{ ...S.drawerTextarea, minHeight: 120 }}
                        />
                      </div>
                      <div>
                        <label style={S.drawerLabel}>Asset Library</label>
                        <textarea
                          value={toLineInput(configDraft.canvas.assetLibrary)}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, assetLibrary: fromLineInput(e.target.value) } }))}
                          style={{ ...S.drawerTextarea, minHeight: 120 }}
                        />
                      </div>
                      <div>
                        <label style={S.drawerLabel}>Approved Palettes</label>
                        <textarea
                          value={toLineInput(configDraft.canvas.approvedPalettes)}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, approvedPalettes: fromLineInput(e.target.value) } }))}
                          style={{ ...S.drawerTextarea, minHeight: 120 }}
                        />
                      </div>
                      <div>
                        <label style={S.drawerLabel}>Approved Font Pairings</label>
                        <textarea
                          value={toLineInput(configDraft.canvas.approvedFontPairings)}
                          onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, approvedFontPairings: fromLineInput(e.target.value) } }))}
                          style={{ ...S.drawerTextarea, minHeight: 120 }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
                      <input
                        type="number"
                        value={configDraft.canvas.minFontSizePt}
                        onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, minFontSizePt: Number(e.target.value) || current.canvas.minFontSizePt } }))}
                        style={S.drawerInput}
                        placeholder="Minimum font size"
                      />
                      <input
                        type="number"
                        step="0.05"
                        value={configDraft.canvas.minMarginInches}
                        onChange={(e) => updateConfigDraft((current) => ({ ...current, canvas: { ...current.canvas, minMarginInches: Number(e.target.value) || current.canvas.minMarginInches } }))}
                        style={S.drawerInput}
                        placeholder="Minimum margin inches"
                      />
                    </div>
                  </div>

                  <div style={S.section}>
                    <div style={S.sectionHead}>
                      <h2 style={S.sectionTitle}>Impact Ledger Engine</h2>
                      <span style={S.sectionSub}>Power verb dictionary and manual scoring weights</span>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {configDraft.impactLedger.powerVerbs.map((entry, index) => (
                        <div key={`verb-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 12 }}>
                          <input
                            value={entry.verb}
                            onChange={(e) => updateConfigDraft((current) => ({
                              ...current,
                              impactLedger: {
                                ...current.impactLedger,
                                powerVerbs: current.impactLedger.powerVerbs.map((verbEntry, verbIndex) =>
                                  verbIndex === index ? { ...verbEntry, verb: e.target.value } : verbEntry,
                                ),
                              },
                            }))}
                            style={S.drawerInput}
                            placeholder="Verb"
                          />
                          <input
                            type="number"
                            min={1}
                            value={entry.weight}
                            onChange={(e) => updateConfigDraft((current) => ({
                              ...current,
                              impactLedger: {
                                ...current.impactLedger,
                                powerVerbs: current.impactLedger.powerVerbs.map((verbEntry, verbIndex) =>
                                  verbIndex === index ? { ...verbEntry, weight: Number(e.target.value) || verbEntry.weight } : verbEntry,
                                ),
                              },
                            }))}
                            style={S.drawerInput}
                            placeholder="Weight"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>User Audit</h2>
                  <span style={S.sectionSub}>Inspect Impact Ledger quality</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <input
                    value={auditUserId}
                    onChange={(e) => setAuditUserId(e.target.value)}
                    placeholder="Clerk user ID"
                    style={{ ...S.searchInput, width: 340 }}
                  />
                  <button type="button" style={S.primaryBtn} onClick={loadUserAudit}>
                    {loadingAudit ? "Loading..." : "Load User Audit"}
                  </button>
                </div>
                {auditMsg && <p style={S.inlineMsg}>{auditMsg}</p>}
                {auditResult && (
                  <div style={S.miniPanel}>
                    <p style={S.miniTitle}>{auditResult.user.name} ({auditResult.user.email})</p>
                    <p style={S.sectionSub}>
                      Current score: {auditResult.resumeAuditState?.overallScore ?? "—"} • Last update: {auditResult.resumeAuditState?.updatedAt ? new Date(auditResult.resumeAuditState.updatedAt).toLocaleString() : "—"}
                    </p>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {(auditResult.impactLedger || []).slice(0, 10).map((entry) => (
                        <div key={entry.id} style={S.logCard}>
                          <p style={S.logDate}>{new Date(entry.createdAt).toLocaleDateString()}</p>
                          <p style={S.logLabel}>Action</p>
                          <p style={S.logCopy}>{entry.action}</p>
                          <p style={S.logLabel}>Proof</p>
                          <p style={S.logCopy}>{entry.proof}</p>
                          <p style={S.logLabel}>Result</p>
                          <p style={S.logCopy}>{entry.result}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>Top 10 Resume Scores</h2>
                  <span style={S.sectionSub}>Power user leaderboard</span>
                </div>
                <button type="button" style={{ ...S.secondaryBtn, marginBottom: 12 }} onClick={() => void loadLeaderboard()}>
                  Refresh Leaderboard
                </button>
                {loadingLeaderboard ? (
                  <div style={S.skeleton} />
                ) : leaderboard.length === 0 ? (
                  <div style={S.emptyState}><p style={{ margin: 0, color: "#9ca3af", fontSize: "0.84rem" }}>No scored users yet.</p></div>
                ) : (
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Rank</th>
                          <th style={S.th}>User</th>
                          <th style={S.th}>Score</th>
                          <th style={S.th}>Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row, index) => (
                          <tr key={row.userId}>
                            <td style={S.td}>#{index + 1}</td>
                            <td style={S.td}>{row.name} ({row.email})</td>
                            <td style={S.td}>{row.score}</td>
                            <td style={S.td}>{new Date(row.updatedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>Raw Log Inspector</h2>
                  <span style={S.sectionSub}>Model JSON debugging</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <button type="button" style={S.secondaryBtn} onClick={() => void loadRawLogs()}>
                    Refresh Logs
                  </button>
                  <select
                    value={selectedRawLogId}
                    onChange={(e) => setSelectedRawLogId(e.target.value)}
                    style={{ ...S.drawerInput, maxWidth: 360 }}
                  >
                    <option value="">Select a scan</option>
                    {rawLogs.map((log) => (
                      <option key={log.id} value={log.id}>
                        {new Date(log.createdAt).toLocaleString()} - {log.email || log.userId || "Guest"}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingRawLogs ? (
                  <div style={S.skeleton} />
                ) : (
                  (() => {
                    const selected = rawLogs.find((log) => log.id === selectedRawLogId) || rawLogs[0];
                    if (!selected) {
                      return <div style={S.emptyState}><p style={{ margin: 0, color: "#9ca3af", fontSize: "0.84rem" }}>No audit logs captured yet.</p></div>;
                    }

                    return (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={S.miniPanel}>
                          <p style={S.miniTitle}>{selected.email || selected.userId || "Guest"}</p>
                          <p style={S.sectionSub}>Model: {selected.model} • Temp: {selected.temperature} • Score: {selected.normalizedReport?.overallScore ?? "—"}</p>
                          <p style={{ ...S.sectionSub, marginTop: 6 }}>Prompt preview: {selected.promptPreview}</p>
                        </div>
                        <textarea readOnly value={selected.rawResponse} style={{ ...S.drawerTextarea, minHeight: 220 }} />
                      </div>
                    );
                  })()
                )}
              </div>
            </motion.div>
          )}

          {/* ══ FOUNDATION MODE ══════════════════════════════════════════ */}
          {tab === "foundation" && (
            <motion.div
              key="foundation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <div style={S.section}>
                <div style={S.sectionHead}>
                  <h2 style={S.sectionTitle}>Foundation Mode Admin</h2>
                  <span style={S.sectionSub}>Lesson editor · Analytics · Health · Video manager · Notifications</span>
                </div>
                <FoundationAdminTab />
              </div>
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

                  <div>
                    <label style={S.drawerLabel}>Testing Suite Overrides</label>
                    <div style={{ display: "grid", gap: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#e2e8f0", fontSize: "0.84rem" }}>
                        <input
                          type="checkbox"
                          checked={masterUnlock}
                          onChange={(e) => setMasterUnlock(e.target.checked)}
                        />
                        Master unlock all interview tiers
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#e2e8f0", fontSize: "0.84rem" }}>
                        <input
                          type="checkbox"
                          checked={promotionSupportUnlock}
                          onChange={(e) => setPromotionSupportUnlock(e.target.checked)}
                        />
                        Unlock Promotion Support
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                        <select
                          value={forcedTier}
                          onChange={(e) => setForcedTier(e.target.value ? Number(e.target.value) : "")}
                          style={S.drawerInput}
                        >
                          <option value="">Tier jumper</option>
                          {Array.from({ length: 7 }, (_, index) => index + 1).map((tier) => (
                            <option key={`forced-tier-${tier}`} value={tier}>Tier {tier}</option>
                          ))}
                        </select>
                        <select
                          value={forcedCourseLevel}
                          onChange={(e) => setForcedCourseLevel(e.target.value ? Number(e.target.value) : "")}
                          style={S.drawerInput}
                        >
                          <option value="">Course level jumper</option>
                          {Array.from({ length: 7 }, (_, index) => index + 1).map((level) => (
                            <option key={`forced-course-level-${level}`} value={level}>Level {level}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                        <input
                          type="number"
                          value={impactPointsDelta}
                          onChange={(e) => setImpactPointsDelta(Number(e.target.value) || 0)}
                          style={S.drawerInput}
                          placeholder="IP injector delta"
                        />
                      </div>
                      <div style={{ display: "grid", gap: 8 }}>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>
                          Foundation module override (testing)
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6 }}>
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((moduleNum) => {
                            const selected = foundationUnlockedModules.includes(moduleNum);
                            return (
                              <button
                                key={`foundation-module-override-${moduleNum}`}
                                type="button"
                                onClick={() => {
                                  setFoundationUnlockedModules((prev) =>
                                    prev.includes(moduleNum)
                                      ? prev.filter((value) => value !== moduleNum)
                                      : [...prev, moduleNum].sort((a, b) => a - b)
                                  );
                                }}
                                style={{
                                  padding: "6px 0",
                                  borderRadius: 8,
                                  border: selected ? "1px solid #10b981" : "1px solid #334155",
                                  background: selected ? "rgba(16, 185, 129, 0.12)" : "#111827",
                                  color: selected ? "#6ee7b7" : "#94a3b8",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                M{moduleNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" style={S.secondaryBtn} onClick={() => void runUserSnapshotAction("save")}>
                          Snapshot State
                        </button>
                        <button type="button" style={S.ghostDangerBtn} onClick={() => void runUserSnapshotAction("restore")}>
                          Restore Snapshot
                        </button>
                        <button type="button" style={S.ghostDangerBtn} onClick={() => void resetUserOnboarding()}>
                          Reset Onboarding
                        </button>
                      </div>
                    </div>
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
    borderBottom: "2.5px solid #10b981",
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
  warningText: {
    margin: "8px 0 0",
    fontSize: "0.76rem",
    color: "#fbbf24",
  },
  inlineMsg: {
    margin: 0,
    color: "#cbd5e1",
    fontSize: "0.8rem",
    background: "rgba(15,23,42,0.7)",
    border: "1px solid rgba(148,163,184,0.24)",
    borderRadius: 8,
    padding: "9px 11px",
  },
  miniPanel: {
    background: "rgba(2, 6, 23, 0.5)",
    border: "1px solid rgba(148,163,184,0.22)",
    borderRadius: 10,
    padding: 14,
  },
  miniTitle: {
    margin: "0 0 4px",
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "0.86rem",
  },
  logCard: {
    border: "1px solid rgba(148,163,184,0.2)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(15,23,42,0.5)",
  },
  logDate: {
    margin: "0 0 6px",
    color: "#94a3b8",
    fontSize: "0.74rem",
  },
  logLabel: {
    margin: "0 0 2px",
    color: "#94a3b8",
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  logCopy: {
    margin: "0 0 8px",
    color: "#e2e8f0",
    fontSize: "0.8rem",
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
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
