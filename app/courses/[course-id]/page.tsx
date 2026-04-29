"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { loadImpactEntries } from "../../lib/impactLog";
import { loadIP, getProgressMeta, addIP } from "../../lib/progression";
import {
  buildCourseGateSignals,
  getCourseLevelAccess,
  getCourse,
  loadCompletedCourses,
  loadNegotiationSimSignals,
  loadResumeOptimizerSignals,
  markCourseComplete,
  type CourseEntry,
  type QuizOption,
} from "../data";
import "./page.css";

const COURSE_IP_REWARD = 20;
const COURSE_IP_KEY_PREFIX = "hirely.courses.ipAwarded.";
const MASTERY_UNLOCK_KEY = "hirely.mastery.unlocked.v1";
const MASTERY_EVENT_PENDING_KEY = "hirely.mastery.event.pending.v1";

function hasLoggedWinWithNumber(userId?: string | null): boolean {
  const entries = loadImpactEntries(userId);
  return entries.some((e) => /\d/.test(e.result) || /\d/.test(e.action));
}

function hasCreativeKpiUpgradedWin(userId?: string | null): boolean {
  const entries = loadImpactEntries(userId);
  return entries.some((entry) => {
    const combined = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
    const hasCreativeSignal = /creative\s+solution|creative|innovation|workaround|first\s*principles|inversion/.test(combined);
    const hasKpiSignal = /kpi|key\s+performance\s+indicator|\$\d|\d+%|\d+\s*(hours|days|weeks|months|clients|tickets|users|revenue|cost)/.test(combined);
    const hasCoachUpgradeSignal = /hc|ai\s*coach|upgraded\s+by\s+coach|coach\s+upgrade/.test(combined);
    return hasCreativeSignal && hasKpiSignal && hasCoachUpgradeSignal;
  });
}

function alreadyAwardedIp(courseId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(`${COURSE_IP_KEY_PREFIX}${courseId}`) === "1";
}

function markIpAwarded(courseId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${COURSE_IP_KEY_PREFIX}${courseId}`, "1");
}

/** Simple inline markdown renderer — bold (**text**), italic (*text*), newlines */
function renderMarkdown(text: string) {
  const annotateAbbreviations = (value: string, baseKey: string): (string | JSX.Element)[] => {
    const parts: (string | JSX.Element)[] = [];
    const remaining = value;
    let idx = 0;
    const pattern = /\b(ATS|JD|KPI|ROI|HC)\b/g;
    let match = pattern.exec(remaining);

    while (match) {
      const start = match.index;
      const token = match[1];
      if (start > idx) {
        parts.push(remaining.slice(idx, start));
      }
      const title =
        token === "ATS"
          ? "Applicant Tracking System"
          : token === "JD"
            ? "Job Description"
            : token === "KPI"
              ? "Key Performance Indicator"
              : token === "ROI"
                ? "Return on Investment"
                : "Hirely Coach";
      parts.push(
        <abbr key={`${baseKey}-${start}`} className="lesson-abbr" title={title}>
          {token}
        </abbr>
      );
      idx = start + token.length;
      match = pattern.exec(remaining);
    }

    if (idx < remaining.length) {
      parts.push(remaining.slice(idx));
    }
    return parts;
  };

  const lines = text.split("\n");
  return lines.map((line, li) => {
    const parts: (string | JSX.Element)[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const italicMatch = remaining.match(/\*([^*]+?)\*/);

      const boldIdx = boldMatch?.index ?? Infinity;
      const italicIdx = italicMatch?.index ?? Infinity;

      if (boldMatch && boldIdx <= italicIdx) {
        if (boldIdx > 0) parts.push(...annotateAbbreviations(remaining.slice(0, boldIdx), `t-${li}-${key}`));
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldIdx + boldMatch[0].length);
      } else if (italicMatch && italicIdx < Infinity) {
        if (italicIdx > 0) parts.push(...annotateAbbreviations(remaining.slice(0, italicIdx), `t-${li}-${key}`));
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicIdx + italicMatch[0].length);
      } else {
        parts.push(...annotateAbbreviations(remaining, `t-${li}-${key}`));
        break;
      }
    }

    return (
      <span key={li}>
        {parts}
        {li < lines.length - 1 && <br />}
      </span>
    );
  });
}

type QuizState = {
  selected: number | null;
  submitted: boolean;
  passed: boolean;
};

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const courseId = typeof params["course-id"] === "string" ? params["course-id"] : "";

  const [course, setCourse] = useState<CourseEntry | null>(null);
  const [ip, setIp] = useState(0);
  const [quizStates, setQuizStates] = useState<QuizState[]>([]);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [starGateBlocked, setStarGateBlocked] = useState(false);
  const [resumeGateBlocked, setResumeGateBlocked] = useState(false);
  const [resumeGateMessage, setResumeGateMessage] = useState("");
  const [creativeGateBlocked, setCreativeGateBlocked] = useState(false);
  const [creativeGateMessage, setCreativeGateMessage] = useState("");
  const [negotiationGateBlocked, setNegotiationGateBlocked] = useState(false);
  const [negotiationGateMessage, setNegotiationGateMessage] = useState("");
  const [systemMapNodes, setSystemMapNodes] = useState<string[]>([
    "Bottleneck",
    "Owner",
    "KPI",
    "Feedback Loop",
  ]);
  const [completionMessage, setCompletionMessage] = useState("");
  const [lockedReason, setLockedReason] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const found = getCourse(courseId);
    if (!found) return;

    queueMicrotask(() => {
      setCourse(found);
      const currentIp = loadIP();
      setIp(currentIp);
      setQuizStates(found.content.quiz.map(() => ({ selected: null, submitted: false, passed: false })));
      const done = loadCompletedCourses();
      const optimizerSignals = loadResumeOptimizerSignals(userId);
      const gateSignals = buildCourseGateSignals(done, userId);
      const { access, levelGateDetails } = getCourseLevelAccess(currentIp, gateSignals);
      const levelUnlocked = access.get(found.level) ?? false;

      if (!levelUnlocked) {
        setLockedReason(levelGateDetails.get(found.level) || `Reach ${found.level} and required IP to unlock.`);
      } else if (found.prerequisiteCourseId && !done.has(found.prerequisiteCourseId)) {
        setLockedReason("Complete STAR Method 101 before opening this course.");
      } else {
        setLockedReason("");
      }

      setAlreadyCompleted(done.has(courseId));
      if (courseId === "star-101") {
        setStarGateBlocked(!hasLoggedWinWithNumber(userId));
      }

      if (found.completionGate?.type === "resume-scan-min-score") {
        const minScore = found.completionGate.minScore ?? 60;
        const hasScan = optimizerSignals.hasRunScan;
        const score = optimizerSignals.keywordMatchScore;
        const blocked = !hasScan || score < minScore;
        setResumeGateBlocked(blocked);
        if (!hasScan) {
          setResumeGateMessage(
            `To certify this course, run a Resume Optimizer scan first. Required ${found.completionGate.scoreLabel}: ${minScore}%+.`
          );
        } else if (score < minScore) {
          setResumeGateMessage(
            `Course remains in progress: ${found.completionGate.scoreLabel} is ${score}%. Reach ${minScore}%+ in Resume Optimizer to complete.`
          );
        } else {
          setResumeGateMessage("");
        }
      } else {
        setResumeGateBlocked(false);
        setResumeGateMessage("");
      }

      if (found.completionGate?.type === "creative-impact-win") {
        const met = hasCreativeKpiUpgradedWin(userId);
        setCreativeGateBlocked(!met);
        setCreativeGateMessage(
          met
            ? ""
            : "To certify this course, log one Creative Solution win in the Impact Ledger and include an HC (Hirely Coach) upgraded KPI (Key Performance Indicator)."
        );
      } else {
        setCreativeGateBlocked(false);
        setCreativeGateMessage("");
      }

      if (found.completionGate?.type === "negotiation-sim-min-score") {
        const minScore = found.completionGate.minScore ?? 85;
        const negotiationSignals = loadNegotiationSimSignals();
        const score = negotiationSignals.bestValueCaptured;
        const blocked = score < minScore || !negotiationSignals.hasNegotiatorBadge;
        setNegotiationGateBlocked(blocked);
        if (blocked) {
          setNegotiationGateMessage(
            `To certify this course, enter the STARR Lab Negotiation Simulator and achieve ${found.completionGate.scoreLabel || "Value Captured"} ${minScore}%+ to earn the Negotiator badge (current: ${score}%).`
          );
        } else {
          setNegotiationGateMessage("");
        }
      } else {
        setNegotiationGateBlocked(false);
        setNegotiationGateMessage("");
      }

      setHydrated(true);
    });
  }, [courseId, userId]);

  const progressMeta = getProgressMeta(ip);

  const allQuizPassed =
    hydrated &&
    quizStates.length > 0 &&
    quizStates.every((q) => q.passed);

  const canComplete =
    allQuizPassed &&
    !starGateBlocked &&
    !resumeGateBlocked &&
    !creativeGateBlocked &&
    !negotiationGateBlocked;

  function selectOption(qIdx: number, oIdx: number) {
    if (quizStates[qIdx].submitted) return;
    setQuizStates((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, selected: oIdx } : q))
    );
  }

  function submitAnswer(qIdx: number) {
    const state = quizStates[qIdx];
    if (state.selected === null || state.submitted) return;
    const correct = course!.content.quiz[qIdx].options[state.selected].correct;
    setQuizStates((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, submitted: true, passed: correct } : q))
    );
  }

  function retryQuestion(qIdx: number) {
    setQuizStates((prev) =>
      prev.map((q, i) => (i === qIdx ? { selected: null, submitted: false, passed: false } : q))
    );
  }

  function completeCourse() {
    if (!course || !canComplete) return;
    markCourseComplete(course.id);
    let nextIp = loadIP();
    if (!alreadyAwardedIp(course.id)) {
      nextIp = addIP(COURSE_IP_REWARD);
      markIpAwarded(course.id);
    }

    if (course.id === "personal-brand-authority-model" && typeof window !== "undefined") {
      window.localStorage.setItem(MASTERY_UNLOCK_KEY, "1");
      window.localStorage.setItem(MASTERY_EVENT_PENDING_KEY, String(Date.now()));
    }

    const nextMeta = getProgressMeta(nextIp);
    setCompletionMessage(
      nextMeta.nextTier
        ? `+${COURSE_IP_REWARD} IP earned. You are ${nextMeta.remainingToNext} IP away from ${nextMeta.nextTier.title} level.`
        : course.id === "personal-brand-authority-model"
          ? `+${COURSE_IP_REWARD} IP earned. Mastery Event unlocked: you are now Hirely Coach Alumni / Master.`
          : `+${COURSE_IP_REWARD} IP earned. Master level reached.`
    );
    setAlreadyCompleted(true);
    setShowModal(true);
  }

  function addSystemNode(label: string) {
    const value = label.trim();
    if (!value) return;
    setSystemMapNodes((prev) => [...prev, value].slice(0, 12));
  }

  if (!hydrated) {
    return (
      <div className="lp-root">
        <main className="lesson-root">
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>Loading course…</p>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="lp-root">
        <main className="lesson-root">
          <p style={{ color: "#64748b", fontSize: "0.88rem" }}>Course not found.</p>
          <Link href="/courses" className="gh-back-link" style={{ marginTop: 12 }}>
            ← Back to Academy
          </Link>
        </main>
      </div>
    );
  }

  const toolLinks: Record<string, string> = {
    "The Simulator": "/voice?mode=new",
    "STARR Lab": "/starr-lab",
    "Resume Optimizer": "/upload",
    "System Mapping": "/courses",
    Archive: "/history",
    "Profile Hub": "/growthhub/profile",
  };
  const toolHref = toolLinks[course.targetTool] ?? "/growthhub";

  return (
    <div className="lp-root">
      <main className="lesson-root">
        <Link href="/courses" className="gh-back-link" style={{ marginBottom: 16 }}>
          ← Academy
        </Link>

        {/* ── IP Banner ── */}
        <section className="xp-banner glass-card" style={{ marginBottom: 28 }}>
          <div className="xp-banner-left">
            <span className="xp-level-badge">IP</span>
            <div>
              <div className="xp-title">{progressMeta.tier.title}</div>
              <div className="xp-sub">
                {ip} Impact Points (IP) total
                {progressMeta.nextTier
                  ? ` · ${progressMeta.remainingToNext} Impact Points (IP) to ${progressMeta.nextTier.title}`
                  : " · Expert tier reached"}
              </div>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-track">
              <div
                className="xp-bar-fill"
                style={{ width: `${Math.round(progressMeta.progressPct)}%` }}
              />
            </div>
            <span className="xp-pct">{Math.round(progressMeta.progressPct)}%</span>
          </div>
        </section>

        {lockedReason && (
          <div className="lesson-star-gate" style={{ marginBottom: 18 }}>
            {lockedReason}
          </div>
        )}

        {lockedReason ? (
          <>
            <Link href="/courses" className="lp-btn-primary" style={{ display: "inline-block" }}>
              Back to Academy
            </Link>
            <div style={{ height: 24 }} />
          </>
        ) : (
          <>

        {/* ── Header ── */}
        <div className={`lesson-header glass-card${course.level === "Executive" ? " lesson-header--executive" : ""}`} style={{ padding: "22px 26px", marginBottom: 24 }}>
          <p className="lesson-eyebrow">{course.track}</p>
          <h1 className="lesson-h1">{course.title}</h1>
          <div className="lesson-meta">
            <span className="lesson-meta-pill">⏱ {course.readingMins} min read</span>
            <span className="lesson-meta-pill">{course.level}</span>
            {alreadyCompleted && <span className="lesson-meta-pill" style={{ color: "#10b981" }}>✓ Certified</span>}
          </div>
          {course.level === "Executive" && (
            <span className="lesson-masterclass-signature">✶ Signature Masterclass</span>
          )}
        </div>

        {/* ── Executive Brief ── */}
        <div className="lesson-section">
          <p className="lesson-section-title">Executive Brief</p>
          <blockquote className="lesson-brief">
            {renderMarkdown(course.content.executiveBrief)}
          </blockquote>
        </div>

        {/* ── Strategic Playbook ── */}
        <div className="lesson-section">
          <p className="lesson-section-title">Strategic Playbook</p>
          <div className="lesson-playbook">
            {course.content.playbookItems.map((item, idx) => (
              <div key={idx} className="lesson-playbook-item">
                {renderMarkdown(item)}
              </div>
            ))}
          </div>
        </div>

        {course.id === "manager-comms" && (
          <div className="lesson-section">
            <p className="lesson-section-title">Salary Research Tool</p>
            <div className="lesson-star-gate" style={{ marginBottom: 0 }}>
              Use live market data to calculate your Market Anchor before compensation conversations.
              <Link
                href="https://www.levels.fyi/salaries"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#fbbf24", textDecoration: "underline", marginLeft: 6 }}
              >
                Open Salary Research Tool
              </Link>
            </div>
          </div>
        )}

        {course.level === "Expert" && (
          <div className="lesson-section">
            <p className="lesson-section-title">System Mapping Workspace</p>
            <div className="lesson-system-map">
              <p className="lesson-system-map-sub">
                Build your operating map. Drag priorities into your execution flow and save this model to use in interviews.
              </p>
              <div className="lesson-system-map-grid">
                <div
                  className="lesson-system-map-lane"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const value = event.dataTransfer.getData("text/plain");
                    addSystemNode(value);
                  }}
                >
                  <p>Node Library</p>
                  {systemMapNodes.map((node, idx) => (
                    <button
                      key={`${node}-${idx}`}
                      type="button"
                      className="lesson-system-pill"
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", node)}
                    >
                      {node}
                    </button>
                  ))}
                </div>
                <div
                  className="lesson-system-map-lane lesson-system-map-lane--target"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const value = event.dataTransfer.getData("text/plain");
                    addSystemNode(value);
                  }}
                >
                  <p>Execution Flow</p>
                  <div className="lesson-system-flow">
                    {systemMapNodes.slice(0, 6).map((node, idx) => (
                      <span key={`${node}-flow-${idx}`} className="lesson-system-pill lesson-system-pill--flow">
                        {idx + 1}. {node}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Quiz ── */}
        <div className="lesson-section">
          <p className="lesson-section-title">Check Your Logic</p>
          {course.content.quiz.map((question, qIdx) => {
            const state = quizStates[qIdx];
            return (
              <div key={qIdx} className="lesson-quiz">
                <p className="lesson-quiz-q">
                  <strong>Scenario:</strong> {question.scenario}
                </p>
                <div className="lesson-quiz-options">
                  {question.options.map((option: QuizOption, oIdx: number) => {
                    let optionClass = "lesson-quiz-option";
                    if (state.submitted) {
                      if (option.correct) optionClass += " lesson-quiz-option--correct";
                      else if (state.selected === oIdx) optionClass += " lesson-quiz-option--wrong";
                    } else if (state.selected === oIdx) {
                      optionClass += " lesson-quiz-option--selected";
                    }
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        className={optionClass}
                        disabled={state.submitted}
                        onClick={() => selectOption(qIdx, oIdx)}
                      >
                        <span className="lesson-quiz-label">{option.label}</span>
                        {option.text}
                      </button>
                    );
                  })}
                </div>

                {!state.submitted && state.selected !== null && (
                  <button
                    type="button"
                    className="ac-btn-start"
                    style={{ marginTop: 14, width: "auto", padding: "9px 18px" }}
                    onClick={() => submitAnswer(qIdx)}
                  >
                    Submit Answer
                  </button>
                )}

                {state.submitted && (
                  <div className={`lesson-quiz-feedback lesson-quiz-feedback--${state.passed ? "correct" : "wrong"}`}>
                    {state.passed
                      ? "✓ Correct — strong executive framing."
                      : "✗ Not quite. Review the playbook and try again."}
                  </div>
                )}

                {state.submitted && !state.passed && (
                  <button type="button" className="lesson-retry-btn" onClick={() => retryQuestion(qIdx)}>
                    ↺ Retry
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* ── STAR 101 gate ── */}
        {courseId === "star-101" && starGateBlocked && (
          <div className="lesson-star-gate">
            ⚠ To complete STAR Method 101, log at least one win in your{" "}
            <Link href="/history" style={{ color: "#fbbf24", textDecoration: "underline" }}>
              Impact Ledger
            </Link>{" "}
            that contains a measurable number in the result or action.
          </div>
        )}

        {resumeGateMessage && (
          <div className="lesson-star-gate">
            ⚠ {resumeGateMessage}{" "}
            <Link href="/upload" style={{ color: "#fbbf24", textDecoration: "underline" }}>
              Open Resume Optimizer
            </Link>
          </div>
        )}

        {creativeGateMessage && (
          <div className="lesson-star-gate">
            ⚠ {creativeGateMessage}{" "}
            <Link href="/history" style={{ color: "#fbbf24", textDecoration: "underline" }}>
              Open Impact Ledger
            </Link>
          </div>
        )}

        {negotiationGateMessage && (
          <div className="lesson-star-gate">
            ⚠ {negotiationGateMessage}{" "}
            <Link href="/starr-lab?moduleType=delivery&sim=negotiation" style={{ color: "#fbbf24", textDecoration: "underline" }}>
              Open Negotiation Simulator
            </Link>
          </div>
        )}

        {/* ── Complete Course ── */}
        {!alreadyCompleted ? (
          <button
            type="button"
            className="lesson-complete-btn"
            disabled={!canComplete}
            onClick={completeCourse}
          >
            {canComplete ? "Complete Course → Earn +20 Impact Points (IP)" : "Pass the quiz to complete this course"}
          </button>
        ) : (
          <div className="lesson-complete-btn lesson-complete-btn--done" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✓ Course Certified
          </div>
        )}

        <div style={{ height: 16 }} />
        <Link href="/courses" className="lp-btn-ghost" style={{ display: "inline-block", marginTop: 8 }}>
          ← Back to Academy
        </Link>
          </>
        )}
      </main>

      {/* ── Completion Modal ── */}
      {showModal && (
        <div className="lesson-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lesson-modal" onClick={(e) => e.stopPropagation()}>
            <span className="lesson-modal-icon">🏆</span>
            <h2 className="lesson-modal-title">Course Certified!</h2>
            <p className="lesson-modal-body">
              You&apos;ve mastered <strong>{course.title}</strong>. {completionMessage}
            </p>
            <Link href={toolHref} className="lesson-modal-cta">
              Go to {course.targetTool} →
            </Link>
            <button
              type="button"
              className="lesson-modal-back"
              onClick={() => {
                setShowModal(false);
                router.push("/courses");
              }}
            >
              Return to Academy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
