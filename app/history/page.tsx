"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  backfillLegacySessionTitles,
  clearInterviewHistory,
  loadInterviewHistory,
  type InterviewSession,
} from "../lib/interviewStorage";
import { getPromotionSupportAccess, getTierByIP, loadIP, loadStreakState } from "../lib/progression";
import { loadImpactEntries, type ImpactEntry } from "../lib/impactLog";

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
  if (session.level) return session.level;
  const n = session.questions.length;
  if (n <= 3) return "Quick";
  if (n <= 6) return "Medium";
  return "Intensive";
}

function levelClass(level: string) {
  const l = level.toLowerCase();
  if (l === "quick") return "level-badge--quick";
  if (l === "medium") return "level-badge--medium";
  return "level-badge--intensive";
}

function sessionJobTitle(session: InterviewSession): string {
  const stored = session.jobTitle?.trim();
  // Don't use raw URLs as display titles
  if (stored && !/^https?:\/\//i.test(stored)) return stored;
  const firstLine = session.job.trim().split("\n")[0]?.trim().slice(0, 60);
  if (firstLine && !/^https?:\/\//i.test(firstLine)) return firstLine;
  return "Target Job";
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

type PromotionSupportData = {
  portfolioSummary: string;
  topImpact: string;
  revenueGrowth: string[];
  efficiency: string[];
  leadership: string[];
  emailSubject: string;
  emailBody: string;
  verifiedCount: number;
};

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
  const { user } = useUser();
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [impactEntries, setImpactEntries] = useState<ImpactEntry[]>([]);
  const [lens, setLens] = useState<ArchiveLens>("sessions");
  const [ledgerRange, setLedgerRange] = useState<LedgerRange>("90d");
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [totalIp, setTotalIp] = useState(0);
  const [managerName, setManagerName] = useState("");
  const [promotionSupport, setPromotionSupport] = useState<PromotionSupportData | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setHistory(loadInterviewHistory(userId));
      setImpactEntries(loadImpactEntries(userId));
      setTotalIp(loadIP());
      setHydrated(true);
    });
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const changed = await backfillLegacySessionTitles(userId);
      if (!cancelled && changed > 0) {
        queueMicrotask(() => {
          setHistory(loadInterviewHistory(userId));
        });
      }
    })();

    return () => {
      cancelled = true;
    };
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
  const userRank = getTierByIP(totalIp).title;
  const promotionSupportAccess = getPromotionSupportAccess(totalIp, user?.publicMetadata);
  const promotionSupportUnlocked = promotionSupportAccess.unlocked;
  const streakDays = loadStreakState().streakDays;
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Hirely Coach Professional";

  async function generatePromotionSupport() {
    if (!promotionSupportUnlocked) {
      setPromotionMessage(promotionSupportAccess.detail);
      return;
    }

    setPromotionLoading(true);
    setPromotionMessage("");
    try {
      const res = await fetch("/api/impact-ledger/promotion-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managerName, totalIp }),
      });
      const data = (await res.json()) as PromotionSupportData & { error?: string };
      if (!res.ok) {
        setPromotionSupport(null);
        setPromotionMessage(data.error || "Could not generate promotion support.");
        return;
      }
      setPromotionSupport(data);
      setPromotionMessage("Promotion support generated.");
    } catch {
      setPromotionMessage("Could not generate promotion support.");
    } finally {
      setPromotionLoading(false);
    }
  }

  async function copyPromotionSupport() {
    if (!promotionSupport) return;
    const payload = [
      `Executive Impact Summary: ${userName}`,
      `Key Milestone: Successfully reached ${userRank} Rank in the Hirely Performance System.`,
      `Top Impact: ${promotionSupport.topImpact}`,
      `Consistency: Maintained a ${streakDays}-day high-performance streak with ${totalIp} total points earned.`,
      "",
      promotionSupport.emailSubject,
      "",
      promotionSupport.emailBody,
    ].join("\n");

    await navigator.clipboard.writeText(payload);
    setPromotionMessage("Promotion support copied to clipboard.");
  }

  async function downloadPromotionSupportPdf() {
    if (!promotionSupport) return;
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default ?? jsPDFModule.jsPDF;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 44;
    let y = 52;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(`Executive Impact Summary: ${userName}`, margin, y);
    y += 24;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Key Milestone: Successfully reached ${userRank} Rank in the Hirely Performance System.`, margin, y);
    y += 16;
    pdf.text(`Consistency: Maintained a ${streakDays}-day high-performance streak with ${totalIp} total points earned.`, margin, y);
    y += 24;

    const sections = [
      ["Portfolio Summary", [promotionSupport.portfolioSummary]],
      ["Revenue / Growth", promotionSupport.revenueGrowth],
      ["Efficiency", promotionSupport.efficiency],
      ["Leadership", promotionSupport.leadership],
      ["Promotion Email Subject", [promotionSupport.emailSubject]],
      ["Promotion Email", [promotionSupport.emailBody]],
    ] as const;

    for (const [title, lines] of sections) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(title, margin, y);
      y += 14;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      for (const line of lines) {
        const chunks = pdf.splitTextToSize(title === "Promotion Email" ? line : `• ${line}`, pageWidth - margin * 2);
        pdf.text(chunks, margin, y);
        y += chunks.length * 12 + 6;
        if (y > 760) {
          pdf.addPage();
          y = 52;
        }
      }
      y += 8;
    }

    pdf.save(`hirely-promotion-support-${Date.now()}.pdf`);
    setPromotionMessage("Promotion support downloaded as PDF.");
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
          <>
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
              <button className="lp-btn-ghost" type="button" onClick={() => router.push("/growthhub")}>
                GrowthHub
              </button>
            </div>

            <section className="glass-card anim-fade-up anim-fade-up--d2 archive-promo-shell">
              <div className="archive-promo-head">
                <div>
                  <p className="archive-promo-label">Promotion Support</p>
                  <h2 className="archive-promo-title">Performance Portfolio and Promotion Email</h2>
                  <p className="archive-promo-sub">
                    Generate an executive-ready portfolio and promotion request from your verified impact wins.
                  </p>
                </div>
                <span className={`archive-promo-rank${promotionSupportUnlocked ? " is-open" : ""}`}>
                  {userRank}
                </span>
              </div>

              {promotionSupportUnlocked ? (
                <>
                  <div className="archive-promo-controls">
                    <input
                      className="archive-input"
                      type="text"
                      value={managerName}
                      onChange={(event) => setManagerName(event.target.value)}
                      placeholder="Manager name (optional)"
                    />
                    <button className="lp-btn-primary" type="button" onClick={generatePromotionSupport} disabled={promotionLoading}>
                      {promotionLoading ? "Generating..." : "Generate Promotion Support"}
                    </button>
                    <button className="lp-btn-ghost" type="button" onClick={copyPromotionSupport} disabled={!promotionSupport}>
                      Copy to Clipboard
                    </button>
                    <button className="lp-btn-ghost" type="button" onClick={downloadPromotionSupportPdf} disabled={!promotionSupport}>
                      Download as PDF
                    </button>
                  </div>

                  {promotionMessage && <p className="archive-export-msg">{promotionMessage}</p>}

                  {promotionSupport && (
                    <div className="archive-promo-grid">
                      <div className="archive-promo-panel">
                        <p className="archive-promo-panel-label">The Portfolio</p>
                        <h3 className="archive-promo-panel-title">Executive Impact Summary: {userName}</h3>
                        <p className="archive-promo-copy">Key Milestone: Successfully reached {userRank} Rank in the Hirely Performance System.</p>
                        <p className="archive-promo-copy">Top Impact: {promotionSupport.topImpact}</p>
                        <p className="archive-promo-copy">Consistency: Maintained a {streakDays}-day high-performance streak with {totalIp} total points earned.</p>
                        <p className="archive-promo-section">Portfolio Summary</p>
                        <p className="archive-promo-copy">{promotionSupport.portfolioSummary}</p>
                        <p className="archive-promo-section">Revenue / Growth</p>
                        <ul className="archive-promo-list">
                          {promotionSupport.revenueGrowth.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                        <p className="archive-promo-section">Efficiency</p>
                        <ul className="archive-promo-list">
                          {promotionSupport.efficiency.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                        <p className="archive-promo-section">Leadership</p>
                        <ul className="archive-promo-list">
                          {promotionSupport.leadership.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>

                      <div className="archive-promo-panel">
                        <p className="archive-promo-panel-label">The Draft Email</p>
                        <h3 className="archive-promo-panel-title">Subject: {promotionSupport.emailSubject}</h3>
                        <p className="archive-promo-copy archive-promo-copy--email">{promotionSupport.emailBody}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="archive-promo-locked">
                  <p className="archive-promo-locked-title">Locked</p>
                  <p className="archive-promo-copy">{promotionSupportAccess.detail}</p>
                </div>
              )}
            </section>
          </>
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
                        <button
                          key={entry.id}
                          type="button"
                          className={`archive-ledger-entry ${selectedEntryId === entry.id ? "is-active" : ""}`}
                          onClick={() => setSelectedEntryId(entry.id)}
                        >
                          <span>{formatLedgerDate(entry.createdAt)}</span>
                          <strong>{entry.action.slice(0, 64)}</strong>
                        </button>
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
