"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import mammoth from "mammoth";
import { useAuth } from "@clerk/nextjs";
import { loadImpactEntries, type ImpactEntry } from "@/app/lib/impactLog";
import {
  cleanResumeText,
  type AtsCompatibility,
  type ResumeAuditReport,
} from "@/app/lib/resumeAudit";
import styles from "./page.module.css";

type PdfTextContent = { items: Array<{ str?: string }> };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (index: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};
type PdfJsWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib; pdfjs?: PdfJsLib };
type PersistedOptimizerState = {
  resumeText: string;
  fileName: string;
  report: ResumeAuditReport;
  scanCount: number;
  fileHash: string;
  scanKey?: string;
  updatedAt: number;
};

const OPTIMIZER_STATE_KEY_PREFIX = "hirely.optimizer.state.v1";

function optimizerStateKey(userId: string | null | undefined): string {
  return `${OPTIMIZER_STATE_KEY_PREFIX}:${userId ?? "guest"}`;
}

function hashText(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function loadPersistedOptimizerState(
  userId: string | null | undefined
): PersistedOptimizerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(optimizerStateKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedOptimizerState;
    if (!parsed?.resumeText || !parsed?.report) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePersistedOptimizerState(
  userId: string | null | undefined,
  state: PersistedOptimizerState
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(optimizerStateKey(userId), JSON.stringify(state));
}

function clearPersistedOptimizerState(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(optimizerStateKey(userId));
}

function scoreTone(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

function toneStyles(score: number): { borderColor: string; color: string; background: string } {
  const tone = scoreTone(score);
  if (tone === "good") {
    return { borderColor: "#10b981", color: "#a7f3d0", background: "rgba(16, 185, 129, 0.14)" };
  }
  if (tone === "warn") {
    return { borderColor: "#f59e0b", color: "#fde68a", background: "rgba(245, 158, 11, 0.12)" };
  }
  return { borderColor: "#f43f5e", color: "#fecdd3", background: "rgba(244, 63, 94, 0.12)" };
}

function deltaClassName(delta: number | null): string {
  if (delta === null || delta === 0) return styles.deltaNeutral;
  return delta > 0 ? styles.deltaUp : styles.deltaDown;
}

function atsClassName(value: AtsCompatibility): string {
  if (value === "High") return `${styles.badge} ${styles.high}`;
  if (value === "Medium") return `${styles.badge} ${styles.medium}`;
  return `${styles.badge} ${styles.low}`;
}

function formatImpactEntry(entry: ImpactEntry): string {
  return `Action: ${entry.action}\nProof: ${entry.proof}\nResult: ${entry.result}`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function OptimizerSignalIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 8H29L37 16V40H12V8Z" />
      <path d="M29 8V16H37" />
      <path d="M18 22H28" />
      <path d="M18 28H27" />
      <path d="M18 34H24" />
      <path d="M31 24C33.5 24 35.5 22 35.5 19.5" />
      <path d="M31 28C35.7 28 39.5 24.2 39.5 19.5" />
      <circle cx="31" cy="19.5" r="1.4" />
    </svg>
  );
}

export default function UploadPage() {
  const { userId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState("");
  const [impactEntries, setImpactEntries] = useState<ImpactEntry[]>([]);
  const [report, setReport] = useState<ResumeAuditReport | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanKey, setLastScanKey] = useState("");

  useEffect(() => {
    setImpactEntries(loadImpactEntries(userId));

    const persisted = loadPersistedOptimizerState(userId);
    if (persisted) {
      setResumeText(persisted.resumeText);
      setFileName(persisted.fileName);
      setReport(persisted.report);
      setScanCount(persisted.scanCount || 0);
      setLastScanKey(persisted.scanKey || "");
      setScoreDelta(null);
    }
  }, [userId]);

  useEffect(() => {
    if (!isScanning) {
      setScanProgress(0);
      return;
    }

    setScanProgress(12);
    const id = window.setInterval(() => {
      setScanProgress((value) => (value >= 90 ? value : value + 6));
    }, 180);

    return () => window.clearInterval(id);
  }, [isScanning]);

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
      await new Promise((resolve) => {
        script.onload = resolve;
      });
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

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item) => item.str || "").join(" ") + "\n";
    }

    return text;
  };

  const readDOCXFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError("");

    try {
      let extracted = "";
      if (file.type === "text/plain") {
        extracted = await readTextFile(file);
      } else if (file.type === "application/pdf") {
        extracted = await readPDFFile(file);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        extracted = await readDOCXFile(file);
      } else if (file.type === "application/msword") {
        setError("DOC files are not supported. Please convert to DOCX.");
        return;
      } else {
        setError("Unsupported file type. Please upload PDF, DOCX, or TXT.");
        return;
      }

      const cleaned = cleanResumeText(extracted);
      clearPersistedOptimizerState(userId);
      setResumeText(cleaned);
      setFileName(file.name);
      setReport(null);
      setScanCount(0);
      setLastScanKey("");
      setScoreDelta(null);
      await scanResume(cleaned, file.name);
    } catch {
      setError("Unable to read the file. Please try a different file.");
    } finally {
      setIsParsing(false);
    }
  };

  const scanResume = async (resumeOverride?: string, fileNameOverride?: string) => {
    const cleaned = cleanResumeText(resumeOverride ?? resumeText);
    const activeFileName = fileNameOverride ?? fileName;
    if (!cleaned) {
      setError("Upload a resume file or paste resume text before scanning.");
      return;
    }

    setIsScanning(true);
    setError("");

    const previousScore = report?.overallScore ?? null;
    const latestImpactEntries = loadImpactEntries(userId);
    setImpactEntries(latestImpactEntries);
    const recentEntriesForScan = latestImpactEntries.filter(
      (entry) => entry.createdAt >= Date.now() - 90 * 24 * 60 * 60 * 1000
    );
    const impactSignature = hashText(
      JSON.stringify(
        recentEntriesForScan
          .map((entry) => ({
            createdAt: entry.createdAt,
            action: normalizeText(entry.action),
            proof: normalizeText(entry.proof),
            result: normalizeText(entry.result),
          }))
          .sort((a, b) => a.createdAt - b.createdAt)
      )
    );
    const nextScanKey = `${hashText(cleaned)}:${impactSignature}`;

    if (report && lastScanKey === nextScanKey) {
      setScoreDelta(0);
      setScanCount((count) => count + 1);
      return;
    }

    try {
      const res = await fetch("/api/resume-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: cleaned,
          fileName: activeFileName,
          impactEntries: recentEntriesForScan,
        }),
      });

      const data = (await res.json()) as ResumeAuditReport | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error || "Resume scan failed.");
        return;
      }

      const nextReport = data as ResumeAuditReport;
      setReport(nextReport);
      setFileName(activeFileName);
      setResumeText(cleaned);
      setLastScanKey(nextScanKey);
      setScanProgress(100);
      const fileHash = hashText(cleaned);
      setScanCount((count) => {
        const nextCount = count + 1;
        savePersistedOptimizerState(userId, {
          resumeText: cleaned,
          fileName: activeFileName,
          report: nextReport,
          scanCount: nextCount,
          fileHash,
          scanKey: nextScanKey,
          updatedAt: Date.now(),
        });
        return nextCount;
      });
      setScoreDelta(
        previousScore === null ? null : nextReport.overallScore - previousScore
      );
    } catch {
      setError("Unable to reach the audit service. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const startNewResumeScan = () => {
    clearPersistedOptimizerState(userId);
    setResumeText("");
    setFileName("");
    setReport(null);
    setScanCount(0);
    setScoreDelta(null);
    setError("");
    setLastScanKey("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const copyImpactEntry = async (entry: ImpactEntry) => {
    try {
      await navigator.clipboard.writeText(formatImpactEntry(entry));
      setCopiedEntryId(entry.id);
      window.setTimeout(() => setCopiedEntryId(""), 1800);
    } catch {
      setError("Unable to copy the Impact Log entry right now.");
    }
  };

  const currentTone = toneStyles(report?.overallScore ?? 0);
  const activeSwaps = report?.detailedSwaps.length ? report.detailedSwaps : [];
  const activeCleanUp = report?.cleanUp.length ? report.cleanUp : [];
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const recentImpactEntries = impactEntries.filter((entry) => entry.createdAt >= ninetyDaysAgo);
  const duplicateMap = new Map<string, number>();
  for (const entry of recentImpactEntries) {
    const key = `${normalizeText(entry.action)}|${normalizeText(entry.result)}`;
    duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {userId && <Link href="/growthhub" className="gh-back-link">← GrowthHub</Link>}

        <motion.section
          className={styles.hero}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className={styles.heroRow}>
            <div>
              <p className={styles.kicker}>Resume Optimizer</p>
              <h1 className={styles.title}>Instant Resume Optimization Engine</h1>
              <p className={styles.subtitle}>
                Upload, scan, improve, and re-scan. Every click runs a fresh audit and shows
                whether your score moved.
              </p>
              <div className={styles.heroControls}>
                <button
                  type="button"
                  className={styles.drawerBtn}
                  onClick={() => setDrawerOpen(true)}
                >
                  My Impact Log
                </button>
                <span className={styles.heroMeta}>
                  {impactEntries.length} saved win{impactEntries.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className={styles.signalOrb} aria-hidden="true">
              <div className={styles.signalIconWrap}>
                <OptimizerSignalIcon />
              </div>
              <span className={styles.signalPulse} />
            </div>
          </div>
        </motion.section>

        <section className={styles.grid}>
          <motion.article
            className={styles.card}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
          >
            <h2 className={styles.sectionTitle}>1) Intake and Edit</h2>

            <div className={styles.uploadRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleResumeUpload}
                className={styles.fileInput}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.secondaryBtn}
                disabled={isParsing || isScanning}
              >
                {isParsing ? "Parsing..." : "Upload PDF/DOCX/TXT"}
              </button>

              {fileName && <span className={styles.filePill}>{fileName}</span>}
            </div>

            <p className={styles.hint}>
              The ingestor extracts text first, then the optimizer applies recruiter-grade
              scoring, evidence checks, and bullet-level rewrites.
            </p>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Your extracted resume text appears here. You can edit before re-scanning."
              className={styles.textarea}
            />

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.actionRow}>
              <button
                type="button"
                onClick={startNewResumeScan}
                className={styles.secondaryBtn}
                disabled={isParsing || isScanning}
              >
                Scan New Resume
              </button>

              <button
                type="button"
                onClick={() => scanResume()}
                className={styles.primaryBtn}
                disabled={isParsing || isScanning || !resumeText.trim()}
              >
                {isScanning ? "Scanning..." : report ? "Re-Scan Resume" : "Scan Resume"}
              </button>

              {report && (
                <button
                  type="button"
                  onClick={() => scanResume()}
                  className={styles.secondaryBtn}
                  disabled={isParsing || isScanning || !resumeText.trim()}
                >
                  Re-sync with Ledger
                </button>
              )}

              <span className={`${styles.delta} ${deltaClassName(scoreDelta)}`}>
                {report
                  ? scoreDelta === null
                    ? `Scan #${scanCount}`
                    : scoreDelta > 0
                      ? `+${scoreDelta} points this scan`
                      : scoreDelta < 0
                        ? `${scoreDelta} points this scan`
                        : "No score change"
                  : "Ready for first scan"}
              </span>
            </div>

            {isScanning && (
              <div className={styles.scanProgress} aria-live="polite">
                <p className={styles.scanProgressLabel}>Reading your impact...</p>
                <div className={styles.scanProgressTrack}>
                  <span
                    className={styles.scanProgressFill}
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            <p className={styles.hint}>
              See how recruiters will view your experience.
            </p>
          </motion.article>

          <motion.article
            className={styles.card}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16, ease: "easeOut" }}
          >
            <h2 className={styles.sectionTitle}>2) Report Card</h2>

            {!report && (
              <p className={styles.hint}>
                Run your first scan to generate the global score, survival metrics, task list,
                and power-verb suggestions.
              </p>
            )}

            {report && (
              <div className={styles.scorePanel}>
                <div className={styles.scoreHero}>
                  <div className={styles.scoreCircle} style={currentTone}>
                    {report.overallScore}
                  </div>
                  <div className={styles.scoreMeta}>
                    <p>Global Score (0-100)</p>
                    <p>
                      {report.overallScore >= 70
                        ? "Strong survivability. Keep polishing precision."
                        : report.overallScore >= 50
                          ? "Borderline. Prioritize critical fixes first."
                          : "At-risk profile. Fix high-priority gaps before applying."}
                    </p>
                  </div>
                </div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Clarity</p>
                    <p className={styles.metricValue}>{report.metrics.language}/10</p>
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Story Flow</p>
                    <p className={styles.metricValue}>{report.metrics.structure}/10</p>
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Scanability</p>
                    <p className={styles.metricValue}>{report.metrics.layout}/10</p>
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Proof Strength</p>
                    <p className={styles.metricValue}>{report.impactScore}/10</p>
                  </div>
                </div>

                <p className={styles.ats}>
                  Coach Grade
                  <span className={styles.gradeBadge}>{report.overallGrade}</span>
                </p>

                <div className={styles.hcPanel}>
                  <div className={styles.hcHeader}>
                    <span className={styles.hcBadge}>HC</span>
                    <div>
                      <p className={styles.hcTitle}>Hirely Coach Insight</p>
                      <p className={styles.hcSub}>How recruiters in Tucson will read this experience</p>
                    </div>
                  </div>
                  <p className={styles.topAdvice}>{report.coachSummary || report.topAdvice}</p>
                  {report.logSuggestions && (
                    <p className={styles.hcLogSuggestion}>{report.logSuggestions}</p>
                  )}
                </div>

                <p className={styles.ats}>
                  Recruiter Scan Readiness
                  <span className={atsClassName(report.atsCompatibility)}>
                    {report.atsCompatibility}
                  </span>
                </p>

                <div className={styles.taskColumns}>
                  <div className={`${styles.taskBox} ${styles.taskRed}`}>
                    <p className={styles.taskTitle}>Critical Fixes</p>
                    <ul className={styles.taskList}>
                      {(report.criticalFixes.length
                        ? report.criticalFixes
                        : ["No critical blockers found."]
                      ).map((item, index) => (
                        <li key={`critical-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={`${styles.taskBox} ${styles.taskYellow}`}>
                    <p className={styles.taskTitle}>Optimizations</p>
                    <ul className={styles.taskList}>
                      {(report.optimizations.length
                        ? report.optimizations
                        : ["No optimization suggestions returned."]
                      ).map((item, index) => (
                        <li key={`optimization-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <p className={styles.taskTitle}>Suggested Power Verbs</p>
                  <div className={styles.verbList}>
                    {(report.suggestedPowerVerbs.length
                      ? report.suggestedPowerVerbs
                      : ["orchestrated", "streamlined", "accelerated", "influenced", "executed"]
                    ).map((verb, index) => (
                      <span key={`verb-${index}`} className={styles.verbChip}>
                        {verb}
                      </span>
                    ))}
                  </div>
                </div>

                <div className={styles.xyzPanel}>
                  <p className={styles.taskTitle}>Impact Breakdown (3 Weakest Experience Bullets)</p>
                  {(report.xyzAudit.length ? report.xyzAudit : []).map((audit, index) => (
                    <article key={`xyz-${index}`} className={styles.xyzItem}>
                      <p className={styles.xyzLabel}>Current Bullet</p>
                      <p className={styles.xyzCurrent}>{audit.currentBullet}</p>

                      <div className={styles.xyzBreakdown}>
                        <div className={styles.xyzLine}>
                          <span>Result:</span>
                          <p>{audit.formulaBreakdown.x}</p>
                        </div>
                        <div className={styles.xyzLine}>
                          <span>Proof:</span>
                          <p>{audit.formulaBreakdown.y}</p>
                        </div>
                        <div className={styles.xyzLine}>
                          <span>Action:</span>
                          <p>{audit.formulaBreakdown.z}</p>
                        </div>
                      </div>

                      <p className={styles.xyzLabel}>Power Suggestion</p>
                      <p className={styles.xyzPower}>{audit.powerSuggestion}</p>
                    </article>
                  ))}
                </div>

                <div className={styles.coachPanel}>
                  <p className={styles.taskTitle}>Before and After Fixes</p>
                  {(activeSwaps.length
                    ? activeSwaps
                    : report.sentenceSwaps.map((swap) => ({
                        youSaid: swap.youSaid,
                        tryThis: swap.tryThis,
                        reason: swap.theReason,
                      }))
                  ).map((swap, index) => (
                    <article key={`swap-${index}`} className={styles.swapItem}>
                      <p className={styles.xyzLabel}>You Said</p>
                      <p className={styles.swapBefore}>{swap.youSaid}</p>
                      <p className={styles.xyzLabel}>Try This</p>
                      <p className={styles.swapAfter}>{swap.tryThis}</p>
                      <p className={styles.xyzLabel}>Why This Is Better</p>
                      <p className={styles.swapReason}>{swap.reason}</p>
                    </article>
                  ))}
                </div>

                <div className={styles.taskColumns}>
                  <div className={`${styles.taskBox} ${styles.taskRed}`}>
                    <p className={styles.taskTitle}>Clean Up</p>
                    <ul className={styles.taskList}>
                      {(activeCleanUp.length
                        ? activeCleanUp.map((item) => `${item.issue} — ${item.suggestion}`)
                        : report.thingsToRemove.length
                          ? report.thingsToRemove.map((item) => `${item.phrase} — ${item.why}`)
                        : ["No clutter items returned."]
                      ).map((item, index) => (
                        <li key={`remove-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className={`${styles.taskBox} ${styles.taskYellow}`}>
                    <p className={styles.taskTitle}>Impact Log Suggestions</p>
                    <p className={styles.missingProof}>
                      {report.logSuggestions || report.missingProof || "No Impact Log suggestions returned."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.article>
        </section>

        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.button
                type="button"
                className={styles.drawerBackdrop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
                aria-label="Close Impact Log drawer"
              />
              <motion.aside
                className={styles.drawer}
                initial={{ x: 420, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 420, opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div className={styles.drawerHeader}>
                  <div>
                    <p className={styles.kicker}>My Impact Log</p>
                    <h2 className={styles.drawerTitle}>Saved Wins</h2>
                  </div>
                  <button
                    type="button"
                    className={styles.drawerClose}
                    onClick={() => setDrawerOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div className={styles.drawerBody}>
                  <p className={styles.drawerHint}>
                    Showing your recent wins from the Archive. Use these to add proof to your resume.
                  </p>

                  {recentImpactEntries.length === 0 ? (
                    <p className={styles.hint}>
                      Log wins in GrowthHub and they will appear here for quick copy and paste.
                    </p>
                  ) : (
                    recentImpactEntries.map((entry) => {
                      const duplicateKey = `${normalizeText(entry.action)}|${normalizeText(entry.result)}`;
                      const isDuplicate = (duplicateMap.get(duplicateKey) || 0) > 1;
                      return (
                      <article key={entry.id} className={styles.drawerEntry}>
                        <p className={styles.drawerDate}>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                        {isDuplicate && <p className={styles.duplicateFlag}>Possible duplicate win</p>}
                        <p className={styles.drawerLabel}>Action</p>
                        <p className={styles.drawerText}>{entry.action}</p>
                        <p className={styles.drawerLabel}>Proof</p>
                        <p className={styles.drawerText}>{entry.proof}</p>
                        <p className={styles.drawerLabel}>Result</p>
                        <p className={styles.drawerText}>{entry.result}</p>
                        <button
                          type="button"
                          className={styles.secondaryBtn}
                          onClick={() => copyImpactEntry(entry)}
                        >
                          {copiedEntryId === entry.id ? "Copied" : "Copy"}
                        </button>
                      </article>
                    )})
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
