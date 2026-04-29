import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAllStarrTierConfigs, type StarrTierConfig, type StarrTierId } from "./hirelySupremacy";

export const HC_MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"] as const;

export type HcModelVersion = (typeof HC_MODEL_OPTIONS)[number];

export type StarrLabTierAdminConfig = StarrTierConfig & {
  silenceAnchorMs: number;
  interruptThresholdSeconds: number;
  multiPartSegments: number;
};

export type AcademyLessonAdminConfig = {
  tier: StarrTierId;
  title: string;
  description: string;
  videoId: string;
  logicCheck: string;
  ipReward: number;
  tierUnlockIpCost: number;
  prerequisiteTier: StarrTierId | null;
};

export type CanvasRegistryAdminConfig = {
  templates: string[];
  assetLibrary: string[];
  approvedPalettes: string[];
  approvedFontPairings: string[];
  minFontSizePt: number;
  minMarginInches: number;
};

export type ImpactLedgerVerbWeight = {
  verb: string;
  weight: number;
};

export type HcAdminConfig = {
  systemPrompt: string;
  temperature: number;
  model: HcModelVersion;
  resumeCacheVersion: number;
  starrLab: {
    tiers: Record<StarrTierId, StarrLabTierAdminConfig>;
  };
  academy: {
    lessons: AcademyLessonAdminConfig[];
  };
  canvas: CanvasRegistryAdminConfig;
  impactLedger: {
    powerVerbs: ImpactLedgerVerbWeight[];
  };
  updatedAt: number;
};

export const DEFAULT_SYSTEM_PROMPT = `ACTING ROLE: You are a high-stakes Recruiter. You review 500 resumes per day and are looking for reasons to REJECT a resume. Be strict, precise, and direct.

TASK: Audit the resume with a rejection-first mindset while still giving clear, simple, and encouraging rewrite guidance.
Scoring is a calculation, not an opinion. For the same exact input, produce the same score and same rubric reasoning.

CORE LOGIC GATE (MANDATORY):
1) Default to low score.
- Start every resume at 3/10 quality.
- Points must be earned with concrete evidence of results.
- If there are no numbers, no specific achievements, and poor grammar, overallScore cannot exceed 40.

2) Penalty system (apply hard penalties):
- Spelling or grammar error: -10 points per error.
- Cliche phrases (example: "hard worker", "motivated individual"): -5 points per instance.
- Vague statements (example: "responsible for", "helped with"): -10 points per instance.

3) Score bands:
- 0-30 (Weak): Contains typos, vague duties ("responsible for..."), or objective statements.
- 31-60 (Average): Clean layout but lacks proof (numbers/results). Sounds like a job description, not a list of wins.
- 61-85 (Strong): Uses active verbs and has at least 3-5 measurable results (example: "Saved 20% time").
- 86-100 (Elite): Perfect grammar, zero fluff, and every single bullet point shows a clear benefit to the employer.

4) Hard cap rule:
- If you find even one spelling error or a phrase like "I am a motivated individual", overallScore cannot be higher than 60.

SCORING CRITERIA:
- Language (33%): Active voice, strong verbs, and clarity.
- Structure (33%): Contact, Summary, Experience, Skills order and readability.
- Looks/Layout (34%): Human readability and ATS scannability.
- Impact score: Strength of measurable proof and outcomes.

XYZ METHODOLOGY (MANDATORY):
- For Language and Impact scoring, use Google XYZ: "Accomplished X as measured by Y, by doing Z".
- Identify the 3 weakest bullets in Experience.
- For each bullet, provide x, y, z breakdown and a rewritten powerSuggestion.

COACHING STYLE (MANDATORY):
- Avoid technical jargon.
- Use before-and-after style for rewrite suggestions.
- Be specific, actionable, and concise.
- Do not praise weak content.
- Never use the words "XYZ", "STAR", or "ATS" in user-facing feedback strings.

IMPACT LOG INTEGRATION:
- If ImpactEntries are provided, inspect them carefully.
- Identify a specific win from the log that would strengthen a weak part of the resume.
- Say so directly in logSuggestions and include the date, using this phrase pattern: "I found a win in your Ledger from [Date] that would fit here!"

OUTPUT FORMAT: Return valid JSON only. Do not include markdown, headings, wrapper text, or titles like "Resume Audit" in JSON values.
Use exactly these keys and no additional keys:
{
  "overallScore": 0,
  "overallGrade": "Needs Work / Good / Elite",
  "coachSummary": "Encouraging high-level advice.",
  "logSuggestions": "Personalized advice based on Impact Log history.",
  "topAdvice": "One main thing the user should fix first.",
  "metrics": {
    "language": 0,
    "structure": 0,
    "layout": 0
  },
  "impactScore": 0,
  "criticalFixes": ["list of highest-priority items"],
  "optimizations": ["list of improvements"],
  "suggestedPowerVerbs": ["list of 5 verbs to swap"],
  "detailedSwaps": [
    {
      "youSaid": "Original sentence from resume",
      "tryThis": "Better, high-impact version",
      "reason": "Why the second version is more professional."
    }
  ],
  "cleanUp": [
    {
      "issue": "Repetitive statement or cliche",
      "suggestion": "How to fix or remove it."
    }
  ],
  "xyzAudit": [
    {
      "currentBullet": "string",
      "formulaBreakdown": {
        "x": "string",
        "y": "string",
        "z": "string"
      },
      "powerSuggestion": "string"
    }
  ],
  "atsCompatibility": "High/Medium/Low"
}`;

function tierIds(): StarrTierId[] {
  return [1, 2, 3, 4, 5, 6, 7];
}

function defaultTierAdminConfig(base: StarrTierConfig): StarrLabTierAdminConfig {
  return {
    ...base,
    silenceAnchorMs: base.tier === 6 ? 8000 : 2000,
    interruptThresholdSeconds: 45,
    multiPartSegments: base.tier === 7 ? 3 : 0,
  };
}

function defaultLessonConfig(base: StarrTierConfig): AcademyLessonAdminConfig {
  return {
    tier: base.tier,
    title: `${base.title} Lesson`,
    description: `${base.scenarioTitle} focused on ${base.focusSkill.toLowerCase()}.`,
    videoId: "",
    logicCheck: `What proves ${base.persona.toLowerCase()} confidence in this tier?`,
    ipReward: 20,
    tierUnlockIpCost: base.tier * 100,
    prerequisiteTier: base.tier === 1 ? null : ((base.tier - 1) as StarrTierId),
  };
}

function defaultTierMap(): Record<StarrTierId, StarrLabTierAdminConfig> {
  return getAllStarrTierConfigs().reduce((accumulator, config) => {
    accumulator[config.tier] = defaultTierAdminConfig(config);
    return accumulator;
  }, {} as Record<StarrTierId, StarrLabTierAdminConfig>);
}

function defaultLessonList(): AcademyLessonAdminConfig[] {
  return getAllStarrTierConfigs().map((config) => defaultLessonConfig(config));
}

function defaultCanvasRegistry(): CanvasRegistryAdminConfig {
  return {
    templates: ["Creative", "Executive", "Modern"],
    assetLibrary: ["achievement-badge.svg", "metric-frame.png", "timeline-accent.svg"],
    approvedPalettes: ["#0f172a,#10b981,#e2e8f0", "#111827,#0ea5e9,#f8fafc"],
    approvedFontPairings: ["Sora + IBM Plex Sans", "Space Grotesk + Source Sans 3"],
    minFontSizePt: 10,
    minMarginInches: 0.5,
  };
}

function defaultImpactLedgerConfig(): { powerVerbs: ImpactLedgerVerbWeight[] } {
  return {
    powerVerbs: [
      { verb: "Spearheaded", weight: 5 },
      { verb: "Negotiated", weight: 4 },
      { verb: "Delivered", weight: 3 },
      { verb: "Scaled", weight: 4 },
      { verb: "Optimized", weight: 3 },
    ],
  };
}

export const DEFAULT_HC_ADMIN_CONFIG: HcAdminConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0,
  model: "gpt-4o-mini",
  resumeCacheVersion: 1,
  starrLab: {
    tiers: defaultTierMap(),
  },
  academy: {
    lessons: defaultLessonList(),
  },
  canvas: defaultCanvasRegistry(),
  impactLedger: defaultImpactLedgerConfig(),
  updatedAt: Date.now(),
};

function coerceModel(value: unknown): HcModelVersion {
  const candidate = String(value || "").trim();
  if (HC_MODEL_OPTIONS.includes(candidate as HcModelVersion)) {
    return candidate as HcModelVersion;
  }
  return DEFAULT_HC_ADMIN_CONFIG.model;
}

function coerceTemperature(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
}

function coercePositiveInt(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

function coerceMargin(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Number(numeric.toFixed(2));
}

function coerceTierId(value: unknown, fallback: StarrTierId): StarrTierId {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4 || numeric === 5 || numeric === 6 || numeric === 7) {
    return numeric;
  }
  return fallback;
}

function coerceStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
  return next.length ? next : fallback;
}

function normalizeTierAdminConfig(input: unknown, fallback: StarrLabTierAdminConfig): StarrLabTierAdminConfig {
  const row = (input ?? {}) as Partial<StarrLabTierAdminConfig>;
  return {
    tier: fallback.tier,
    title: String(row.title || fallback.title).trim() || fallback.title,
    scenarioTitle: String(row.scenarioTitle || fallback.scenarioTitle).trim() || fallback.scenarioTitle,
    persona: String(row.persona || fallback.persona).trim() || fallback.persona,
    questionCount: coercePositiveInt(row.questionCount, fallback.questionCount),
    systemPrompt: String(row.systemPrompt || fallback.systemPrompt).trim() || fallback.systemPrompt,
    focusSkill: String(row.focusSkill || fallback.focusSkill).trim() || fallback.focusSkill,
    temperature: coerceTemperature(row.temperature),
    presencePenalty: Number.isFinite(Number(row.presencePenalty)) ? Number(row.presencePenalty) : fallback.presencePenalty,
    silenceAnchorMs: coercePositiveInt(row.silenceAnchorMs, fallback.silenceAnchorMs),
    interruptThresholdSeconds: coercePositiveInt(row.interruptThresholdSeconds, fallback.interruptThresholdSeconds),
    multiPartSegments: Math.max(0, coercePositiveInt(row.multiPartSegments, fallback.multiPartSegments)),
  };
}

function normalizeLessonConfig(input: unknown, fallback: AcademyLessonAdminConfig): AcademyLessonAdminConfig {
  const row = (input ?? {}) as Partial<AcademyLessonAdminConfig>;
  return {
    tier: fallback.tier,
    title: String(row.title || fallback.title).trim() || fallback.title,
    description: String(row.description || fallback.description).trim() || fallback.description,
    videoId: String(row.videoId || fallback.videoId).trim(),
    logicCheck: String(row.logicCheck || fallback.logicCheck).trim() || fallback.logicCheck,
    ipReward: coercePositiveInt(row.ipReward, fallback.ipReward),
    tierUnlockIpCost: coercePositiveInt(row.tierUnlockIpCost, fallback.tierUnlockIpCost),
    prerequisiteTier:
      row.prerequisiteTier === null || row.prerequisiteTier === undefined
        ? fallback.prerequisiteTier
        : coerceTierId(row.prerequisiteTier, fallback.prerequisiteTier ?? 1),
  };
}

function normalizeCanvasRegistry(input: unknown, fallback: CanvasRegistryAdminConfig): CanvasRegistryAdminConfig {
  const row = (input ?? {}) as Partial<CanvasRegistryAdminConfig>;
  return {
    templates: coerceStringArray(row.templates, fallback.templates),
    assetLibrary: coerceStringArray(row.assetLibrary, fallback.assetLibrary),
    approvedPalettes: coerceStringArray(row.approvedPalettes, fallback.approvedPalettes),
    approvedFontPairings: coerceStringArray(row.approvedFontPairings, fallback.approvedFontPairings),
    minFontSizePt: coercePositiveInt(row.minFontSizePt, fallback.minFontSizePt),
    minMarginInches: coerceMargin(row.minMarginInches, fallback.minMarginInches),
  };
}

function normalizePowerVerbs(input: unknown, fallback: ImpactLedgerVerbWeight[]): ImpactLedgerVerbWeight[] {
  if (!Array.isArray(input)) return fallback;
  const next = input
    .map((entry) => {
      const row = (entry ?? {}) as Partial<ImpactLedgerVerbWeight>;
      const verb = String(row.verb || "").trim();
      const weight = Math.max(1, coercePositiveInt(row.weight, 1));
      return verb ? { verb, weight } : null;
    })
    .filter((entry): entry is ImpactLedgerVerbWeight => Boolean(entry));
  return next.length ? next : fallback;
}

export function normalizeHcAdminConfig(input: unknown): HcAdminConfig {
  const row = (input ?? {}) as Record<string, unknown>;
  const systemPrompt = String(row.systemPrompt || "").trim();
  const defaultTiers = DEFAULT_HC_ADMIN_CONFIG.starrLab.tiers;
  const tierRows = ((row.starrLab as { tiers?: Record<string, unknown> } | undefined)?.tiers ?? {}) as Record<string, unknown>;
  const normalizedTiers = tierIds().reduce((accumulator, tier) => {
    accumulator[tier] = normalizeTierAdminConfig(tierRows[tier], defaultTiers[tier]);
    return accumulator;
  }, {} as Record<StarrTierId, StarrLabTierAdminConfig>);

  const lessonRows = ((row.academy as { lessons?: unknown[] } | undefined)?.lessons ?? []) as unknown[];
  const defaultLessons = DEFAULT_HC_ADMIN_CONFIG.academy.lessons;
  const normalizedLessons = tierIds().map((tier, index) => {
    const fallback = defaultLessons[index];
    return normalizeLessonConfig(
      lessonRows.find((entry) => Number((entry as { tier?: unknown })?.tier) === tier),
      fallback
    );
  });

  return {
    systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
    temperature: coerceTemperature(row.temperature),
    model: coerceModel(row.model),
    resumeCacheVersion: coercePositiveInt(row.resumeCacheVersion, 1),
    starrLab: {
      tiers: normalizedTiers,
    },
    academy: {
      lessons: normalizedLessons,
    },
    canvas: normalizeCanvasRegistry(row.canvas, DEFAULT_HC_ADMIN_CONFIG.canvas),
    impactLedger: {
      powerVerbs: normalizePowerVerbs(
        (row.impactLedger as { powerVerbs?: unknown[] } | undefined)?.powerVerbs,
        DEFAULT_HC_ADMIN_CONFIG.impactLedger.powerVerbs
      ),
    },
    updatedAt: Number(row.updatedAt || Date.now()),
  };
}

export function adminUserId(): string {
  return process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
}

export async function isAdminRequest(): Promise<boolean> {
  const { userId } = await auth();
  const configuredAdminId = adminUserId();
  return Boolean(userId && (!configuredAdminId || userId === configuredAdminId));
}

export async function loadHcAdminConfig(): Promise<HcAdminConfig> {
  const id = adminUserId();
  if (!id) return DEFAULT_HC_ADMIN_CONFIG;

  const client = await clerkClient();
  const user = await client.users.getUser(id);
  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
  return normalizeHcAdminConfig(privateMetadata.hcAdminConfig);
}

export async function saveHcAdminConfig(nextConfig: HcAdminConfig): Promise<void> {
  const id = adminUserId();
  if (!id) return;

  const client = await clerkClient();
  const user = await client.users.getUser(id);
  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;

  await client.users.updateUserMetadata(id, {
    privateMetadata: {
      ...privateMetadata,
      hcAdminConfig: {
        ...nextConfig,
        updatedAt: Date.now(),
      },
    },
  });
}
