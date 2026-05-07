"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  saveGrowthHubSnapshot,
  saveInterviewSession,
  savePendingGuestSession,
} from "../../lib/interviewStorage";
import { loadInterviewDraft } from "../../lib/resumeStorage";
import { loadAccountInterviewProgress, syncInterviewProgress } from "../../lib/interviewProgress";
import {
  getAllStarrTierConfigs,
  isTierUnlocked,
  getIntensityLabel,
  type StarrTierId,
} from "../../lib/hirelySupremacy";
import styles from "./page.module.css";

const LOCAL_TIER_PROGRESS_KEY_PREFIX = "hirely.starr.completedTiers.v1";
const VISUALIZER_SAMPLES = 128;
const AI_ACTIVITY_THRESHOLD = 0.055;
const USER_ACTIVITY_THRESHOLD = 0.045;

type Status =
  | "selection"
  | "loading"
  | "generating"
  | "connecting"
  | "interview"
  | "feedback"
  | "finished"
  | "error";

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
};

type ActiveSpeaker = "ai" | "user" | null;

type TierRuntimeBehavior = {
  silenceAnchorMs: number;
  interruptThresholdSeconds: number;
  multiPartSegments: number;
};

type SignalNudgeProps = {
  label: string;
  subtitle: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  level: number;
  resting: boolean;
  accent: "coach" | "user" | "alert";
  overline?: string;
  segments?: number;
  segmentProgress?: number;
};

function formatFeedbackHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const formatted = escaped
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^-\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");

  return `<p>${formatted}</p>`;
}

function makeSessionTimestamp() {
  return Date.now();
}

function getNowMs() {
  return Date.now();
}

function createAudioBuffer(size: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(size));
}

function tierProgressKey(userId: string | null | undefined) {
  return `${LOCAL_TIER_PROGRESS_KEY_PREFIX}:${userId ?? "guest"}`;
}

function loadLocalCompletedTiers(userId: string | null | undefined): StarrTierId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(tierProgressKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return parsed
      .filter((tier): tier is StarrTierId =>
        tier === 1 || tier === 2 || tier === 3 || tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8
      )
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function saveLocalCompletedTiers(userId: string | null | undefined, tiers: StarrTierId[]) {
  if (typeof window === "undefined") return;
  const next = [...new Set(tiers)].sort((a, b) => a - b);
  window.localStorage.setItem(tierProgressKey(userId), JSON.stringify(next));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDefaultRuntimeBehavior(tier: StarrTierId): TierRuntimeBehavior {
  if (tier === 5) {
    return {
      silenceAnchorMs: 2000,
      interruptThresholdSeconds: 45,
      multiPartSegments: 0,
    };
  }

  if (tier === 7) {
    return {
      silenceAnchorMs: 8000,
      interruptThresholdSeconds: 45,
      multiPartSegments: 0,
    };
  }

  if (tier === 8) {
    return {
      silenceAnchorMs: 2000,
      interruptThresholdSeconds: 45,
      multiPartSegments: 3,
    };
  }

  return {
    silenceAnchorMs: 2000,
    interruptThresholdSeconds: 45,
    multiPartSegments: 0,
  };
}

function getAnalyserLevel(analyser: AnalyserNode | null, bucket: Uint8Array<ArrayBuffer> | null) {
  if (!analyser || !bucket) return 0;
  analyser.getByteTimeDomainData(bucket);
  let sum = 0;
  for (let index = 0; index < bucket.length; index += 1) {
    const normalized = (bucket[index] - 128) / 128;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / bucket.length);
}

function drawSignalCanvas(
  canvas: HTMLCanvasElement | null,
  analyser: AnalyserNode | null,
  bucket: Uint8Array<ArrayBuffer> | null,
  options: { accent: "coach" | "user" | "alert"; active: boolean; resting: boolean; level: number }
) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 540;
  const height = canvas.clientHeight || 124;

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const gradient = context.createLinearGradient(0, 0, width, 0);
  if (options.accent === "alert") {
    gradient.addColorStop(0, "rgba(248, 113, 113, 0.18)");
    gradient.addColorStop(0.5, "rgba(248, 113, 113, 0.96)");
    gradient.addColorStop(1, "rgba(252, 165, 165, 0.22)");
  } else if (options.accent === "user") {
    gradient.addColorStop(0, "rgba(125, 211, 252, 0.14)");
    gradient.addColorStop(0.5, "rgba(125, 211, 252, 0.9)");
    gradient.addColorStop(1, "rgba(103, 232, 249, 0.18)");
  } else {
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.16)");
    gradient.addColorStop(0.5, "rgba(16, 185, 129, 0.95)");
    gradient.addColorStop(1, "rgba(110, 231, 183, 0.2)");
  }

  context.lineWidth = options.active ? 2.8 : 1.8;
  context.strokeStyle = gradient;
  context.shadowBlur = options.active ? 28 : 16;
  context.shadowColor =
    options.accent === "alert"
      ? "rgba(248, 113, 113, 0.45)"
      : options.accent === "user"
        ? "rgba(125, 211, 252, 0.3)"
        : "rgba(16, 185, 129, 0.34)";

  const baseline = height / 2;
  const restingAmplitude = 5 + options.level * 28;

  context.beginPath();

  if (!analyser || !bucket || options.resting) {
    for (let index = 0; index < 48; index += 1) {
      const x = (index / 47) * width;
      const wave = Math.sin(index * 0.6 + performance.now() * 0.004) * restingAmplitude;
      const y = baseline + wave * 0.24;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    return;
  }

  analyser.getByteFrequencyData(bucket);
  const sampleSize = Math.min(bucket.length, 72);
  for (let index = 0; index < sampleSize; index += 1) {
    const x = (index / (sampleSize - 1)) * width;
    const mirrored = index < sampleSize / 2 ? index : sampleSize - index - 1;
    const normalized = bucket[index] / 255;
    const amplitude = 10 + normalized * height * 0.38 + mirrored * 0.45;
    const y = baseline - amplitude * Math.sin((index / sampleSize) * Math.PI);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.stroke();
}

function SignalNudge({
  label,
  subtitle,
  canvasRef,
  isActive,
  level,
  resting,
  accent,
  overline,
  segments = 0,
  segmentProgress = 0,
}: SignalNudgeProps) {
  return (
    <article
      className={[
        styles.signalCard,
        isActive ? styles.signalCardActive : styles.signalCardDimmed,
        accent === "user" ? styles.signalCardUser : "",
        accent === "alert" ? styles.signalCardAlert : "",
      ].join(" ")}
    >
      {overline ? <p className={styles.signalOverline}>{overline}</p> : null}
      <div className={styles.signalIdentityRow}>
        <div>
          <h2 className={styles.signalLabel}>{label}</h2>
          <p className={styles.signalSubtitle}>{subtitle}</p>
        </div>
        <div className={styles.signalLevelPill}>{Math.round(level * 100)}%</div>
      </div>
      <div className={styles.signalCanvasFrame}>
        <canvas ref={canvasRef} className={styles.signalCanvas} aria-hidden="true" />
      </div>
      {segments > 0 ? (
        <div className={styles.segmentRow} aria-label="Multi-part prompt progress">
          {Array.from({ length: segments }).map((_, index) => (
            <span
              key={`${label}-segment-${index}`}
              className={`${styles.segmentPip} ${index < segmentProgress ? styles.segmentPipDone : ""}`}
            >
              {index + 1}
            </span>
          ))}
        </div>
      ) : null}
      <div className={styles.signalStatusRow}>
        <span className={styles.signalStatusDot} />
        <span>{resting ? "Resting pulse" : subtitle}</span>
      </div>
    </article>
  );
}

export default function InterviewPage() {
  const router = useRouter();
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();

  const [status, setStatus] = useState<Status>("selection");
  const [selectedTier, setSelectedTier] = useState<StarrTierId>(1);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [completedTiers, setCompletedTiers] = useState<StarrTierId[]>([]);
  const [tierProgressReady, setTierProgressReady] = useState(false);
  const [runtimeBehavior, setRuntimeBehavior] = useState<TierRuntimeBehavior>(getDefaultRuntimeBehavior(1));
  const [silenceAnchorUntil, setSilenceAnchorUntil] = useState(0);
  const [interruptActive, setInterruptActive] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<ActiveSpeaker>(null);
  const [aiLevel, setAiLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [segmentProgress, setSegmentProgress] = useState(0);
  const [nowMs, setNowMs] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const userSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const aiWaveBucketRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const userWaveBucketRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const aiLevelBucketRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const userLevelBucketRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const lastMeterUpdateRef = useRef(0);
  const resumeRef = useRef("");
  const jobRef = useRef("");
  const jobLinkRef = useRef("");
  const questionsRef = useRef<string[]>([]);
  const NON_SUBSTANTIVE_RE = /^(?:\s*|mm+|mmm+|uh+|um+|hmm+|ah+|eh+|ok(?:ay)?|yeah|yep|nah|nope|right|noise|background|bird|birds|music|cough|laugh|static)$/i;
  
  function isSubstantiveTranscript(text: string) {
    const normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (!normalized) return false;
    if (NON_SUBSTANTIVE_RE.test(normalized)) return false;
    return normalized.split(" ").length >= 4;
  }
  const answersRef = useRef<string[]>([]);
  const answerCountRef = useRef(0);
  const answerRetryRef = useRef<Record<number, number>>({});
  const responseInProgressRef = useRef(false);
  const aiTranscriptBufferRef = useRef("");
  const feedbackTriggeredRef = useRef(false);
  const doGenerateFeedbackRef = useRef<() => Promise<void>>(async () => {});
  const selectedTierRef = useRef<StarrTierId>(1);
  const runtimeBehaviorRef = useRef<TierRuntimeBehavior>(getDefaultRuntimeBehavior(1));
  const userSpeechStartRef = useRef(0);
  const interruptTriggeredRef = useRef(false);

  const speakerName = user?.firstName?.trim() || "You";
  const isTierEight = selectedTier === 8;

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const attachMicAnalyser = useCallback(async (stream: MediaStream) => {
    const context = await ensureAudioContext();
    if (!context) return;

    if (userSourceNodeRef.current) {
      userSourceNodeRef.current.disconnect();
      userSourceNodeRef.current = null;
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.88;

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    userSourceNodeRef.current = source;
    userAnalyserRef.current = analyser;
    userWaveBucketRef.current = createAudioBuffer(analyser.frequencyBinCount);
    userLevelBucketRef.current = createAudioBuffer(VISUALIZER_SAMPLES);
  }, [ensureAudioContext]);

  const attachAiAnalyser = useCallback(async (audioEl: HTMLAudioElement) => {
    const context = await ensureAudioContext();
    if (!context) return;

    if (!aiSourceNodeRef.current) {
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.9;

      const source = context.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(context.destination);

      aiSourceNodeRef.current = source;
      aiAnalyserRef.current = analyser;
      aiWaveBucketRef.current = createAudioBuffer(analyser.frequencyBinCount);
      aiLevelBucketRef.current = createAudioBuffer(VISUALIZER_SAMPLES);
    }
  }, [ensureAudioContext]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (dcRef.current) {
      try {
        dcRef.current.close();
      } catch {
        // ignore
      }
      dcRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    if (userSourceNodeRef.current) {
      userSourceNodeRef.current.disconnect();
      userSourceNodeRef.current = null;
    }
    if (aiSourceNodeRef.current) {
      aiSourceNodeRef.current.disconnect();
      aiSourceNodeRef.current = null;
    }
    if (aiAnalyserRef.current) {
      aiAnalyserRef.current.disconnect();
      aiAnalyserRef.current = null;
    }
    if (userAnalyserRef.current) {
      userAnalyserRef.current.disconnect();
      userAnalyserRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    aiWaveBucketRef.current = null;
    userWaveBucketRef.current = null;
    aiLevelBucketRef.current = null;
    userLevelBucketRef.current = null;
    interruptTriggeredRef.current = false;
    userSpeechStartRef.current = 0;
  }, []);

  const doGenerateFeedback = useCallback(async () => {
    if (feedbackTriggeredRef.current) return;
    feedbackTriggeredRef.current = true;
    cleanup();
    setStatus("feedback");
    setFeedback("Generating your personalized feedback...");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeRef.current,
          job: jobRef.current,
          questions: questionsRef.current,
          answers: answersRef.current,
          tier: selectedTierRef.current,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Oops! We couldn't load your feedback. Try again?");
        setFeedback("");
        setStatus("finished");
        return;
      }
      const generatedFeedback = data.feedback || "AI feedback is not available.";
      setFeedback(generatedFeedback);
      const scoreMatch = generatedFeedback.match(/STARR Score:\s*(\d+)\/100/);
      const starrScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      const improvIdx = generatedFeedback.indexOf("### Areas for Improvement");
      const improvText = improvIdx >= 0 ? generatedFeedback.slice(improvIdx) : "";
      const weakMatch = improvText.match(/\*\*([^*]+)\*\*/);
      const topWeakness = weakMatch ? weakMatch[1] : "";
      const jobTitle =
        jobRef.current.trim().split("\n")[0]?.trim().slice(0, 80) ||
        "Interview Session";
      const createdAt = makeSessionTimestamp();
      const session = {
        id: crypto.randomUUID(),
        createdAt,
        resume: resumeRef.current,
        jobTitle,
        job: jobRef.current,
        questions: questionsRef.current,
        answers: answersRef.current,
        feedback: generatedFeedback,
        level: `tier-${selectedTierRef.current}`,
        starrScore,
      };
      const snapshot = {
        sessionId: session.id,
        createdAt,
        starrScore,
        topWeakness,
        jobTitle,
      };

      saveInterviewSession(session, userId);
      saveGrowthHubSnapshot(snapshot, userId);

      const nextCompleted = [...new Set([...completedTiers, selectedTierRef.current])].sort(
        (a, b) => a - b
      ) as StarrTierId[];
      setCompletedTiers(nextCompleted);
      saveLocalCompletedTiers(userId, nextCompleted);

      if (!isSignedIn) {
        savePendingGuestSession(session, snapshot);
        setStatus("finished");
        router.push("/interview/complete-sign-up");
      } else {
        setStatus("finished");
        syncInterviewProgress(snapshot, { completedTier: selectedTierRef.current }).catch(() => {
          // Non-blocking: local save already completed.
        });
        void fetch("/api/interview/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            starrScore,
            questionCount: questionsRef.current.length,
          }),
        }).catch(() => {
          // Non-blocking: interview data is already saved locally.
        });
      }
    } catch {
      setError("Oops! We couldn't load your feedback. Try again?");
      setFeedback("");
      setStatus("finished");
    }
  }, [cleanup, completedTiers, isSignedIn, router, userId]);

  useEffect(() => {
    doGenerateFeedbackRef.current = doGenerateFeedback;
  }, [doGenerateFeedback]);

  useEffect(() => {
    let cancelled = false;

    const bootTierProgress = async () => {
      const localTiers = loadLocalCompletedTiers(userId);
      if (!cancelled) {
        queueMicrotask(() => {
          if (!cancelled) setCompletedTiers(localTiers);
        });
      }

      if (!isSignedIn) {
        if (!cancelled) {
          queueMicrotask(() => {
            if (!cancelled) setTierProgressReady(true);
          });
        }
        return;
      }

      try {
        const accountProgress = await loadAccountInterviewProgress();
        if (cancelled) return;

        const merged = [...new Set([...(accountProgress.completedTiers as StarrTierId[]), ...localTiers])]
          .filter((tier): tier is StarrTierId =>
            tier === 1 || tier === 2 || tier === 3 || tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8
          )
          .sort((a, b) => a - b);

        queueMicrotask(() => {
          if (cancelled) return;
          setCompletedTiers(merged);
          saveLocalCompletedTiers(userId, merged);
        });
      } catch {
        // Non-blocking fallback to local tier progression.
      } finally {
        if (!cancelled) {
          queueMicrotask(() => {
            if (!cancelled) setTierProgressReady(true);
          });
        }
      }
    };

    void bootTierProgress();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId]);

  useEffect(() => {
    if (status !== "interview") return undefined;

    const loop = (timestamp: number) => {
      const nextAiLevel = clamp(getAnalyserLevel(aiAnalyserRef.current, aiLevelBucketRef.current), 0, 1);
      const nextUserLevel = clamp(getAnalyserLevel(userAnalyserRef.current, userLevelBucketRef.current), 0, 1);
      const silenceActive = Date.now() < silenceAnchorUntil;
      const nextSpeaker: ActiveSpeaker =
        interruptActive || nextAiLevel >= AI_ACTIVITY_THRESHOLD || aiSpeaking || silenceActive
          ? "ai"
          : nextUserLevel >= USER_ACTIVITY_THRESHOLD || userSpeaking
            ? "user"
            : null;

      drawSignalCanvas(aiCanvasRef.current, aiAnalyserRef.current, aiWaveBucketRef.current, {
        accent: interruptActive ? "alert" : "coach",
        active: nextSpeaker === "ai",
        resting: silenceActive || (!aiSpeaking && nextAiLevel < AI_ACTIVITY_THRESHOLD),
        level: nextAiLevel,
      });

      drawSignalCanvas(userCanvasRef.current, userAnalyserRef.current, userWaveBucketRef.current, {
        accent: "user",
        active: nextSpeaker === "user",
        resting: !userSpeaking && nextUserLevel < USER_ACTIVITY_THRESHOLD,
        level: nextUserLevel,
      });

      if (timestamp - lastMeterUpdateRef.current > 40) {
        lastMeterUpdateRef.current = timestamp;
        setAiLevel(nextAiLevel);
        setUserLevel(nextUserLevel);
        setActiveSpeaker(nextSpeaker);
        setNowMs(getNowMs());
      }

      animationFrameRef.current = window.requestAnimationFrame(loop);
    };

    animationFrameRef.current = window.requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [aiSpeaking, interruptActive, silenceAnchorUntil, status, userSpeaking]);

  useEffect(() => {
    if (status !== "interview" || selectedTierRef.current !== 5 || !userSpeaking) return undefined;
    if (interruptTriggeredRef.current) return undefined;

    const elapsed = userSpeechStartRef.current ? Date.now() - userSpeechStartRef.current : 0;
    const remaining = Math.max(0, runtimeBehaviorRef.current.interruptThresholdSeconds * 1000 - elapsed);

    const timeoutId = window.setTimeout(() => {
      interruptTriggeredRef.current = true;
      setInterruptActive(true);
      if (dcRef.current?.readyState === "open") {
        try {
          dcRef.current.send(JSON.stringify({ type: "response.create" }));
        } catch {
          // ignore interrupt attempts if realtime rejects the event
        }
      }
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [status, userSpeaking]);

  useEffect(() => {
    const draft = loadInterviewDraft();
    const storedResume = draft?.resume || "";
    const storedJob = draft?.job || "";
    const storedJobLink = draft?.jobLink || "";
    if (!storedResume || (!storedJob && !storedJobLink)) {
      router.push("/voice");
      return;
    }
    resumeRef.current = storedResume;
    jobRef.current = storedJob || `Job listing URL: ${storedJobLink}`;
    jobLinkRef.current = storedJobLink;
    return () => {
      cleanup();
    };
  }, [cleanup, router]);

  const handleEndInterview = async () => {
    await doGenerateFeedbackRef.current();
  };

  const handleDataChannelMessage = (raw: string) => {
    let msg: RealtimeEvent;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    switch (msg.type) {
      case "response.audio.delta":
        setAiSpeaking(true);
        setInterruptActive(false);
        setSilenceAnchorUntil(0);
        responseInProgressRef.current = true;
        break;
      case "response.audio_transcript.delta": {
        aiTranscriptBufferRef.current += msg.delta || "";
        if (selectedTierRef.current === 8) {
          const maxSegments = runtimeBehaviorRef.current.multiPartSegments;
          const transcriptSegments = (aiTranscriptBufferRef.current.match(/\?/g) || []).length;
          setSegmentProgress(clamp(Math.max(transcriptSegments, aiTranscriptBufferRef.current.trim() ? 1 : 0), 0, maxSegments));
        }
        break;
      }
      case "response.audio.done":
        setAiSpeaking(false);
        responseInProgressRef.current = false;
        if (selectedTierRef.current === 8 && runtimeBehaviorRef.current.multiPartSegments > 0) {
          setSegmentProgress(runtimeBehaviorRef.current.multiPartSegments);
        }
        aiTranscriptBufferRef.current = "";
        break;
      case "response.audio_transcript.done":
        break;
      case "input_audio_buffer.speech_started":
        setUserSpeaking(true);
        setUserTranscript("");
        setInterruptActive(false);
        interruptTriggeredRef.current = false;
        userSpeechStartRef.current = getNowMs();
        break;
      case "input_audio_buffer.speech_stopped":
        setUserSpeaking(false);
        if (selectedTierRef.current === 7) {
          setSilenceAnchorUntil(getNowMs() + runtimeBehaviorRef.current.silenceAnchorMs);
        }
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const transcript: string = msg.transcript || "";
        setUserTranscript(transcript);
        const questionIndex = Math.min(answerCountRef.current, Math.max(questionsRef.current.length - 1, 0));
        const retries = answerRetryRef.current[questionIndex] || 0;
        const substantive = isSubstantiveTranscript(transcript);
        
        if (!substantive && retries < 1) {
          answerRetryRef.current[questionIndex] = retries + 1;
          const channel = dcRef.current;
          if (channel?.readyState === "open") {
            try {
              // Cancel any active response before injecting system turn
              if (responseInProgressRef.current) {
                channel.send(JSON.stringify({ type: "response.cancel" }));
                responseInProgressRef.current = false;
              }
              channel.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "message",
                  role: "system",
                  content: [
                    {
                      type: "input_text",
                      text: "Candidate response was non-substantive or noise. Re-ask the same question once, ask for a clear specific example, then wait silently.",
                    },
                  ],
                },
              }));
              channel.send(JSON.stringify({ type: "response.create" }));
            } catch {
              // ignore realtime re-ask failures
            }
          }
          break;
        }
        
        answerRetryRef.current[questionIndex] = 0;
        answerCountRef.current += 1;
        answersRef.current = [
          ...answersRef.current,
          substantive ? transcript : "[insufficient response]",
        ];
        if (answerCountRef.current >= questionsRef.current.length) {
          window.setTimeout(() => {
            void doGenerateFeedbackRef.current();
          }, 4500);
        }
        break;
      }
      case "error":
        setError(`Oops! Something went wrong with the connection: ${msg.error?.message ?? "Unknown error"}`);
        setStatus("error");
        break;
      default:
        break;
    }
  };

  const parseQuestions = (body: string): string[] =>
    body
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\d+[\).\-]?\s*/, "").trim())
      .filter((line) => line.length > 0);

  const startRealtimeSession = async (questions: string[], selectedTier: StarrTierId) => {
    setStatus("connecting");

    try {
      await ensureAudioContext();

      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, tier: selectedTier, userName: user?.firstName?.trim() || "" }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        setError(sessionData.error || "We couldn't start the session. Try refreshing and try again!");
        setStatus("error");
        return;
      }

      const { clientSecret, runtimeBehavior: nextRuntimeBehavior } = sessionData as {
        clientSecret: string;
        runtimeBehavior?: Partial<TierRuntimeBehavior>;
      };

      const resolvedRuntimeBehavior = {
        ...getDefaultRuntimeBehavior(selectedTier),
        ...(nextRuntimeBehavior || {}),
      };
      runtimeBehaviorRef.current = resolvedRuntimeBehavior;
      setRuntimeBehavior(resolvedRuntimeBehavior);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setError("Oops! The connection dropped. Try reconnecting.");
          setStatus("error");
          cleanup();
        }
      };

      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      audioEl.setAttribute("playsinline", "true");
      document.body.appendChild(audioEl);
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
        void audioEl.play().catch(() => undefined);
        void attachAiAnalyser(audioEl);
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      await attachMicAnalyser(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (event) => {
        handleDataChannelMessage(event.data);
      });

      dc.addEventListener("error", () => {
        setError("Oops! There was a connection issue. Please try again.");
        setStatus("error");
      });

      dc.addEventListener("open", () => {
        feedbackTriggeredRef.current = false;
        setStatus("interview");

        const firstQuestion = questions[0];

        window.setTimeout(() => {
          dc.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "system",
                content: [
                  {
                    type: "input_text",
                    text: `You are a professional interview coach. Ask the first question naturally and wait for the user's response: ${firstQuestion}`,
                  },
                ],
              },
            })
          );

          dc.send(JSON.stringify({ type: "response.create" }));
        }, 400);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      const answerSdp = await sdpRes.text();

      if (!sdpRes.ok) {
        setError(`Oops! We couldn't connect. Try again or refresh the page. (${answerSdp})`);
        setStatus("error");
        cleanup();
        return;
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Oops! Something went wrong. Try refreshing the page.";
      setError(message);
      setStatus("error");
    }
  };

  const startGenerate = async (resumeText: string, jobText: string, selectedTier: StarrTierId) => {
    setStatus("generating");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText,
          job: jobText,
          jobLink: jobLinkRef.current,
          tier: selectedTier,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Oops! We couldn't load your questions. Try again?");
        setStatus("error");
        return;
      }
      const list = parseQuestions(data.questions || "");
      if (!list.length) {
        setError("Hmm, we couldn't build questions from that. Try a different job description?");
        setStatus("error");
        return;
      }
      questionsRef.current = list;
      answerCountRef.current = 0;
      answersRef.current = [];
      answerRetryRef.current = {};
      responseInProgressRef.current = false;
      setSegmentProgress(0);
      await startRealtimeSession(list, selectedTier);
    } catch {
      setError("Something went wrong on our end. Try again in a moment!");
      setStatus("error");
    }
  };

  const handleSelectTier = async (selectedTier: StarrTierId) => {
    if (!isTierUnlocked(completedTiers, selectedTier)) {
      setError("That level is locked. Finish the previous level to unlock it!");
      return;
    }
    setError("");
    setAiLevel(0);
    setUserLevel(0);
    setActiveSpeaker(null);
    setInterruptActive(false);
    setSilenceAnchorUntil(0);
    setSelectedTier(selectedTier);
    selectedTierRef.current = selectedTier;
    runtimeBehaviorRef.current = getDefaultRuntimeBehavior(selectedTier);
    setRuntimeBehavior(runtimeBehaviorRef.current);
    await startGenerate(resumeRef.current, jobRef.current, selectedTier);
  };

  const getStatusLabel = () => {
    switch (status) {
      case "loading":
      case "generating":
        return "Generating your interview scenario...";
      case "connecting":
        return "Routing live audio and building the room...";
      case "feedback":
        return "Generating your STARR feedback...";
      case "finished":
        return "Interview completed.";
      case "error":
        return "Something went wrong.";
      default:
        return "Preparing...";
    }
  };

  const tierConfigs = getAllStarrTierConfigs();
  const coachSubtitle = interruptActive
    ? "Interrupt armed"
    : aiSpeaking
      ? "TTS output live"
      : nowMs < silenceAnchorUntil
        ? `Silence anchor ${Math.max(1, Math.ceil((silenceAnchorUntil - nowMs) / 1000))}s`
        : "Awaiting response";
  const userSubtitle = userSpeaking ? "Mic input live" : userTranscript ? "Mic monitoring" : "Waiting for voice";

  return (
    <div className="lp-root">
      <main>
        <section className="iv-session">
          {status === "selection" && (
            <div className="iv-selection-grid">
              <h1 className="lp-h2">Choose Your Intensity Level</h1>
              <div style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => router.push("/growthhub")}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#9ca3af",
                    borderRadius: 8,
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  ← Return to GrowthHub
                </button>
              </div>
              <p className={styles.selectionSubtext}>
                STARR Lab signal routing is live. Pick the next room and keep climbing sequentially.
              </p>
              {!tierProgressReady && (
                <p className={styles.selectionSubtext}>Loading your tier unlock progress...</p>
              )}
          <div className={styles.levelCards}>
                {(["Casual", "Professional", "Surgical"] as const).map((intensityGroup) => {
                  const groupItems = tierConfigs.filter((item) => getIntensityLabel(item.tier).label === intensityGroup);
                  const groupColor = getIntensityLabel(groupItems[0]?.tier ?? 1).color;
                  return (
                    <div key={intensityGroup} style={{ gridColumn: "1 / -1" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: groupColor, padding: "2px 10px", borderRadius: 4, border: `1px solid ${groupColor}40`, background: `${groupColor}12` }}>
                          {intensityGroup}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          {intensityGroup === "Casual" && "Tiers 1–3 — Build confidence, structure, and team-fit signals"}
                          {intensityGroup === "Professional" && "Tier 4 — Mid-career ownership & growth mindset — unlock via Admin Controls"}
                          {intensityGroup === "Surgical" && "Tiers 5–8 — Operational pressure, strategy, executive pushback"}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
                        {groupItems.map((item) => {
                          const unlocked = isTierUnlocked(completedTiers, item.tier);
                          const completed = completedTiers.includes(item.tier);
                          const intensity = getIntensityLabel(item.tier);

                          return (
                            <div
                              key={item.tier}
                              className={`${styles.atomicCard} glass-card${!unlocked ? ` ${styles.lockedCard}` : ""}`}
                              onClick={() => unlocked && void handleSelectTier(item.tier)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => event.key === "Enter" && unlocked && void handleSelectTier(item.tier)}
                              aria-disabled={!unlocked}
                            >
                              <div className={styles.atomicIconWrapper}>
                                <div className={`${styles.atomicIcon} ${styles.medium}`} />
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: intensity.color }}>
                                  {intensity.label}
                                </span>
                              </div>
                              <h3 className={styles.atomicTitle}>Tier {item.tier}: {item.title}</h3>
                              <div className={styles.atomicDetails}>
                                <span style={{ color: completed ? "#34d399" : unlocked ? "#10b981" : "#6b7280", fontWeight: 700, fontSize: "0.88rem" }}>
                                  {completed ? "✓ Completed" : unlocked ? "Unlocked" : "🔒 Locked"}
                                </span>
                                <p style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 4 }}>
                                  {item.scenarioTitle} · {item.persona}
                                </p>
                                {!unlocked && item.tier === 4 && (
                                  <p style={{ color: "#f59e0b", fontSize: "0.73rem", marginTop: 4 }}>
                                    Unlockable via Admin Controls
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(status === "loading" || status === "generating" || status === "connecting") && (
            <div className={styles.loadingShell}>
              <div className={styles.loadingHalo} />
              <p className={styles.loadingLabel}>{getStatusLabel()}</p>
            </div>
          )}

          {status === "interview" && (
            <div className={styles.interviewShell}>
              <div className={styles.nudgeCluster}>
                <SignalNudge
                  label="HC"
                  overline="Emerald Signal Box"
                  subtitle={coachSubtitle}
                  canvasRef={aiCanvasRef}
                  isActive={activeSpeaker === "ai"}
                  level={aiLevel}
                  resting={nowMs < silenceAnchorUntil || (!aiSpeaking && aiLevel < AI_ACTIVITY_THRESHOLD)}
                  accent={interruptActive ? "alert" : "coach"}
                  segments={isTierEight ? runtimeBehavior.multiPartSegments : 0}
                  segmentProgress={isTierEight ? segmentProgress : 0}
                />
                <SignalNudge
                  label={speakerName}
                  subtitle={userSubtitle}
                  canvasRef={userCanvasRef}
                  isActive={activeSpeaker === "user"}
                  level={userLevel}
                  resting={!userSpeaking && userLevel < USER_ACTIVITY_THRESHOLD}
                  accent="user"
                />
              </div>
              <button className={styles.endButton} onClick={handleEndInterview}>
                End Session
              </button>
            </div>
          )}

          {status === "feedback" && (
            <div className={styles.loadingShell}>
              <div className={styles.loadingHalo} />
              <p className={styles.loadingLabel}>{getStatusLabel()}</p>
            </div>
          )}

          {status === "finished" && feedback && (
            <div className="iv-feedback glass-card">
              <div className="iv-feedback-header">
                <span className="lp-eyebrow">Interview Complete</span>
                <h2 className="lp-h2" style={{ marginBottom: 0 }}>Your Performance Feedback</h2>
              </div>
              <div
                className="iv-feedback-body md-body"
                dangerouslySetInnerHTML={{
                  __html: formatFeedbackHtml(feedback),
                }}
              />
              <div className="iv-feedback-actions">
                <button className="lp-btn-primary" onClick={() => router.push("/growthhub")}>
                  GrowthHub
                </button>
                <button className="lp-btn-ghost" onClick={() => router.push("/voice")}>
                  Retry Interview
                </button>
              </div>
            </div>
          )}

          {(status === "error" || error) && (
            <div className="iv-error glass-card">
              <p className="iv-error-msg">{error || "Something went wrong."}</p>
              <button className="lp-btn-primary" onClick={() => router.push("/voice")}>
                Go Back
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}