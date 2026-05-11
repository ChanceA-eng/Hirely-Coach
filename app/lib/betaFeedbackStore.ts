import { get, put } from "@vercel/blob";

export type BetaFeedbackKind = "pulse" | "module_milestone";

export type BetaFeedbackCategory =
  | "layout_issue"
  | "translation_error"
  | "pronunciation_help"
  | "idea"
  | "translation_quality"
  | "pronunciation_clarity"
  | "confusing_content";

export type BetaFeedbackEntry = {
  id: string;
  createdAt: number;
  updatedAt: number;
  kind: BetaFeedbackKind;
  category: BetaFeedbackCategory;
  sentimentScore: number;
  userComment: string;
  moduleNumber: number | null;
  url: string;
  userAgent: string;
  viewportSize: string;
  screenResolution: string;
  deviceType: string;
  userId: string | null;
  userEmail: string | null;
  emoji: "happy" | "neutral" | "sad" | null;
  swahiliInstructionClarity: number | null;
  pronunciationGuideHelpful: boolean | null;
  confusingNotes: string | null;
  resolved: boolean;
  resolvedAt: number | null;
  resolvedBy: string | null;
  starred: boolean;
  starredAt: number | null;
};

export type CreateBetaFeedbackInput = {
  kind: BetaFeedbackKind;
  category: BetaFeedbackCategory;
  sentimentScore: number;
  userComment: string;
  moduleNumber?: number | null;
  url: string;
  userAgent: string;
  viewportSize: string;
  screenResolution: string;
  deviceType: string;
  userId?: string | null;
  userEmail?: string | null;
  emoji?: "happy" | "neutral" | "sad" | null;
  swahiliInstructionClarity?: number | null;
  pronunciationGuideHelpful?: boolean | null;
  confusingNotes?: string | null;
};

export type ListBetaFeedbackOptions = {
  query?: string;
  module?: number;
  category?: BetaFeedbackCategory;
  resolved?: boolean;
  starred?: boolean;
  limit?: number;
};

const MAX_ROWS = 10000;
const BETA_FEEDBACK_BLOB_PATH = "feedback/beta-feedback.json";

const g = globalThis as typeof globalThis & {
  __betaFeedbackTable?: BetaFeedbackEntry[];
  __betaFeedbackLoaded?: boolean;
};

if (!g.__betaFeedbackTable) g.__betaFeedbackTable = [];
if (!g.__betaFeedbackLoaded) g.__betaFeedbackLoaded = false;

function table(): BetaFeedbackEntry[] {
  return g.__betaFeedbackTable!;
}

async function loadFromBlob(): Promise<BetaFeedbackEntry[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const blob = await get(BETA_FEEDBACK_BLOB_PATH, { access: "public" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
    const raw = await new Response(blob.stream).text();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as BetaFeedbackEntry[];
  } catch {
    return null;
  }
}

async function saveToBlob(rows: BetaFeedbackEntry[]): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await put(BETA_FEEDBACK_BLOB_PATH, JSON.stringify(rows), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
  } catch {
    // Non-fatal: keep in-memory copy if blob write fails transiently.
  }
}

async function ensureLoaded() {
  if (g.__betaFeedbackLoaded) return;
  const fromBlob = await loadFromBlob();
  if (fromBlob && fromBlob.length) {
    g.__betaFeedbackTable = fromBlob.slice(0, MAX_ROWS);
  }
  g.__betaFeedbackLoaded = true;
}

export async function insertBetaFeedback(input: CreateBetaFeedbackInput): Promise<BetaFeedbackEntry> {
  await ensureLoaded();

  const now = Date.now();
  const row: BetaFeedbackEntry = {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    updatedAt: now,
    kind: input.kind,
    category: input.category,
    sentimentScore: Math.max(1, Math.min(5, Math.round(Number(input.sentimentScore || 1)))),
    userComment: String(input.userComment ?? "").trim(),
    moduleNumber:
      typeof input.moduleNumber === "number" && Number.isFinite(input.moduleNumber)
        ? Math.max(1, Math.min(12, Math.floor(input.moduleNumber)))
        : null,
    url: String(input.url ?? ""),
    userAgent: String(input.userAgent ?? ""),
    viewportSize: String(input.viewportSize ?? ""),
    screenResolution: String(input.screenResolution ?? ""),
    deviceType: String(input.deviceType ?? "Unknown Device"),
    userId: input.userId ?? null,
    userEmail: input.userEmail ?? null,
    emoji: input.emoji ?? null,
    swahiliInstructionClarity:
      typeof input.swahiliInstructionClarity === "number"
        ? Math.max(1, Math.min(5, Math.round(input.swahiliInstructionClarity)))
        : null,
    pronunciationGuideHelpful:
      typeof input.pronunciationGuideHelpful === "boolean" ? input.pronunciationGuideHelpful : null,
    confusingNotes: input.confusingNotes ? String(input.confusingNotes) : null,
    resolved: false,
    resolvedAt: null,
    resolvedBy: null,
    starred: false,
    starredAt: null,
  };

  const rows = table();
  rows.unshift(row);
  if (rows.length > MAX_ROWS) rows.splice(MAX_ROWS);
  await saveToBlob(rows);

  return row;
}

export async function listBetaFeedback(opts: ListBetaFeedbackOptions = {}): Promise<BetaFeedbackEntry[]> {
  await ensureLoaded();
  const query = String(opts.query ?? "").trim().toLowerCase();
  const rows = table().filter((row) => {
    if (typeof opts.module === "number" && row.moduleNumber !== opts.module) return false;
    if (opts.category && row.category !== opts.category) return false;
    if (typeof opts.resolved === "boolean" && row.resolved !== opts.resolved) return false;
    if (typeof opts.starred === "boolean" && row.starred !== opts.starred) return false;

    if (!query) return true;

    return [
      row.userComment,
      row.deviceType,
      row.url,
      row.category,
      row.kind,
      row.userEmail ?? "",
      row.confusingNotes ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return rows.slice(0, Math.max(1, Math.min(opts.limit ?? 1500, 5000)));
}

export async function updateBetaFeedback(
  id: string,
  patch: { resolved?: boolean; starred?: boolean; actorUserId?: string | null }
): Promise<BetaFeedbackEntry | null> {
  await ensureLoaded();
  const row = table().find((entry) => entry.id === id);
  if (!row) return null;

  const now = Date.now();
  if (typeof patch.resolved === "boolean") {
    row.resolved = patch.resolved;
    row.resolvedAt = patch.resolved ? now : null;
    row.resolvedBy = patch.resolved ? patch.actorUserId ?? null : null;
  }
  if (typeof patch.starred === "boolean") {
    row.starred = patch.starred;
    row.starredAt = patch.starred ? now : null;
  }

  row.updatedAt = now;
  await saveToBlob(table());
  return row;
}

export function betaFeedbackSummary(rows: BetaFeedbackEntry[]) {
  const byDevice = new Map<string, number>();
  let layoutIssueCount = 0;

  for (const row of rows) {
    if (row.category === "layout_issue") {
      layoutIssueCount += 1;
      byDevice.set(row.deviceType, (byDevice.get(row.deviceType) ?? 0) + 1);
    }
  }

  return {
    total: rows.length,
    unresolved: rows.filter((row) => !row.resolved).length,
    starred: rows.filter((row) => row.starred).length,
    layoutIssueCount,
    layoutIssuesByDevice: [...byDevice.entries()]
      .map(([deviceType, count]) => ({ deviceType, count }))
      .sort((a, b) => b.count - a.count),
  };
}
