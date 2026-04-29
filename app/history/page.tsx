"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  clearInterviewHistory,
  loadInterviewHistory,
  loadTrainingProgress,
  type InterviewSession,
} from "../lib/interviewStorage";
import { loadImpactEntries, type ImpactEntry } from "../lib/impactLog";
import {
  awardFirstPortfolioExport,
  getProgressMeta,
  getTierByIP,
  loadBaselineResumeScore,
  loadHighestResumeScore,
  loadIP,
  loadStreakState,
} from "../lib/progression";

// ─── Markdown renderer ────────────────────────────────────────────────────────
function formatFeedbackHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");
}

// ─── Level helpers ────────────────────────────────────────────────────────────
function sessionLevel(session: InterviewSession): string {
  const fromLevel = session.level?.match(/tier-(\d)/i)?.[1];
  const tierFromLevel = fromLevel ? Number(fromLevel) : 0;
  if (tierFromLevel >= 1 && tierFromLevel <= 7) return `Tier ${tierFromLevel}`;

  const n = session.questions.length;
  if (n <= 3) return "Tier 1";
  if (n === 4) return "Tier 2";
  if (n === 5) return "Tier 3";
  if (n === 6) return "Tier 4";
  if (n === 7) return "Tier 5";
  if (n === 8) return "Tier 6";
  return "Tier 7";
}

function levelClass(level: string) {
  const tier = Number(level.match(/tier\s*(\d)/i)?.[1] || "1");
  if (tier <= 2) return "level-badge--quick";
  if (tier <= 5) return "level-badge--medium";
  return "level-badge--intensive";
}

function sessionJobTitle(session: InterviewSession): string {
  return (
    session.jobTitle?.trim() ||
    session.job.trim().split("\n")[0]?.trim().slice(0, 60) ||
    "Interview Session"
  );
}

function scoreColor(score: number) {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

type ArchiveLens = "sessions" | "ledger";
type LedgerRange = "90d" | "6m" | "1y";

const DAY_MS = 24 * 60 * 60 * 1000;

function weekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function weekKey(date: Date) {
  return weekStart(date).toISOString().slice(0, 10);
}

function rangeStart(range: LedgerRange) {
  const now = Date.now();
  if (range === "90d") return now - 90 * DAY_MS;
  if (range === "6m") return now - 183 * DAY_MS;
  return now - 365 * DAY_MS;
}

function buildWeekSlots(range: LedgerRange) {
  const start = weekStart(new Date(rangeStart(range)));
  const end = weekStart(new Date());
  const slots: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    slots.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return slots;
}

function formatLedgerDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type EmailMode = "pulse" | "promotion" | "recap";
type EmailTone = "casual" | "formal";

function impactStrength(entry: ImpactEntry): number {
  const text = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
  const numbers = (text.match(/\d+/g) || []).length;
  const outcomeWords = ["increased", "reduced", "saved", "improved", "launched", "delivered", "grew"];
  const outcomeHits = outcomeWords.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  const lengthSignal = Math.min(40, Math.round((entry.result.length + entry.proof.length) / 10));
  return numbers * 10 + outcomeHits * 8 + lengthSignal;
}

function topImpactWins(entries: ImpactEntry[], count = 5): ImpactEntry[] {
  return [...entries]
    .sort((a, b) => impactStrength(b) - impactStrength(a))
    .slice(0, count);
}

// ─── Session card ─────────────────────────────────────────────────────────────
function SessionCard({
  session,
  delay,
}: {
  session: InterviewSession;
  delay: number;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const title = sessionJobTitle(session);
  const level = sessionLevel(session);
  const dateStr = new Date(session.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const score = session.starrScore ?? null;

  return (
    <div
      className="hist-card glass-card anim-fade-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="hist-card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="hist-card-title">{title}</p>
          <div className="hist-card-meta">
            <span className={`level-badge ${levelClass(level)}`}>{level}</span>
            <span>{session.questions.length}Q</span>
            <span>·</span>
            <span>{session.answers.filter(Boolean).length} answers</span>
            <span>·</span>
            <span>{dateStr}</span>
          </div>
        </div>
        {score !== null && (
          <div className="hist-card-score" style={{ color: scoreColor(score) }}>
            {score}<span> /100</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          className="hist-feedback-toggle"
          onClick={() => setShowFeedback((v) => !v)}
        >
          {showFeedback ? "Hide feedback ↑" : "View feedback ↓"}
        </button>
        <button
          className="hist-feedback-toggle"
          onClick={() => setShowTranscript((v) => !v)}
        >
          {showTranscript ? "Hide transcript ↑" : "View transcript ↓"}
        </button>
        <Link
          href={`/voice?mode=retry&sessionId=${session.id}`}
          className="hist-retry-btn"
        >
          Retry →
        </Link>
      </div>

      {session.analysis && (
        <div className="hist-highlights">
          {session.analysis.strongPoints.length > 0 && (
            <div>
              <p className="hist-highlight-label hist-highlight-label--strong">Strong points</p>
              <div className="hist-highlight-list">
                {session.analysis.strongPoints.map((point, idx) => (
                  <span key={`${point}-${idx}`} className="hist-highlight-pill hist-highlight-pill--strong">{point}</span>
                ))}
              </div>
            </div>
          )}
          {session.analysis.weakPoints.length > 0 && (
            <div>
              <p className="hist-highlight-label hist-highlight-label--weak">Weak points</p>
              <div className="hist-highlight-list">
                {session.analysis.weakPoints.map((point, idx) => (
                  <span key={`${point}-${idx}`} className="hist-highlight-pill hist-highlight-pill--weak">{point}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showFeedback && (
        <div className="hist-feedback-body">
          <div
            className="md-body"
            dangerouslySetInnerHTML={{
              __html: `<p>${formatFeedbackHtml(
                session.feedback || "No feedback recorded."
              )}</p>`,
            }}
          />
        </div>
      )}

      {showTranscript && (
        <div className="hist-feedback-body">
          {session.analysis?.starrHighlights && (
            <div className="hist-starr-summary">
              {Object.entries(session.analysis.starrHighlights).map(([component, summary]) => (
                <div key={component} className="hist-starr-item">
                  <span className="hist-starr-key">{component}</span>
                  <span className="hist-starr-value">{summary}</span>
                </div>
              ))}
            </div>
          )}
          <div className="hist-transcript-list">
            {(session.transcript ?? session.questions.map((question, i) => ({ question, answer: session.answers[i] || "(no response)" }))).map((entry, idx) => (
              <div key={`${session.id}-${idx}`} className="hist-transcript-item">
                <p className="hist-transcript-q">Q{idx + 1}. {entry.question}</p>
                <p className="hist-transcript-a">A. {entry.answer || "(no response)"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [impactEntries, setImpactEntries] = useState<ImpactEntry[]>([]);
  const [lens, setLens] = useState<ArchiveLens>("sessions");
  const [ledgerRange, setLedgerRange] = useState<LedgerRange>("90d");
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [ip, setIp] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [emailMode, setEmailMode] = useState<EmailMode>("pulse");
  const [emailTone, setEmailTone] = useState<EmailTone>("formal");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHistory(loadInterviewHistory(userId));
      setImpactEntries(loadImpactEntries(userId));
      setIp(loadIP());
      setHydrated(true);
    });
  }, [userId]);

  useEffect(() => {
    function onFocus() {
      setIp(loadIP());
      setImpactEntries(loadImpactEntries(userId));
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [userId]);

  const filteredImpactEntries = useMemo(() => {
    const start = rangeStart(ledgerRange);
    return impactEntries
      .filter((entry) => entry.createdAt >= start)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [impactEntries, ledgerRange]);

  const groupedByWeek = useMemo(() => {
    const groups = new Map<string, ImpactEntry[]>();
    for (const entry of filteredImpactEntries) {
      const key = weekKey(new Date(entry.createdAt));
      const bucket = groups.get(key) || [];
      bucket.push(entry);
      groups.set(key, bucket);
    }
    return groups;
  }, [filteredImpactEntries]);

  const weekSlots = useMemo(() => buildWeekSlots(ledgerRange), [ledgerRange]);

  useEffect(() => {
    if (lens !== "ledger") return;

    const availableWeekKeys = weekSlots
      .map((slot) => weekKey(slot))
      .filter((key) => (groupedByWeek.get(key)?.length || 0) > 0);

    if (availableWeekKeys.length === 0) {
      queueMicrotask(() => {
        setSelectedWeekKey(null);
        setSelectedEntryId(null);
      });
      return;
    }

    const latestWeek = availableWeekKeys[availableWeekKeys.length - 1];
    queueMicrotask(() => {
      setSelectedWeekKey((prev) => (prev && availableWeekKeys.includes(prev) ? prev : latestWeek));
    });
  }, [lens, weekSlots, groupedByWeek]);

  const selectedWeekEntries = useMemo(
    () => (selectedWeekKey ? groupedByWeek.get(selectedWeekKey) || [] : []),
    [selectedWeekKey, groupedByWeek]
  );

  useEffect(() => {
    if (selectedWeekEntries.length === 0) {
      queueMicrotask(() => setSelectedEntryId(null));
      return;
    }

    const exists = selectedWeekEntries.some((entry) => entry.id === selectedEntryId);
    if (!exists) {
      queueMicrotask(() => setSelectedEntryId(selectedWeekEntries[0].id));
    }
  }, [selectedWeekEntries, selectedEntryId]);

  const selectedEntry = selectedWeekEntries.find((entry) => entry.id === selectedEntryId) || null;
  const progressMeta = getProgressMeta(ip);
  const filteredTopWins = topImpactWins(filteredImpactEntries, 5);
  const selectedWins = filteredImpactEntries.filter((entry) => selectedEntryIds.includes(entry.id));

  const baselineResumeScore = loadBaselineResumeScore();
  const highestResumeScore = loadHighestResumeScore();
  const resumeDelta = baselineResumeScore
    ? Math.max(0, highestResumeScore - baselineResumeScore)
    : 0;
  const trainingCompleted = loadTrainingProgress(userId).completedModules.length;
  const streakDays = loadStreakState().streakDays;

  function toggleEntrySelection(entryId: string) {
    setSelectedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId].slice(0, 5)
    );
  }

  async function generatePortfolioPdf() {
    if (filteredImpactEntries.length === 0) {
      setExportMessage("No wins in this range yet.");
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const navy = [15, 23, 42] as const;
    const slate = [71, 85, 105] as const;

    let y = 60;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...navy);
    doc.setFontSize(20);
    doc.text("Hirely Coach Performance Portfolio", 48, y);

    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slate);
    doc.text(`Date Range: ${ledgerRange.toUpperCase()} · Generated ${new Date().toLocaleDateString()}`, 48, y);

    y += 26;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...navy);
    doc.text("Highlight Reel (Top 5 Impact Wins)", 48, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    for (const win of filteredTopWins) {
      const line = `${formatLedgerDate(win.createdAt)} | ${win.action} -> ${win.result}`;
      const lines = doc.splitTextToSize(line, 500);
      doc.text(lines, 56, y);
      y += lines.length * 12 + 4;
      if (y > 720) {
        doc.addPage();
        y = 60;
      }
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...navy);
    doc.text("Growth Metrics", 48, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...slate);
    doc.text(`Resume Score: ${baselineResumeScore ?? 0} -> ${highestResumeScore} (${resumeDelta >= 0 ? "+" : ""}${resumeDelta})`, 56, y);
    y += 16;
    doc.text(`Skill Mastery: ${trainingCompleted} certifications completed`, 56, y);
    y += 16;
    doc.text(`Professional Tier: ${getTierByIP(ip).title}`, 56, y);
    y += 16;
    doc.text(`Consistency: ${streakDays}-day streak`, 56, y);

    y += 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...navy);
    doc.text("Detailed Ledger", 48, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    for (const entry of [...filteredImpactEntries].sort((a, b) => a.createdAt - b.createdAt)) {
      const actionLine = `Action: ${entry.action}`;
      const proofLine = `Proof: ${entry.proof}`;
      const resultLine = `Result: ${entry.result}`;
      const dateLine = formatLedgerDate(entry.createdAt);
      const block = [dateLine, actionLine, proofLine, resultLine, ""];

      for (const text of block) {
        const lines = doc.splitTextToSize(text, 500);
        doc.text(lines, 56, y);
        y += lines.length * 11;
      }

      if (y > 730) {
        doc.addPage();
        y = 60;
      }
    }

    doc.save(`hirely-performance-portfolio-${Date.now()}.pdf`);
    const reward = awardFirstPortfolioExport();
    if (reward.awarded) {
      setIp(reward.ip);
      setExportMessage("Portfolio exported. +25 IP for first export.");
    } else {
      setExportMessage("Portfolio exported.");
    }
  }

  async function draftManagerEmail() {
    if (selectedWins.length < 3) {
      setExportMessage("Select 3 to 5 wins to draft a manager update.");
      return;
    }

    setIsDraftingEmail(true);
    try {
      const res = await fetch("/api/impact-ledger/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wins: selectedWins,
          mode: emailMode,
          tone: emailTone,
          levelTitle: getTierByIP(ip).title,
          certificationsCompleted: trainingCompleted,
        }),
      });
      const data = (await res.json()) as { subject?: string; body?: string; error?: string };
      if (!res.ok || !data.body) {
        setExportMessage(data.error || "Could not generate draft email.");
        return;
      }
      setEmailSubject(data.subject || "Professional Update");
      setEmailDraft(data.body);
      setExportMessage("Draft generated.");
    } catch {
      setExportMessage("Could not generate draft email.");
    } finally {
      setIsDraftingEmail(false);
    }
  }

  function copyDraft() {
    if (!emailDraft) return;
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailDraft}`);
    setExportMessage("Draft copied to clipboard.");
  }

  function openInMail() {
    if (!emailDraft) return;
    const subject = encodeURIComponent(emailSubject || "Professional Update");
    const body = encodeURIComponent(emailDraft);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  const handleClear = () => {
    if (!window.confirm("Delete all interview history from this browser?")) return;
    clearInterviewHistory(userId);
    setHistory([]);
  };

  return (
    <div className="lp-root">
      <main className="page-shell-gh">
        {userId && (
          <Link href="/growthhub" className="gh-back-link" style={{ marginBottom: 16 }}>
            ← GrowthHub
          </Link>
        )}

        {/* ── Page header ── */}
        <div className="anim-fade-up" style={{ marginBottom: 40 }}>
          <p className="gh-page-eyebrow">Session archive</p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <h1 className="gh-page-h1" style={{ marginBottom: 0 }}>
              {lens === "sessions" ? "Interview History" : "Professional Ledger"}
            </h1>
            {lens === "sessions" && history.length > 0 && (
              <span className="stat-pill stat-pill--green">
                {history.length} session{history.length !== 1 ? "s" : ""}
              </span>
            )}
            {lens === "ledger" && filteredImpactEntries.length > 0 && (
              <span className="stat-pill stat-pill--amber">
                {filteredImpactEntries.length} win{filteredImpactEntries.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="gh-page-sub" style={{ marginTop: 10 }}>
            {lens === "sessions"
              ? "Your past mock interviews are stored locally in this browser. Revisit answers, AI feedback, and STARR scores at any time."
              : "This is your Professional Ledger. Review your history of wins to see your growth over the last year."}
          </p>
        </div>

        <div className="archive-lens-toggle anim-fade-up anim-fade-up--d1" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`archive-lens-btn ${lens === "sessions" ? "is-active" : ""}`}
            onClick={() => setLens("sessions")}
          >
            Interview Sessions
          </button>
          <button
            type="button"
            className={`archive-lens-btn ${lens === "ledger" ? "is-active" : ""}`}
            onClick={() => setLens("ledger")}
          >
            Impact Ledger
          </button>
        </div>

        {lens === "ledger" && (
          <div className="glass-card anim-fade-up anim-fade-up--d1" style={{ padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <strong style={{ color: "#f8fafc", fontSize: "0.86rem" }}>
                Ledger Mastery
              </strong>
              <span style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>
                Wins Logged: {impactEntries.length} • {ip} IP • {progressMeta.tier.title}
              </span>
            </div>
            <div style={{ marginTop: 8, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,0.1)" }}>
              <span
                style={{
                  display: "block",
                  width: `${progressMeta.progressPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                }}
              />
            </div>
            <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "0.76rem" }}>
              {progressMeta.nextTier
                ? `${progressMeta.remainingToNext} IP to ${progressMeta.nextTier.title}`
                : "Master tier achieved"}
            </p>
          </div>
        )}

        {/* ── Action bar ── */}
        {lens === "sessions" ? (
          <div
            className="glass-card anim-fade-up anim-fade-up--d1"
            style={{
              padding: "16px 24px",
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            <button
              className="lp-btn-primary"
              type="button"
              onClick={() => router.push("/voice?mode=new")}
            >
              New Interview
            </button>
            <button
              className="lp-btn-ghost"
              type="button"
              onClick={() => router.push("/growthhub")}
            >
              GrowthHub
            </button>
            <button
              className="lp-btn-ghost"
              type="button"
              onClick={handleClear}
              disabled={!history.length}
              style={{ marginLeft: "auto", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              Clear history
            </button>
          </div>
        ) : (
          <div className="glass-card anim-fade-up anim-fade-up--d1 archive-ledger-topbar">
            <div className="archive-range-toggle">
              <button
                type="button"
                className={`archive-range-btn ${ledgerRange === "90d" ? "is-active" : ""}`}
                onClick={() => setLedgerRange("90d")}
              >
                Last 90 Days
              </button>
              <button
                type="button"
                className={`archive-range-btn ${ledgerRange === "6m" ? "is-active" : ""}`}
                onClick={() => setLedgerRange("6m")}
              >
                6 Months
              </button>
              <button
                type="button"
                className={`archive-range-btn ${ledgerRange === "1y" ? "is-active" : ""}`}
                onClick={() => setLedgerRange("1y")}
              >
                1 Year
              </button>
            </div>
            <div className="archive-ledger-actions">
              <select
                className="archive-input"
                value={emailMode}
                onChange={(event) => setEmailMode(event.target.value as EmailMode)}
              >
                <option value="pulse">Weekly/Monthly Pulse</option>
                <option value="promotion">Promotion/Raise Request</option>
                <option value="recap">Project Recap</option>
              </select>
              <select
                className="archive-input"
                value={emailTone}
                onChange={(event) => setEmailTone(event.target.value as EmailTone)}
              >
                <option value="casual">Casual / Brief</option>
                <option value="formal">Formal / Detailed</option>
              </select>
              <button className="lp-btn-primary" type="button" onClick={generatePortfolioPdf}>
                Generate Performance Portfolio
              </button>
              <button
                className="lp-btn-ghost"
                type="button"
                onClick={draftManagerEmail}
                disabled={isDraftingEmail}
              >
                {isDraftingEmail ? "Drafting…" : "Draft Update for Manager"}
              </button>
              <button className="lp-btn-ghost" type="button" onClick={() => router.push("/growthhub")}>
                GrowthHub
              </button>
            </div>
          </div>
        )}

        {lens === "ledger" && exportMessage && (
          <div className="archive-export-msg">{exportMessage}</div>
        )}

        {/* ── Session list ── */}
        {!hydrated ? null : lens === "sessions" ? (
          history.length === 0 ? (
            <div className="empty-state anim-fade-up anim-fade-up--d2">
              No interviews yet. Run your first mock interview to start tracking progress.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {history.map((session, i) => (
                <SessionCard key={session.id} session={session} delay={0.08 + i * 0.06} />
              ))}
            </div>
          )
        ) : (
          <section className="archive-ledger-wrap anim-fade-up anim-fade-up--d2">
            {filteredImpactEntries.length === 0 ? (
              <div className="empty-state">No ledger wins found in this date range yet.</div>
            ) : (
              <>
                <div className="archive-week-grid" role="list" aria-label="Impact wins by week">
                  {weekSlots.map((slot) => {
                    const key = weekKey(slot);
                    const count = groupedByWeek.get(key)?.length || 0;
                    const isActive = selectedWeekKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="listitem"
                        className={`archive-week-tile ${isActive ? "is-active" : ""} ${count > 0 ? "has-data" : ""}`}
                        onClick={() => setSelectedWeekKey(key)}
                      >
                        <span>{slot.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        <strong>{count}</strong>
                      </button>
                    );
                  })}
                </div>

                <div className="archive-ledger-detail">
                  <div className="archive-ledger-list">
                    <p className="archive-ledger-list-title">
                      {selectedWeekKey
                        ? `Week of ${new Date(selectedWeekKey).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}`
                        : "Select a week"}
                    </p>
                    {selectedWeekEntries.length === 0 ? (
                      <p className="archive-ledger-empty">No wins recorded for this week.</p>
                    ) : (
                      selectedWeekEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`archive-ledger-entry ${selectedEntryId === entry.id ? "is-active" : ""}`}
                        >
                          <label className="archive-ledger-pick">
                            <input
                              type="checkbox"
                              checked={selectedEntryIds.includes(entry.id)}
                              onChange={() => toggleEntrySelection(entry.id)}
                            />
                            <span>Select</span>
                          </label>
                          <button
                            type="button"
                            className="archive-ledger-entry-btn"
                            onClick={() => setSelectedEntryId(entry.id)}
                          >
                            <span>{formatLedgerDate(entry.createdAt)}</span>
                            <strong>{entry.action.slice(0, 64)}</strong>
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="archive-ledger-view">
                    {!selectedEntry ? (
                      <p className="archive-ledger-empty">Select a win to see full details.</p>
                    ) : (
                      <>
                        <p className="archive-ledger-date">{formatLedgerDate(selectedEntry.createdAt)}</p>
                        <p className="archive-ledger-label">Action</p>
                        <p className="archive-ledger-copy">{selectedEntry.action}</p>
                        <p className="archive-ledger-label">Proof</p>
                        <p className="archive-ledger-copy">{selectedEntry.proof}</p>
                        <p className="archive-ledger-label">Result</p>
                        <p className="archive-ledger-copy">{selectedEntry.result}</p>
                      </>
                    )}

                    {emailDraft && (
                      <div className="archive-email-preview">
                        <p className="archive-ledger-label">Drafted Email Preview</p>
                        <p className="archive-ledger-copy"><strong>Subject:</strong> {emailSubject}</p>
                        <pre className="archive-email-copy">{emailDraft}</pre>
                        <div className="archive-email-actions">
                          <button type="button" className="lp-btn-ghost" onClick={copyDraft}>Copy to Clipboard</button>
                          <button type="button" className="lp-btn-primary" onClick={openInMail}>Open in Mail</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
