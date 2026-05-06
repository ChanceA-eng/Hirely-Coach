"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { loadImpactEntries } from "../lib/impactLog";
import { getProgressMeta, loadIP } from "../lib/progression";
import type { ProgressTier } from "../lib/progression";
import {
  buildCourseGateSignals,
  COURSE_CATALOG,
  getCourseLevelAccess,
  loadCompletedCourses,
  loadResumeOptimizerSignals,
} from "./data";
import "./page.css";

const LEVEL_SEQUENCE: ProgressTier["title"][] = [
  "Novice",
  "Apprentice",
  "Candidate",
  "Expert",
  "Executive",
  "Advanced",
  "Master",
];

export default function AcademyPage() {
  const { userId } = useAuth();
  const [ip, setIp] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [keywordMatchScore, setKeywordMatchScore] = useState(0);
  const [impactfulBulletsSaved, setImpactfulBulletsSaved] = useState(0);
  const [hasRunScan, setHasRunScan] = useState(false);
  const [creativeExecutiveWinMet, setCreativeExecutiveWinMet] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIp(loadIP());
      const done = loadCompletedCourses();
      setCompleted(done);
      const signals = loadResumeOptimizerSignals(userId);
      setHasRunScan(signals.hasRunScan);
      setKeywordMatchScore(signals.keywordMatchScore);
      setImpactfulBulletsSaved(signals.impactfulBulletsSaved);
      const entries = loadImpactEntries(userId);
      const hasCreativeWin = entries.some((entry) => {
        const combined = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
        const hasCreativeSignal = /creative\s+solution|creative|innovation|workaround|first\s*principles|inversion/.test(combined);
        const hasKpiSignal = /kpi|key\s+performance\s+indicator|\$\d|\d+%|\d+\s*(hours|days|weeks|months|clients|tickets|users|revenue|cost)/.test(combined);
        const hasCoachUpgradeSignal = /hc|ai\s*coach|upgraded\s+by\s+coach|coach\s+upgrade/.test(combined);
        return hasCreativeSignal && hasKpiSignal && hasCoachUpgradeSignal;
      });
      setCreativeExecutiveWinMet(hasCreativeWin);
      setHydrated(true);
    });
  }, [userId]);

  const progressMeta = getProgressMeta(ip);
  const gateSignals = buildCourseGateSignals(completed, userId);
  const { access, candidateGateMet, levelGateDetails } = getCourseLevelAccess(ip, gateSignals);

  return (
    <div className="lp-root">
      <main className="ac-root">
        <Link href="/growthhub" className="gh-back-link" style={{ marginBottom: 16 }}>
          ← GrowthHub
        </Link>

        {/* ── IP Banner ── */}
        <section className="xp-banner glass-card ac-xp-banner">
          <div className="xp-banner-left">
            <span className="xp-level-badge">IP</span>
            <div>
              <div className="xp-title">{progressMeta.tier.title}</div>
              <div className="xp-sub">
                {ip} IP total
                {progressMeta.nextTier
                  ? ` · ${progressMeta.remainingToNext} IP to ${progressMeta.nextTier.title}`
                  : " · Master tier reached"}
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

        {/* ── Header ── */}
        <div className="ac-header">
          <p className="ac-eyebrow">Hirely Academy</p>
          <h1 className="ac-h1">Professional Course Catalog</h1>
          <p className="ac-sub">
            Structured coursework engineered to build interview mastery, career strategy, and
            executive-level communication. Courses unlock as you level up.
          </p>
          {!candidateGateMet && (
            <p className="ac-sub" style={{ marginTop: 8 }}>
              Candidate gate pending: score 80+ on a Behavioral Simulation.
            </p>
          )}
        </div>

        {/* ── Course Groups ── */}
        {LEVEL_SEQUENCE.map((level, groupIdx) => {
          const courses = COURSE_CATALOG.filter((course) => course.level === level);
          if (!courses.length) return null;
          const isUnlocked = access.get(level) ?? false;
          const completedInLevel = courses.filter((course) => completed.has(course.id)).length;
          const levelProgressPct = courses.length ? Math.round((completedInLevel / courses.length) * 100) : 0;
          const levelGateLabel = isUnlocked
            ? "Unlocked"
            : levelGateDetails.get(level) || `Reach ${level} and required IP to unlock.`;
          return (
            <div key={level}>
              {groupIdx > 0 && <div className="ac-divider" />}
              <section className={`ac-level-group ac-level-group--${level.toLowerCase()}`}>
                <div className="ac-level-shell glass-card">
                  <span className="ac-level-orb" aria-hidden="true" />
                  <div className="ac-level-heading">
                    <div>
                      <span className="ac-level-label">Level Track</span>
                      <h2 className="ac-level-title">{level}</h2>
                    </div>
                    <span className={`ac-level-badge${isUnlocked ? " ac-level-badge--unlocked" : ""}`}>
                      {isUnlocked ? "✓" : "🔒"} {isUnlocked ? "Open" : "Locked"}
                    </span>
                  </div>
                  <p className="ac-level-copy">{levelGateLabel}</p>
                  <div className="ac-level-progress" aria-label={`${level} completion progress`}>
                    <div className="ac-level-progress-head">
                      <span>Lessons completed</span>
                      <span>{completedInLevel}/{courses.length}</span>
                    </div>
                    <div className="ac-level-progress-track">
                      <span className="ac-level-progress-fill" style={{ width: `${levelProgressPct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="ac-grid">
                  {courses.map((course) => {
                    const prerequisiteMet = !course.prerequisiteCourseId || completed.has(course.prerequisiteCourseId);
                    const canOpen = isUnlocked && prerequisiteMet;
                    const isDone = hydrated && completed.has(course.id);
                    const isAtsCourse = course.id === "advanced-keyword-optimization";
                    const atsInProgress =
                      isAtsCourse &&
                      (!hasRunScan || keywordMatchScore < (course.completionGate?.minScore || 60)) &&
                      !isDone;
                    const creativeGateInProgress =
                      course.id === "workplace-problem-solving" &&
                      !creativeExecutiveWinMet &&
                      !isDone;

                    let lockLabel = levelGateDetails.get(course.level) || `Reach ${course.level} and required IP to unlock.`;
                    if (isUnlocked && !prerequisiteMet && course.prerequisiteCourseId === "star-101") {
                      lockLabel = "Complete STAR Method 101 first";
                    }

                    return (
                      <article
                        key={course.id}
                        className={`ac-card${canOpen ? " ac-card--unlocked" : " ac-card--locked"}${course.level === "Apprentice" ? " ac-card--apprentice" : ""}${course.level === "Candidate" ? " ac-card--candidate" : ""}${course.level === "Executive" ? " ac-card--executive" : ""}`}
                      >
                        {!canOpen && (
                          <span className="ac-lock-icon" aria-hidden="true">🔒</span>
                        )}
                        <div className="ac-card-top">
                          <span className="ac-card-track">{course.track}</span>
                          {course.level === "Executive" && (
                            <span className="ac-masterclass-badge">✶ Signature</span>
                          )}
                          {isDone && (
                            <span className="ac-card-completed-badge">Certified ✓</span>
                          )}
                        </div>
                        <h2 className="ac-card-title">{course.title}</h2>
                        <p className="ac-card-summary">{course.summary}</p>
                        <div className="ac-card-meta">
                          <span className="ac-card-time">⏱ {course.readingMins} min read</span>
                          <span className="ac-card-level-pill">{course.level}</span>
                        </div>
                        {course.level === "Candidate" && (
                          <div className="ac-bullet-progress" aria-label="Impactful bullet progress">
                            <div className="ac-bullet-progress-head">
                              <span>Impactful Bullets Saved</span>
                              <span>{impactfulBulletsSaved} / 12</span>
                            </div>
                            <div className="ac-bullet-progress-track">
                              <span
                                className="ac-bullet-progress-fill"
                                style={{ width: `${Math.min(100, Math.round((impactfulBulletsSaved / 12) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {atsInProgress && (
                          <p className="ac-card-progress-note">
                            In Progress: Run Resume Optimizer scan and reach Keyword Match Score 60%+ (current: {hasRunScan ? `${keywordMatchScore}%` : "not scanned"}).
                          </p>
                        )}
                        {creativeGateInProgress && (
                          <p className="ac-card-progress-note ac-card-progress-note--executive">
                            Masterclass Gate: Log one Creative Solution win upgraded by HC (Hirely Coach) with a KPI (Key Performance Indicator) in Impact Ledger.
                          </p>
                        )}
                        {canOpen ? (
                          <Link
                            href={`/courses/${course.id}`}
                            className={`ac-btn-start${isDone ? " ac-btn-review" : ""}`}
                          >
                            {isDone ? "Review Course →" : atsInProgress || creativeGateInProgress ? "Continue Course →" : "Start Course →"}
                          </Link>
                        ) : (
                          <span className="ac-btn-locked" title={lockLabel}>
                            🔒 {lockLabel}
                          </span>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          );
        })}
      </main>
    </div>
  );
}
