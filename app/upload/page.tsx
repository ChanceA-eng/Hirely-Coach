"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import mammoth from "mammoth";
import { useAuth } from "@clerk/nextjs";
import { loadImpactEntries, type ImpactEntry } from "@/app/lib/impactLog";
import {
  cleanResumeText,
  type AtsCompatibility,
  type ResumeAuditReport,
} from "@/app/lib/resumeAudit";
import {
  awardResumeScanForUniqueFile,
  awardSuggestionAccepted,
  getProgressMeta,
  loadIP,
  saveBaselineResumeScore,
} from "@/app/lib/progression";
import {
  clearSavedResume,
  loadSavedResume,
  saveSavedResume,
} from "@/app/lib/resumeStorage";
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
  cacheVersion?: number;
  updatedAt: number;
};

type RuntimeConfig = {
  resumeCacheVersion: number;
};

type FastAuditReport = {
  overallScore: number;
  overallGrade: ResumeAuditReport["overallGrade"];
  metrics: ResumeAuditReport["metrics"];
  impactScore: number;
  atsCompatibility: AtsCompatibility;
  scoreDiagnostics: ResumeAuditReport["scoreDiagnostics"];
  keywords: string[];
  phase?: "fast";
  cached?: boolean;
  durationMs?: number;
};

function buildFastReport(fast: FastAuditReport, previous: ResumeAuditReport | null): ResumeAuditReport {
  return {
    overallScore: Number(fast.overallScore || previous?.overallScore || 0),
    metrics: {
      language: Number(fast.metrics?.language || previous?.metrics.language || 1),
      structure: Number(fast.metrics?.structure || previous?.metrics.structure || 1),
      layout: Number(fast.metrics?.layout || previous?.metrics.layout || 1),
    },
    impactScore: Number(fast.impactScore || previous?.impactScore || 1),
    overallGrade: fast.overallGrade || previous?.overallGrade || "Needs Work",
    coachSummary: previous?.coachSummary || "Detailed analysis is loading...",
    logSuggestions: previous?.logSuggestions || "",
    topAdvice: previous?.topAdvice || "Fast-pass complete. Deeper recommendations are loading.",
    criticalFixes: previous?.criticalFixes || [],
    optimizations: previous?.optimizations || [],
    suggestedPowerVerbs: previous?.suggestedPowerVerbs || fast.keywords || [],
    xyzAudit: previous?.xyzAudit || [],
    detailedSwaps: previous?.detailedSwaps || [],
    cleanUp: previous?.cleanUp || [],
    sentenceSwaps: previous?.sentenceSwaps || [],
    thingsToRemove: previous?.thingsToRemove || [],
    missingProof: previous?.missingProof || "",
    atsCompatibility: fast.atsCompatibility || previous?.atsCompatibility || "Low",
    scoreDiagnostics: fast.scoreDiagnostics || previous?.scoreDiagnostics || [],
  };
}

const OPTIMIZER_STATE_KEY_PREFIX = "hirely.optimizer.state.v1";
const OPTIMIZER_HIGHSCORE_KEY = "hirely.optimizer.highscore.v1";
const CANVAS_DRAFT_KEY = "hirely.canvas.draft.v1";

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

function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(OPTIMIZER_HIGHSCORE_KEY) || "0");
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function maybeSaveHighScore(score: number): number {
  const current = loadHighScore();
  const next = Math.max(current, Math.max(0, Math.floor(score)));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(OPTIMIZER_HIGHSCORE_KEY, String(next));
  }
  return next;
}

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch("/api/runtime-config");
    if (!res.ok) return { resumeCacheVersion: 1 };
    const data = (await res.json()) as RuntimeConfig;
    return {
      resumeCacheVersion: Number(data.resumeCacheVersion || 1),
    };
  } catch {
    return { resumeCacheVersion: 1 };
  }
}

async function fetchServerImpactEntries(): Promise<ImpactEntry[]> {
  try {
    const res = await fetch("/api/user/impact-ledger");
    if (!res.ok) return [];
    const data = (await res.json()) as { entries?: ImpactEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch {
    return [];
  }
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
  const router = useRouter();
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
  const [deepLoading, setDeepLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScanKey, setLastScanKey] = useState("");
  const [cacheVersion, setCacheVersion] = useState(1);
  const [ip, setIp] = useState(0);
  const [rewardFlash, setRewardFlash] = useState("");
  const [highScore, setHighScore] = useState(0);
  const [acceptedSuggestionTokens, setAcceptedSuggestionTokens] = useState<Record<string, true>>({});
  const [usingPrefilledResume, setUsingPrefilledResume] = useState(false);
  const [recentCutoffTs, setRecentCutoffTs] = useState(
    () => Date.now() - 90 * 24 * 60 * 60 * 1000
  );

  async function saveResumeToInterviewProfile(text: string, name: string) {
    if (!userId || !text.trim()) return;
    try {
      await fetch("/api/user/interview-setup-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentResumeName: name || "Saved resume",
          currentResumeText: text,
          currentResumeUrl: "",
        }),
      });
    } catch {
      // Non-blocking save
    }
  }

  const refreshImpactEntries = useCallback(async () => {
    const cutoffTs = Date.now() - 90 * 24 * 60 * 60 * 1000;
    setRecentCutoffTs(cutoffTs);
    const localEntries = loadImpactEntries(userId);
    if (!userId) {
      setImpactEntries(localEntries);
      return localEntries;
    }

    const serverEntries = await fetchServerImpactEntries();
    const merged = [...serverEntries, ...localEntries]
      .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 40);
    setImpactEntries(merged);
    return merged;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const runtime = await fetchRuntimeConfig();
      if (cancelled) return;

      setCacheVersion(runtime.resumeCacheVersion);
      setIp(loadIP());
      setHighScore(loadHighScore());
      await refreshImpactEntries();

      const persisted = loadPersistedOptimizerState(userId);
      if (persisted && (persisted.cacheVersion || 1) !== runtime.resumeCacheVersion) {
        clearPersistedOptimizerState(userId);
        return;
      }

      if (persisted) {
        setResumeText(persisted.resumeText);
        setFileName(persisted.fileName);
        setReport(persisted.report);
        setScanCount(persisted.scanCount || 0);
        setLastScanKey(persisted.scanKey || "");
        setScoreDelta(null);
        return;
      }

      if (userId) {
        const savedResume = loadSavedResume();
        if (savedResume?.text?.trim()) {
          setResumeText(cleanResumeText(savedResume.text));
          setFileName(savedResume.fileName || "Saved resume");
          setUsingPrefilledResume(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshImpactEntries]);

  useEffect(() => {
    function onFocus() {
      void refreshImpactEntries();
    }

    function onStorage(event: StorageEvent) {
      if (!event.key || !event.key.includes("hirelyImpactLog")) return;
      void refreshImpactEntries();
    }

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshImpactEntries]);

  useEffect(() => {
    if (!isScanning) {
      queueMicrotask(() => setScanProgress(0));
      return;
    }

    queueMicrotask(() => setScanProgress(12));
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
      setUsingPrefilledResume(false);
      setReport(null);
      setScanCount(0);
      setLastScanKey("");
      setScoreDelta(null);
      if (userId && cleaned) {
        saveSavedResume({ text: cleaned, fileName: file.name });
        await saveResumeToInterviewProfile(cleaned, file.name);
      }
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
    const latestImpactEntries = await refreshImpactEntries();
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
      setScanCount((count) => {
        const nextCount = count + 1;
        savePersistedOptimizerState(userId, {
          resumeText: cleaned,
          fileName: activeFileName,
          report,
          scanCount: nextCount,
          fileHash: hashText(cleaned),
          scanKey: nextScanKey,
          cacheVersion,
          updatedAt: Date.now(),
        });
        return nextCount;
      });
      setIsScanning(false);
      return;
    }

    try {
      const fileHash = hashText(cleaned);
      let rewardsGranted = false;
      const applyScoreRewards = (score: number) => {
        if (rewardsGranted) return;
        rewardsGranted = true;
        saveBaselineResumeScore(score);
        const scanReward = awardResumeScanForUniqueFile(fileHash, cleaned.length);
        if (scanReward.awarded) {
          setIp(scanReward.ip);
          setRewardFlash("+10 IP (Unique file scanned)");
          window.setTimeout(() => setRewardFlash(""), 2200);
        } else if (scanReward.reason) {
          setRewardFlash(scanReward.reason);
          window.setTimeout(() => setRewardFlash(""), 3000);
        }
      };

      const payload = {
        resumeText: cleaned,
        fileName: activeFileName,
        impactEntries: recentEntriesForScan,
        scanKey: nextScanKey,
      };

      const fastPromise = fetch("/api/resume-audit?phase=fast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const deepPromise = fetch("/api/resume-audit?phase=deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let fastReport: ResumeAuditReport | null = null;
      const fastRes = await fastPromise;
      const fastData = (await fastRes.json()) as FastAuditReport | { error?: string };
      if (fastRes.ok) {
        fastReport = buildFastReport(fastData as FastAuditReport, report);
        setReport(fastReport);
        setDeepLoading(true);
        setScanProgress(58);
        setScoreDelta(previousScore === null ? null : fastReport.overallScore - previousScore);
        setHighScore(maybeSaveHighScore(fastReport.overallScore));
        applyScoreRewards(fastReport.overallScore);
      }

      const deepRes = await deepPromise;
      const deepData = (await deepRes.json()) as ResumeAuditReport | { error?: string };
      if (!deepRes.ok && !fastReport) {
        setError((deepData as { error?: string }).error || "Resume scan failed.");
        setDeepLoading(false);
        return;
      }

      const finalReport = deepRes.ok ? (deepData as ResumeAuditReport) : fastReport;
      if (!finalReport) {
        setError("Resume scan failed.");
        setDeepLoading(false);
        return;
      }

      setReport(finalReport);
      setDeepLoading(false);
      setFileName(activeFileName);
      setResumeText(cleaned);
      if (userId && cleaned) {
        saveSavedResume({ text: cleaned, fileName: activeFileName || "Saved resume" });
        await saveResumeToInterviewProfile(cleaned, activeFileName || "Saved resume");
      }
      setLastScanKey(nextScanKey);
      setScanProgress(100);

      setScanCount((count) => {
        const nextCount = count + 1;
        savePersistedOptimizerState(userId, {
          resumeText: cleaned,
          fileName: activeFileName,
          report: finalReport,
          scanCount: nextCount,
          fileHash,
          scanKey: nextScanKey,
          cacheVersion,
          updatedAt: Date.now(),
        });
        return nextCount;
      });

      if (userId) {
        await fetch("/api/user/resume-audit-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            overallScore: finalReport.overallScore,
            fileName: activeFileName,
            updatedAt: Date.now(),
          }),
        });
      }

      // If fast-pass failed but deep succeeded, still apply score/IP rewards now.
      applyScoreRewards(finalReport.overallScore);

      if (!deepRes.ok) {
        setError("Fast scores loaded. Detailed feedback is temporarily delayed.");
      }
    } catch {
      setError("Unable to reach the audit service. Please try again.");
      setDeepLoading(false);
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

  const removePrefilledResume = () => {
    clearSavedResume();
    if (userId) {
      void fetch("/api/user/interview-setup-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentResumeName: "",
          currentResumeText: "",
          currentResumeUrl: "",
        }),
      });
    }
    clearPersistedOptimizerState(userId);
    setResumeText("");
    setFileName("");
    setUsingPrefilledResume(false);
    setReport(null);
    setScanCount(0);
    setScoreDelta(null);
    setError("");
    setLastScanKey("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
  const progressMeta = getProgressMeta(ip);
  const activeSwaps = report?.detailedSwaps.length ? report.detailedSwaps : [];
  const activeCleanUp = report?.cleanUp.length ? report.cleanUp : [];
  const diagnosticsByMetric = new Map(
    (report?.scoreDiagnostics || []).map((entry) => [entry.metric, entry])
  );
  const recentImpactEntries = impactEntries.filter((entry) => entry.createdAt >= recentCutoffTs);
  const duplicateMap = new Map<string, number>();
  for (const entry of recentImpactEntries) {
    const key = `${normalizeText(entry.action)}|${normalizeText(entry.result)}`;
    duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
  }

  const acceptSuggestion = (token: string) => {
    const reward = awardSuggestionAccepted(token);
    if (reward.awarded) {
      setIp(reward.ip);
      setRewardFlash("+10 IP (Suggestion applied)");
      window.setTimeout(() => setRewardFlash(""), 2200);
      setAcceptedSuggestionTokens((prev) => ({ ...prev, [token]: true }));
    }
  };

  const openCanvasWithDraft = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CANVAS_DRAFT_KEY,
        JSON.stringify({
          resumeText: cleanResumeText(resumeText),
          source: "optimizer",
          updatedAt: Date.now(),
        })
      );
    }
    router.push("/canvas");
  };

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
                Scan your resume, design your armor in Canvas, then pressure-test it in Final Boss sims.
              </p>
              <div className={styles.heroControls}>
                <button
                  type="button"
                  className={styles.drawerBtn}
                  onClick={() => {
                    void refreshImpactEntries();
                    setDrawerOpen(true);
                  }}
                >
                  My Impact Log
                </button>
                <span className={styles.heroMeta}>
                  {impactEntries.length} saved win{impactEntries.length === 1 ? "" : "s"} • {ip} IP • {progressMeta.tier.title}
                </span>
                {rewardFlash && <span className={styles.rewardFlash}>{rewardFlash}</span>}
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
            <h2 className={styles.sectionTitle}>1) Scan and Design</h2>

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
              {usingPrefilledResume && (
                <button
                  type="button"
                  onClick={removePrefilledResume}
                  className={styles.secondaryBtn}
                  disabled={isParsing || isScanning}
                >
                  Remove Prefilled Resume
                </button>
              )}
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
              {report && (
                <span className={styles.highScoreBadge}>
                  High Score: {Math.max(highScore, report.overallScore)}
                </span>
              )}
            </div>

            <div className={styles.canvasCtaRow}>
              <p className={styles.canvasCtaText}>
                Moving from reading to designing: open Hirely Canvas to architect your resume blocks.
              </p>
              <button type="button" className={styles.canvasCtaBtn} onClick={openCanvasWithDraft}>
                Fix in Canvas
              </button>
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

            <p className={styles.hint}>
              When your design is ready, enter the Tactical Arena and test it against Final Boss personas.
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
                    {report.metrics.language < 8 && (
                      <p className={styles.metricCriticalFlaw}>
                        Critical Flaw: {diagnosticsByMetric.get("Clarity")?.critical_flaw || "Language is too vague and weakens recruiter confidence."}
                      </p>
                    )}
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Story Flow</p>
                    <p className={styles.metricValue}>{report.metrics.structure}/10</p>
                    {report.metrics.structure < 8 && (
                      <p className={styles.metricCriticalFlaw}>
                        Critical Flaw: {diagnosticsByMetric.get("Storyflow")?.critical_flaw || "Career progression is unclear and timeline context is missing."}
                      </p>
                    )}
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Scanability</p>
                    <p className={styles.metricValue}>{report.metrics.layout}/10</p>
                    {report.metrics.layout < 8 && (
                      <p className={styles.metricCriticalFlaw}>
                        Critical Flaw: {diagnosticsByMetric.get("Scanability")?.critical_flaw || "Dense formatting slows recruiter scan speed and hides achievements."}
                      </p>
                    )}
                  </div>
                  <div className={styles.metric}>
                    <p className={styles.metricLabel}>Proof Strength</p>
                    <p className={styles.metricValue}>{report.impactScore}/10</p>
                    {report.impactScore < 8 && (
                      <p className={styles.metricCriticalFlaw}>
                        Critical Flaw: {diagnosticsByMetric.get("Strength")?.critical_flaw || "Bullets lack specific quantified outcomes and ownership."}
                      </p>
                    )}
                  </div>
                </div>

                <p className={styles.ats}>
                  Coach Grade
                  <span className={styles.gradeBadge}>{report.overallGrade}</span>
                </p>

                {deepLoading && (
                  <p className={styles.deepLoadingHint}>Fast-pass scores ready. Loading deep feedback...</p>
                )}

                <div className={deepLoading ? styles.deepPending : styles.deepReady}>
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
                      <button
                        type="button"
                        className={styles.acceptBtn}
                        onClick={() => acceptSuggestion(`xyz:${audit.powerSuggestion}`)}
                        disabled={Boolean(acceptedSuggestionTokens[`xyz:${audit.powerSuggestion}`])}
                      >
                        {acceptedSuggestionTokens[`xyz:${audit.powerSuggestion}`]
                          ? "Applied"
                          : "Apply Suggestion (+10 IP)"}
                      </button>
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
                      <button
                        type="button"
                        className={styles.acceptBtn}
                        onClick={() => acceptSuggestion(`swap:${swap.tryThis}`)}
                        disabled={Boolean(acceptedSuggestionTokens[`swap:${swap.tryThis}`])}
                      >
                        {acceptedSuggestionTokens[`swap:${swap.tryThis}`]
                          ? "Applied"
                          : "Apply Rewrite (+10 IP)"}
                      </button>
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
