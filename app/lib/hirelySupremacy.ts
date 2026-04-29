export type CanvasBlockType = "header" | "summary" | "experience" | "education" | "skills" | "project" | "bullet" | "custom";

export type CanvasBlock = {
  id: string;
  type: CanvasBlockType;
  parentId: string | null;
  order: number;
  lockedToParent?: boolean;
  text?: string;
};

export type CanvasTheme = {
  id: string;
  fontFamily: string;
  headingColor: string;
  bodyColor: string;
  accentColor: string;
};

export type TextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type StyledParagraph = {
  runs: TextRun[];
  letterSpacing?: number;
  lineHeight?: number;
  color?: string;
  fontFamily?: string;
};

export type GridPlacement = {
  columnStart: number;
  columnSpan: number;
};

export type ImpactPlacementTarget = "bullet" | "summary";

export type VerbSuggestion = {
  original: string;
  alternatives: string[];
};

export type CanvasPreflightInput = {
  resumeText: string;
  links?: string[];
  marginsInches?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  minFontSizePt?: number;
};

export type CanvasPreflightResult = {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  suggestions: string[];
};

export type StarrTierId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StarrTierConfig = {
  tier: StarrTierId;
  title: string;
  scenarioTitle: string;
  persona: string;
  questionCount: number;
  systemPrompt: string;
  focusSkill: string;
  temperature: number;
  presencePenalty: number;
};

export type QaTurn = {
  question: string;
  answer: string;
};

export type BattlePillar = "Clarity" | "Resilience" | "Strategic Depth" | "Persuasion" | "Authority";

export type BattleStats = {
  clarity: number;
  resilience: number;
  strategicDepth: number;
  persuasion: number;
  authority: number;
  weakestPillar: BattlePillar;
};

export type ReviewTapeEvent = {
  turn: number;
  pillar: BattlePillar;
  leverageDelta: number;
  reason: string;
};

const EXECUTIVE_VERB_MAP: Record<string, string[]> = {
  helped: ["orchestrated", "accelerated", "enabled"],
  worked: ["executed", "drove", "delivered"],
  did: ["spearheaded", "implemented", "optimized"],
  made: ["built", "designed", "launched"],
  improved: ["elevated", "scaled", "strengthened"],
  managed: ["directed", "led", "owned"],
};

const STARR_TIER_CONFIG: Record<StarrTierId, StarrTierConfig> = {
  1: {
    tier: 1,
    title: "Novice",
    scenarioTitle: "The First Impression",
    persona: "The Helpful Recruiter",
    questionCount: 3,
    focusSkill: "Structured introductions and confidence baseline",
    systemPrompt: "Keep tone supportive. Validate clarity and basics of the STARR flow.",
    temperature: 0.65,
    presencePenalty: 0,
  },
  2: {
    tier: 2,
    title: "Apprentice",
    scenarioTitle: "The Skill Deep-Dive",
    persona: "The Senior Peer",
    questionCount: 4,
    focusSkill: "Technical depth and execution specifics",
    systemPrompt: "Probe practical decisions and trade-offs in execution details.",
    temperature: 0.6,
    presencePenalty: 0.05,
  },
  3: {
    tier: 3,
    title: "Candidate",
    scenarioTitle: "The Cultural Match",
    persona: "The Hiring Manager",
    questionCount: 5,
    focusSkill: "Team fit, collaboration, and ownership",
    systemPrompt: "Test collaboration style and alignment with team culture expectations.",
    temperature: 0.55,
    presencePenalty: 0.05,
  },
  4: {
    tier: 4,
    title: "Expert",
    scenarioTitle: "The Efficiency Auditor",
    persona: "The Process-Driven Director",
    questionCount: 6,
    focusSkill: "Operational bottleneck diagnosis and process clarity",
    systemPrompt: "Challenge the how. Ask for the exact bottleneck and operational move used.",
    temperature: 0.5,
    presencePenalty: 0.08,
  },
  5: {
    tier: 5,
    title: "Executive",
    scenarioTitle: "The Strategy Session",
    persona: "The VP of Operations",
    questionCount: 7,
    focusSkill: "Cross-functional strategy and prioritization",
    systemPrompt: "Pressure-test strategic framing, trade-offs, and execution sequencing.",
    temperature: 0.45,
    presencePenalty: 0.06,
  },
  6: {
    tier: 6,
    title: "Advanced",
    scenarioTitle: "The Stone-Cold CFO",
    persona: "The Financial Gatekeeper",
    questionCount: 8,
    focusSkill: "Financial reasoning, negotiation composure, and bottom-line framing",
    systemPrompt: "Use CFO pressure. Emphasize ROI, budget constraints, and silence-pressure moments.",
    temperature: 0.35,
    presencePenalty: 0,
  },
  7: {
    tier: 7,
    title: "Master",
    scenarioTitle: "The Visionary Board",
    persona: "The Legacy Founder",
    questionCount: 10,
    focusSkill: "Long-horizon influence, legacy thinking, and culture-shift leadership",
    systemPrompt: "Ask abstract 3-year trajectory and culture-shift questions with board-level tone.",
    temperature: 0.28,
    presencePenalty: -0.1,
  },
};

const SAFETY_MARGIN_INCHES = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function reorderBlocks(blocks: CanvasBlock[], sourceId: string, targetIndex: number): CanvasBlock[] {
  const source = blocks.find((block) => block.id === sourceId);
  if (!source) return blocks;

  const siblings = blocks
    .filter((block) => block.parentId === source.parentId)
    .sort((a, b) => a.order - b.order)
    .filter((block) => block.id !== sourceId);

  const boundedIndex = clamp(targetIndex, 0, siblings.length);
  siblings.splice(boundedIndex, 0, source);

  const orderMap = new Map<string, number>();
  siblings.forEach((block, index) => orderMap.set(block.id, index));

  return blocks.map((block) =>
    block.parentId === source.parentId && orderMap.has(block.id)
      ? { ...block, order: orderMap.get(block.id) as number }
      : block
  );
}

export function canMoveBlock(block: CanvasBlock, targetParentId: string | null): boolean {
  if (!block.lockedToParent) return true;
  return block.parentId === targetParentId;
}

export function snapToGrid(placement: GridPlacement): GridPlacement {
  const normalizedStart = clamp(Math.round(placement.columnStart), 1, 12);
  const maxSpan = 13 - normalizedStart;
  const normalizedSpan = clamp(Math.round(placement.columnSpan), 1, maxSpan);

  return {
    columnStart: normalizedStart,
    columnSpan: normalizedSpan,
  };
}

export function applyGlobalTheme(paragraphs: StyledParagraph[], theme: CanvasTheme): StyledParagraph[] {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    color: paragraph.color || theme.bodyColor,
    fontFamily: theme.fontFamily,
    runs: paragraph.runs.map((run) => ({
      ...run,
      // Preserve text emphasis while updating global theme values.
      bold: Boolean(run.bold),
      italic: Boolean(run.italic),
    })),
  }));
}

export function classifyImpactDrop(text: string): ImpactPlacementTarget {
  const trimmed = text.trim();
  const looksLikeBullet = /^[-*\u2022]/.test(trimmed) || /\b(increased|reduced|scaled|delivered|grew|improved)\b/i.test(trimmed);
  return looksLikeBullet ? "bullet" : "summary";
}

export function suggestExecutiveVerbAlternatives(line: string): VerbSuggestion | null {
  const words = line.trim().split(/\s+/);
  const firstWord = words[0]?.toLowerCase();
  if (!firstWord) return null;

  const alternatives = EXECUTIVE_VERB_MAP[firstWord];
  if (!alternatives?.length) return null;

  return {
    original: words[0],
    alternatives: alternatives.slice(0, 3),
  };
}

function findRepeatedWords(text: string): string[] {
  const matches = text.match(/\b([a-zA-Z]{2,})\s+\1\b/g) || [];
  const normalized = matches.map((entry) => entry.toLowerCase());
  return Array.from(new Set(normalized)).slice(0, 8);
}

function findEmptyDateRanges(text: string): string[] {
  const hits: string[] = [];
  const lines = text.split(/\r?\n/);
  const pattern = /\b(19|20)\d{2}\s*(?:-|to)\s*(?:present|current|now)?\s*$/i;

  lines.forEach((line) => {
    if (pattern.test(line.trim())) {
      hits.push(line.trim());
    }
  });

  return hits.slice(0, 8);
}

function findBrokenLinks(links: string[]): string[] {
  const broken: string[] = [];

  links.forEach((rawLink) => {
    const link = rawLink.trim();
    if (!link) return;

    try {
      const parsed = new URL(link);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        broken.push(link);
      }
    } catch {
      broken.push(link);
    }
  });

  return broken.slice(0, 12);
}

export function runCanvasPreflight(input: CanvasPreflightInput): CanvasPreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const text = input.resumeText || "";
  const repeatedWords = findRepeatedWords(text);
  if (repeatedWords.length) {
    warnings.push(`Possible typo patterns found: ${repeatedWords.join(", ")}`);
  }

  const emptyDateRanges = findEmptyDateRanges(text);
  if (emptyDateRanges.length) {
    blockers.push(`Incomplete date ranges detected: ${emptyDateRanges.join(" | ")}`);
  }

  const brokenLinks = findBrokenLinks(input.links || []);
  if (brokenLinks.length) {
    blockers.push(`Broken or invalid links found: ${brokenLinks.join(", ")}`);
  }

  const minFontSizePt = Number(input.minFontSizePt || 10);
  if (minFontSizePt < 10) {
    warnings.push("ATS warning: minimum font size is below 10pt.");
  }

  const margins = input.marginsInches;
  if (margins) {
    const tooSmall = Object.entries(margins)
      .filter(([, size]) => Number(size) < SAFETY_MARGIN_INCHES)
      .map(([edge]) => edge);

    if (tooSmall.length) {
      warnings.push(`Printer safety-zone warning: margins too small on ${tooSmall.join(", ")}.`);
    }
  }

  if (!blockers.length && !warnings.length) {
    suggestions.push("Pre-flight clear. Ready for PDF export.");
  }

  if (warnings.length && !blockers.length) {
    suggestions.push("Fix warnings before export to improve ATS and print reliability.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    suggestions,
  };
}

export function coerceStarrTierId(value: unknown): StarrTierId {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === 1 || numeric === 2 || numeric === 3 || numeric === 4 || numeric === 5 || numeric === 6 || numeric === 7) {
    return numeric;
  }
  return 1;
}

export function getAllStarrTierConfigs(): StarrTierConfig[] {
  return [1, 2, 3, 4, 5, 6, 7].map((tier) => STARR_TIER_CONFIG[tier as StarrTierId]);
}

export function getStarrTierConfig(tier: StarrTierId): StarrTierConfig {
  return STARR_TIER_CONFIG[tier];
}

export function isTierUnlocked(completedTiers: StarrTierId[], tier: StarrTierId): boolean {
  if (tier === 1) return true;
  return completedTiers.includes((tier - 1) as StarrTierId);
}

export function getNextUnlockTier(completedTiers: StarrTierId[]): StarrTierId | null {
  const normalized = new Set(completedTiers);
  if (!normalized.has(1)) return 1;
  if (!normalized.has(2)) return 2;
  if (!normalized.has(3)) return 3;
  if (!normalized.has(4)) return 4;
  if (!normalized.has(5)) return 5;
  if (!normalized.has(6)) return 6;
  if (!normalized.has(7)) return 7;
  return null;
}

export function buildBossQuestionRules(config: StarrTierConfig): string {
  if (config.tier === 1) return "Keep questions introductory and confidence-building with one clear STARR structure check.";
  if (config.tier === 2) return "Include at least one technical deep-dive asking for implementation detail and trade-off.";
  if (config.tier === 3) return "Include one team-conflict or collaboration tension question requiring accountability language.";
  if (config.tier === 4) return "Challenge the exact process bottleneck and demand precise action/result details.";
  if (config.tier === 5) return "Add one cross-functional prioritization scenario with competing constraints.";
  if (config.tier === 6) return "Include a salary or budget-wall challenge and use one silence-pressure beat.";
  return "Include one abstract 3-year impact question and one culture-shift leadership question.";
}

export function buildRealtimeBossInstructions(config: StarrTierConfig): string {
  if (config.tier === 6) {
    return "Run a financial gatekeeper style challenge. After compensation statements, hold a five-second silence before continuing.";
  }
  if (config.tier === 7) {
    return "Run a board-level conversation focused on long-term trajectory, legacy, and culture-shift outcomes.";
  }
  return `Stay in persona as ${config.persona}. Prioritize ${config.focusSkill.toLowerCase()}.`;
}

export function getTierSkillFocus(config: StarrTierConfig): string {
  return config.focusSkill;
}

export function getTierSkillAssessment(config: StarrTierConfig, stats: BattleStats): {
  mastered: string;
  missed: string;
} {
  const strongest = [
    { pillar: "Clarity", score: stats.clarity },
    { pillar: "Resilience", score: stats.resilience },
    { pillar: "Strategic Depth", score: stats.strategicDepth },
    { pillar: "Persuasion", score: stats.persuasion },
    { pillar: "Authority", score: stats.authority },
  ].sort((a, b) => b.score - a.score)[0];

  return {
    mastered: `${config.focusSkill} (strongest signal: ${strongest.pillar} at ${strongest.score}/100)`,
    missed: `${stats.weakestPillar} under pressure in ${config.scenarioTitle}`,
  };
}

function countSentences(text: string): number {
  return text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean).length;
}

function numberMentions(text: string): number {
  return (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
}

function authorityMentions(text: string): number {
  return (text.match(/\b(led|owned|directed|advised|negotiated|aligned|governed)\b/gi) || []).length;
}

function persuasionMentions(text: string): number {
  return (text.match(/\b(roi|impact|value|trade-?off|business case|outcome|profit|margin)\b/gi) || []).length;
}

function resilienceMentions(text: string): number {
  return (text.match(/\b(pushback|constraint|risk|objection|pressure|trade-?off|budget)\b/gi) || []).length;
}

function clarityScore(turns: QaTurn[]): number {
  if (!turns.length) return 0;
  const avgSentences = turns.reduce((sum, turn) => sum + countSentences(turn.answer), 0) / turns.length;
  // Prefer concise complete answers around 3-7 sentences.
  const centerDistance = Math.abs(avgSentences - 5);
  return clamp(Math.round(100 - centerDistance * 15), 35, 100);
}

function strategicDepthScore(turns: QaTurn[]): number {
  const mentions = turns.reduce((sum, turn) => sum + numberMentions(turn.answer) + persuasionMentions(turn.answer), 0);
  return clamp(30 + mentions * 6, 20, 100);
}

function persuasionScore(turns: QaTurn[]): number {
  const mentions = turns.reduce((sum, turn) => sum + persuasionMentions(turn.answer), 0);
  return clamp(35 + mentions * 8, 20, 100);
}

function authorityScore(turns: QaTurn[]): number {
  const mentions = turns.reduce((sum, turn) => sum + authorityMentions(turn.answer), 0);
  return clamp(30 + mentions * 9, 20, 100);
}

function resilienceScore(turns: QaTurn[]): number {
  const mentions = turns.reduce((sum, turn) => sum + resilienceMentions(turn.answer), 0);
  return clamp(35 + mentions * 8, 20, 100);
}

export function evaluateBattleStats(turns: QaTurn[]): BattleStats {
  const clarity = clarityScore(turns);
  const resilience = resilienceScore(turns);
  const strategicDepth = strategicDepthScore(turns);
  const persuasion = persuasionScore(turns);
  const authority = authorityScore(turns);

  const entries: Array<[BattlePillar, number]> = [
    ["Clarity", clarity],
    ["Resilience", resilience],
    ["Strategic Depth", strategicDepth],
    ["Persuasion", persuasion],
    ["Authority", authority],
  ];

  entries.sort((left, right) => left[1] - right[1]);

  return {
    clarity,
    resilience,
    strategicDepth,
    persuasion,
    authority,
    weakestPillar: entries[0][0],
  };
}

export function buildReviewTape(turns: QaTurn[]): ReviewTapeEvent[] {
  const events: ReviewTapeEvent[] = [];

  turns.forEach((turn, index) => {
    const turnNumber = index + 1;
    const answer = turn.answer || "";

    if (countSentences(answer) > 8) {
      events.push({
        turn: turnNumber,
        pillar: "Clarity",
        leverageDelta: -8,
        reason: "Answer drifted long; impact signal weakened.",
      });
    }

    if (persuasionMentions(answer) === 0 && numberMentions(answer) === 0) {
      events.push({
        turn: turnNumber,
        pillar: "Strategic Depth",
        leverageDelta: -6,
        reason: "Missing metrics or ROI framing.",
      });
    }

    if (authorityMentions(answer) === 0) {
      events.push({
        turn: turnNumber,
        pillar: "Authority",
        leverageDelta: -5,
        reason: "Response did not clearly show ownership language.",
      });
    }
  });

  return events.slice(0, 12);
}

export function getSynergyLoopRecommendation(weakestPillar: BattlePillar): string {
  if (weakestPillar === "Clarity") {
    return "Revise your resume summary and top 3 bullets into tighter STAR-style statements before your next simulation.";
  }
  if (weakestPillar === "Resilience") {
    return "Update one negotiation story in your Experience section with explicit pushback, decision logic, and final outcome.";
  }
  if (weakestPillar === "Strategic Depth") {
    return "Rewrite key achievement bullets to include ROI, cost, growth, or risk reduction metrics.";
  }
  if (weakestPillar === "Persuasion") {
    return "Strengthen impact bullets with value bracketing language that ties actions to measurable business gain.";
  }
  return "Reword lead bullets using ownership-first verbs and decision authority cues to project peer-level presence.";
}

export function formatBattleStatsForReport(stats: BattleStats, tape: ReviewTapeEvent[]): string {
  const tapeLines = tape.length
    ? tape
        .map((event) => `- Turn ${event.turn}: ${event.pillar} ${event.leverageDelta} (${event.reason})`)
        .join("\n")
    : "- No significant leverage drops detected.";

  return [
    "### Final Boss Battle Stats",
    `Clarity: ${stats.clarity}/100`,
    `Resilience: ${stats.resilience}/100`,
    `Strategic Depth: ${stats.strategicDepth}/100`,
    `Persuasion: ${stats.persuasion}/100`,
    `Authority: ${stats.authority}/100`,
    "",
    "### Review Tape (Leverage Meter)",
    tapeLines,
    "",
    `### Synergy Loop Action\nWeakest pillar: ${stats.weakestPillar}. ${getSynergyLoopRecommendation(stats.weakestPillar)}`,
  ].join("\n");
}