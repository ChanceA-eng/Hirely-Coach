/**
 * Client-side telemetry helper for Foundation Mode.
 * Posts events to /api/admin/foundation/telemetry — fire-and-forget.
 */

type EventType = "dropout" | "error" | "voice_attempt" | "crash" | "audio_latency" | "lesson_complete";

interface TelemetryPayload {
  type: EventType;
  userId?: string | null;
  moduleId: number;
  lessonId: string;
  lessonTitle?: string;
  typed?: string;
  expected?: string;
  attemptNumber?: number;
  success?: boolean;
  errorMessage?: string;
  audioFile?: string;
  latencyMs?: number;
}

export function logFoundationEvent(payload: TelemetryPayload): void {
  // Fire and forget — never block the UI
  fetch("/api/admin/foundation/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // keepalive allows this to outlive page unload (dropout events)
    keepalive: true,
  }).catch(() => {
    // Silently ignore — telemetry must never break the lesson
  });
}

/** Measure audio load time and log if >500ms */
export function measureAudioLatency(
  audioFile: string,
  moduleId: number,
  lessonId: string,
  userId?: string | null
): void {
  const start = performance.now();
  const audio = new Audio(audioFile);
  const onCanPlay = () => {
    const latencyMs = performance.now() - start;
    audio.removeEventListener("canplaythrough", onCanPlay);
    if (latencyMs > 100) {
      // Only log when we actually have data worth reporting
      logFoundationEvent({ type: "audio_latency", audioFile, moduleId, lessonId, latencyMs, userId });
    }
  };
  audio.addEventListener("canplaythrough", onCanPlay);
}
