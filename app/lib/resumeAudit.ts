export type AtsCompatibility = "High" | "Medium" | "Low";

export type XyzAuditItem = {
  currentBullet: string;
  formulaBreakdown: {
    x: string;
    y: string;
    z: string;
  };
  powerSuggestion: string;
};

export type SentenceSwapItem = {
  youSaid: string;
  tryThis: string;
  theReason: string;
};

export type RemovalItem = {
  phrase: string;
  why: string;
};

export type CoachSwapItem = {
  youSaid: string;
  tryThis: string;
  reason: string;
};

export type CleanUpItem = {
  issue: string;
  suggestion: string;
};

export type OverallGrade = "Needs Work" | "Good" | "Elite";

export type ResumeAuditReport = {
  overallScore: number;
  metrics: {
    language: number;
    structure: number;
    layout: number;
  };
  impactScore: number;
  overallGrade: OverallGrade;
  coachSummary: string;
  logSuggestions: string;
  topAdvice: string;
  criticalFixes: string[];
  optimizations: string[];
  suggestedPowerVerbs: string[];
  xyzAudit: XyzAuditItem[];
  detailedSwaps: CoachSwapItem[];
  cleanUp: CleanUpItem[];
  sentenceSwaps: SentenceSwapItem[];
  thingsToRemove: RemovalItem[];
  missingProof: string;
  atsCompatibility: AtsCompatibility;
};

export function cleanResumeText(rawText: string): string {
  return String(rawText)
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF\uFFFD]/g, "")
    .replace(/[•▪◦●▶►➤]/g, "-")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function clampScore(value: unknown, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeAtsCompatibility(value: unknown): AtsCompatibility {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  return "Low";
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeXyzAudit(value: unknown): XyzAuditItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const breakdown = (row.formulaBreakdown ?? {}) as Record<string, unknown>;

      return {
        currentBullet: String(row.currentBullet || "").trim(),
        formulaBreakdown: {
          x: String(breakdown.x || "").trim(),
          y: String(breakdown.y || "").trim(),
          z: String(breakdown.z || "").trim(),
        },
        powerSuggestion: String(row.powerSuggestion || "").trim(),
      };
    })
    .filter(
      (row) =>
        row.currentBullet &&
        row.formulaBreakdown.x &&
        row.formulaBreakdown.y &&
        row.formulaBreakdown.z &&
        row.powerSuggestion
    )
    .slice(0, 3);
}

function normalizeOverallGrade(value: unknown): OverallGrade {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "elite") return "Elite";
  if (normalized === "good") return "Good";
  return "Needs Work";
}

function normalizeSentenceSwaps(value: unknown): SentenceSwapItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        youSaid: String(row.youSaid || "").trim(),
        tryThis: String(row.tryThis || "").trim(),
        theReason: String(row.theReason || "").trim(),
      };
    })
    .filter((row) => row.youSaid && row.tryThis && row.theReason)
    .slice(0, 6);
}

function normalizeDetailedSwaps(value: unknown): CoachSwapItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        youSaid: String(row.youSaid || "").trim(),
        tryThis: String(row.tryThis || "").trim(),
        reason: String(row.reason || "").trim(),
      };
    })
    .filter((row) => row.youSaid && row.tryThis && row.reason)
    .slice(0, 6);
}

function normalizeThingsToRemove(value: unknown): RemovalItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        phrase: String(row.phrase || "").trim(),
        why: String(row.why || "").trim(),
      };
    })
    .filter((row) => row.phrase && row.why)
    .slice(0, 6);
}

function normalizeCleanUp(value: unknown): CleanUpItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      return {
        issue: String(row.issue || "").trim(),
        suggestion: String(row.suggestion || "").trim(),
      };
    })
    .filter((row) => row.issue && row.suggestion)
    .slice(0, 6);
}

export function normalizeResumeAuditReport(payload: unknown): ResumeAuditReport {
  const source = (payload ?? {}) as Record<string, unknown>;
  const metrics = (source.metrics ?? {}) as Record<string, unknown>;
  const criticalFixes = normalizeList(source.criticalFixes);
  const optimizations = normalizeList(source.optimizations);
  const xyzAudit = normalizeXyzAudit(source.xyzAudit);
  const detailedSwaps = normalizeDetailedSwaps(source.detailedSwaps);
  const cleanUp = normalizeCleanUp(source.cleanUp);
  const sentenceSwaps = normalizeSentenceSwaps(source.sentenceSwaps).length
    ? normalizeSentenceSwaps(source.sentenceSwaps)
    : detailedSwaps.map((swap) => ({
        youSaid: swap.youSaid,
        tryThis: swap.tryThis,
        theReason: swap.reason,
      }));
  const thingsToRemove = normalizeThingsToRemove(source.thingsToRemove).length
    ? normalizeThingsToRemove(source.thingsToRemove)
    : cleanUp.map((item) => ({
        phrase: item.issue,
        why: item.suggestion,
      }));
  const coachSummary = String(source.coachSummary || "").trim();
  const logSuggestions = String(source.logSuggestions || "").trim();
  const topAdvice = String(source.topAdvice || "").trim();
  const missingProof = String(source.missingProof || logSuggestions || "").trim();

  const hasCorrections =
    criticalFixes.length > 0 ||
    optimizations.length > 0 ||
    xyzAudit.length > 0 ||
    detailedSwaps.length > 0 ||
    cleanUp.length > 0 ||
    sentenceSwaps.length > 0 ||
    thingsToRemove.length > 0 ||
    Boolean(missingProof);

  let overallScore = clampScore(source.overallScore, 0, 100);
  const normalizedMetrics = {
    language: clampScore(metrics.language, 1, 10),
    structure: clampScore(metrics.structure, 1, 10),
    layout: clampScore(metrics.layout, 1, 10),
  };
  let impactScore = clampScore(source.impactScore, 1, 10);

  if (hasCorrections) {
    overallScore = Math.min(overallScore, 95);
    normalizedMetrics.language = Math.min(normalizedMetrics.language, 9);
    normalizedMetrics.structure = Math.min(normalizedMetrics.structure, 9);
    normalizedMetrics.layout = Math.min(normalizedMetrics.layout, 9);
    impactScore = Math.min(impactScore, 9);
  }

  return {
    overallScore,
    metrics: normalizedMetrics,
    impactScore,
    overallGrade: normalizeOverallGrade(source.overallGrade),
    coachSummary,
    logSuggestions,
    topAdvice,
    criticalFixes,
    optimizations,
    suggestedPowerVerbs: normalizeList(source.suggestedPowerVerbs).slice(0, 5),
    xyzAudit,
    detailedSwaps,
    cleanUp,
    sentenceSwaps,
    thingsToRemove,
    missingProof,
    atsCompatibility: normalizeAtsCompatibility(source.atsCompatibility),
  };
}
