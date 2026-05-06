/**
 * In-memory Foundation telemetry store (per-process, survives hot reloads in dev).
 * Events are emitted by LessonRenderer and consumed by the admin Foundation tab.
 */

export type TelemetryEventType =
  | "dropout"
  | "error"
  | "voice_attempt"
  | "crash"
  | "audio_latency"
  | "lesson_complete";

export type TelemetryEvent = {
  id: string;
  type: TelemetryEventType;
  ts: number;
  userId: string | null;
  moduleId: number;
  lessonId: string;
  lessonTitle?: string;
  /** error / dropout */
  typed?: string;
  expected?: string;
  /** voice */
  attemptNumber?: number;
  success?: boolean;
  /** crash */
  errorMessage?: string;
  /** audio latency */
  audioFile?: string;
  latencyMs?: number;
};

const MAX = 2000;

const g = globalThis as typeof globalThis & {
  __foundationTelemetry?: TelemetryEvent[];
};
if (!g.__foundationTelemetry) g.__foundationTelemetry = [];

function store(): TelemetryEvent[] {
  return g.__foundationTelemetry!;
}

export function appendTelemetry(event: Omit<TelemetryEvent, "id" | "ts">) {
  const s = store();
  s.unshift({
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  });
  if (s.length > MAX) s.splice(MAX);
}

export function listTelemetry(opts?: {
  type?: TelemetryEventType;
  limit?: number;
}): TelemetryEvent[] {
  let s = store();
  if (opts?.type) s = s.filter((e) => e.type === opts.type);
  return s.slice(0, opts?.limit ?? 500);
}

export function clearTelemetry() {
  g.__foundationTelemetry = [];
}

/** Aggregate: dropout counts per lesson */
export function dropoutHeatmap(): { lessonId: string; lessonTitle: string; count: number; moduleId: number }[] {
  const map = new Map<string, { lessonTitle: string; count: number; moduleId: number }>();
  for (const e of store()) {
    if (e.type !== "dropout") continue;
    const key = e.lessonId;
    const prev = map.get(key) ?? { lessonTitle: e.lessonTitle ?? key, count: 0, moduleId: e.moduleId };
    map.set(key, { ...prev, count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([lessonId, v]) => ({ lessonId, ...v }))
    .sort((a, b) => b.count - a.count);
}

/** Aggregate: most common error pairs (typed vs expected) */
export function commonErrors(limit = 20): { typed: string; expected: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of store()) {
    if (e.type !== "error" || !e.typed || !e.expected) continue;
    const key = `${e.typed}|||${e.expected}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([k, count]) => {
      const [typed, expected] = k.split("|||");
      return { typed, expected, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Aggregate: average voice attempts per lesson */
export function voiceSuccessStats(): { lessonId: string; avgAttempts: number; successRate: number; total: number }[] {
  type Acc = { attempts: number[]; successes: number };
  const map = new Map<string, Acc>();
  for (const e of store()) {
    if (e.type !== "voice_attempt") continue;
    const prev = map.get(e.lessonId) ?? { attempts: [], successes: 0 };
    prev.attempts.push(e.attemptNumber ?? 1);
    if (e.success) prev.successes++;
    map.set(e.lessonId, prev);
  }
  return [...map.entries()].map(([lessonId, acc]) => ({
    lessonId,
    avgAttempts: acc.attempts.reduce((a, b) => a + b, 0) / (acc.attempts.length || 1),
    successRate: acc.successes / (acc.attempts.length || 1),
    total: acc.attempts.length,
  }));
}

/** Aggregate: slow audio files (>500ms) */
export function slowAssets(): { audioFile: string; avgLatencyMs: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of store()) {
    if (e.type !== "audio_latency" || !e.audioFile || !e.latencyMs) continue;
    if (e.latencyMs < 500) continue;
    const prev = map.get(e.audioFile) ?? { total: 0, count: 0 };
    map.set(e.audioFile, { total: prev.total + e.latencyMs, count: prev.count + 1 });
  }
  return [...map.entries()]
    .map(([audioFile, v]) => ({ audioFile, avgLatencyMs: v.total / v.count, count: v.count }))
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);
}
