"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  saveGrowthHubSnapshot,
  saveInterviewSession,
  savePendingGuestSession,
} from "../../lib/interviewStorage";
import CoachTooltip from "../../components/CoachTooltip";
import { loadInterviewDraft } from "../../lib/resumeStorage";
import styles from "./page.module.css";

type Status =
  | "selection"
  | "loading"
  | "generating"
  | "connecting"
  | "interview"
  | "feedback"
  | "finished"
  | "error";

type InterviewLevel = "quick" | "medium" | "intensive";
type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
};

type VisualState = "ai-speaking" | "user-speaking" | "silence";

function makeSessionTimestamp() {
  return Date.now();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extractSection(feedback: string, header: string): string {
  const start = feedback.indexOf(header);
  if (start < 0) return "";
  const rest = feedback.slice(start + header.length);
  const nextHeader = rest.search(/\n###\s+/);
  return (nextHeader >= 0 ? rest.slice(0, nextHeader) : rest).trim();
}

function extractWeakPoints(feedback: string): string[] {
  const improvement = extractSection(feedback, "### Areas for Improvement");
  return Array.from(improvement.matchAll(/\*\*([^*]+)\*\*/g))
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 3);
}

function extractStrongPoints(feedback: string): string[] {
  const raw =
    extractSection(feedback, "### Strengths") ||
    extractSection(feedback, "### Strong Points") ||
    extractSection(feedback, "### What You Did Well");
  return Array.from(raw.matchAll(/\*\*([^*]+)\*\*/g))
    .map((m) => m[1].trim())
    .filter(Boolean)
    .slice(0, 3);
}

function formatFeedbackHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />");
}

function calcRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const centered = (buffer[i] - 128) / 128;
    sumSquares += centered * centered;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

function estimatePitch(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer);
  let zeroCrossings = 0;
  let prevAbove = buffer[0] > 128;

  for (let i = 1; i < buffer.length; i += 1) {
    const above = buffer[i] > 128;
    if (above !== prevAbove) {
      zeroCrossings += 1;
      prevAbove = above;
    }
  }

  const freq = (zeroCrossings * analyser.context.sampleRate) / (2 * buffer.length);
  return clamp((freq - 80) / 260, 0, 1);
}

function drawUserWave(
  canvas: HTMLCanvasElement,
  state: VisualState,
  level: number,
  pitch: number,
  t: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const centerY = height * 0.52;
  const isActive = state === "user-speaking";
  const flatAlpha = state === "silence" ? 0.1 : 0.14;
  const baseAmp = isActive ? clamp(level * 64 + 6, 8, 52) : 0;
  const complexity = isActive ? 1.6 + pitch * 2.4 : 1;

  if (!isActive) {
    ctx.strokeStyle = `rgba(120, 136, 160, ${flatAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    return;
  }

  const layers = [
    { alpha: 0.4, shift: 0, width: 1.6 },
    { alpha: 0.26, shift: 0.8, width: 1.2 },
    { alpha: 0.16, shift: 1.5, width: 1 },
  ];

  for (const layer of layers) {
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, `rgba(148, 163, 184, ${layer.alpha * 0.58})`);
    gradient.addColorStop(0.45, `rgba(56, 189, 248, ${layer.alpha})`);
    gradient.addColorStop(1, `rgba(148, 163, 184, ${layer.alpha * 0.5})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = layer.width;
    ctx.beginPath();

    for (let x = 0; x <= width; x += 4) {
      const progress = x / width;
      const envelope = Math.sin(progress * Math.PI);
      const wave =
        Math.sin((x / 28) * complexity + t * 0.005 + layer.shift) * 0.75 +
        Math.sin((x / 13) * (complexity * 0.65) - t * 0.003 + layer.shift * 0.5) * 0.4;
      const y = centerY + wave * baseAmp * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export default function InterviewPage() {
  const router = useRouter();
  const { isSignedIn, userId } = useAuth();

  const [status, setStatus] = useState<Status>("selection");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [visualState, setVisualState] = useState<VisualState>("silence");
  const [sessionStarrScore, setSessionStarrScore] = useState(0);
  const [error, setError] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const resumeRef = useRef("");
  const jobRef = useRef("");
  const jobLinkRef = useRef("");
  const questionsRef = useRef<string[]>([]);
  const answersRef = useRef<string[]>([]);
  const answerCountRef = useRef(0);
  const aiTranscriptBufferRef = useRef("");
  const feedbackTriggeredRef = useRef(false);
  const doGenerateFeedbackRef = useRef<() => Promise<void>>(async () => {});
  const selectedLevelRef = useRef<InterviewLevel>("medium");

  const aiAudioContextRef = useRef<AudioContext | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const aiSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const aiBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const micBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const meshRef = useRef<HTMLDivElement | null>(null);
  const userWaveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualFrameRef = useRef<number | null>(null);

  const aiSpeakingRef = useRef(false);
  const userSpeakingRef = useRef(false);
  const aiLevelRef = useRef(0);
  const userLevelRef = useRef(0);
  const userPitchRef = useRef(0);
  const visualStateRef = useRef<VisualState>("silence");

  useEffect(() => {
    aiSpeakingRef.current = aiSpeaking;
  }, [aiSpeaking]);

  useEffect(() => {
    userSpeakingRef.current = userSpeaking;
  }, [userSpeaking]);

  const formattedFeedback = useMemo(
    () => (feedback ? `<p>${formatFeedbackHtml(feedback)}</p>` : ""),
    [feedback]
  );

  const feedbackStrongPoints = useMemo(() => extractStrongPoints(feedback), [feedback]);
  const feedbackWeakPoints = useMemo(() => extractWeakPoints(feedback), [feedback]);

  const ensureVisualState = useCallback((next: VisualState) => {
    if (visualStateRef.current === next) return;
    visualStateRef.current = next;
    setVisualState(next);
  }, []);

  const setupMicAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (!micAudioContextRef.current) {
        micAudioContextRef.current = new AudioContext();
      }
      const ctx = micAudioContextRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      micSourceNodeRef.current?.disconnect();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      micSourceNodeRef.current = source;
      micAnalyserRef.current = analyser;
      micBufferRef.current = new Uint8Array(analyser.fftSize);
    } catch {
      // If analyser setup fails, realtime interview still works.
    }
  }, []);

  const setupAiAnalyser = useCallback((stream: MediaStream) => {
    try {
      if (!aiAudioContextRef.current) {
        aiAudioContextRef.current = new AudioContext();
      }
      const ctx = aiAudioContextRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      aiSourceNodeRef.current?.disconnect();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);

      aiSourceNodeRef.current = source;
      aiAnalyserRef.current = analyser;
      aiBufferRef.current = new Uint8Array(analyser.fftSize);
    } catch {
      // If analyser setup fails, fallback to event-based speaking states.
    }
  }, []);

  const startVisualizationLoop = useCallback(() => {
    if (visualFrameRef.current) {
      cancelAnimationFrame(visualFrameRef.current);
      visualFrameRef.current = null;
    }

    const tick = (time: number) => {
      const aiAnalyser = aiAnalyserRef.current;
      const micAnalyser = micAnalyserRef.current;
      const aiBuffer = aiBufferRef.current;
      const micBuffer = micBufferRef.current;

      const aiInstant = aiAnalyser && aiBuffer ? calcRms(aiAnalyser, aiBuffer) : 0;
      const userInstant = micAnalyser && micBuffer ? calcRms(micAnalyser, micBuffer) : 0;
      const pitchInstant = micAnalyser && micBuffer ? estimatePitch(micAnalyser, micBuffer) : 0;

      aiLevelRef.current = aiLevelRef.current * 0.82 + aiInstant * 0.18;
      userLevelRef.current = userLevelRef.current * 0.78 + userInstant * 0.22;
      userPitchRef.current = userPitchRef.current * 0.72 + pitchInstant * 0.28;

      const userActive = userSpeakingRef.current || userLevelRef.current > 0.045;
      const aiActive = aiSpeakingRef.current || aiLevelRef.current > 0.042;

      const nextState: VisualState = userActive
        ? "user-speaking"
        : aiActive
        ? "ai-speaking"
        : "silence";

      ensureVisualState(nextState);

      if (meshRef.current) {
        meshRef.current.style.setProperty("--mesh-energy", `${clamp(aiLevelRef.current * 3.2, 0, 1).toFixed(3)}`);
        meshRef.current.style.setProperty("--mesh-spike", `${clamp(aiLevelRef.current * 56, 0, 22).toFixed(2)}px`);
        meshRef.current.style.setProperty("--mesh-spin", `${(8 + aiLevelRef.current * 15).toFixed(2)}s`);
      }

      if (userWaveCanvasRef.current) {
        drawUserWave(
          userWaveCanvasRef.current,
          nextState,
          clamp(userLevelRef.current * 2.4, 0, 1),
          userPitchRef.current,
          time
        );
      }

      visualFrameRef.current = requestAnimationFrame(tick);
    };

    visualFrameRef.current = requestAnimationFrame(tick);
  }, [ensureVisualState]);

  const cleanup = () => {
    if (visualFrameRef.current) {
      cancelAnimationFrame(visualFrameRef.current);
      visualFrameRef.current = null;
    }

    if (aiSourceNodeRef.current) {
      try {
        aiSourceNodeRef.current.disconnect();
      } catch {
        // ignore disconnect failures
      }
      aiSourceNodeRef.current = null;
    }
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {
        // ignore disconnect failures
      }
      micSourceNodeRef.current = null;
    }
    if (aiAudioContextRef.current) {
      void aiAudioContextRef.current.close();
      aiAudioContextRef.current = null;
    }
    if (micAudioContextRef.current) {
      void micAudioContextRef.current.close();
      micAudioContextRef.current = null;
    }

    aiAnalyserRef.current = null;
    micAnalyserRef.current = null;
    aiBufferRef.current = null;
    micBufferRef.current = null;
    aiLevelRef.current = 0;
    userLevelRef.current = 0;
    userPitchRef.current = 0;

    if (dcRef.current) { try { dcRef.current.close(); } catch { /* ignore */ } dcRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch { /* ignore */ } pcRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (audioElRef.current) { audioElRef.current.srcObject = null; audioElRef.current.remove(); audioElRef.current = null; }

    ensureVisualState("silence");
  };

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
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to generate feedback.");
        setFeedback("");
        setStatus("finished");
        return;
      }

      const generatedFeedback = data.feedback || "AI feedback is not available.";
      const createdAt = makeSessionTimestamp();
      const sessionId = crypto.randomUUID();
      const scoreMatch = generatedFeedback.match(/STARR Score:\s*(\d+)\/100/);
      const starrScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
      const weakPoints = extractWeakPoints(generatedFeedback);
      const topWeakness = weakPoints[0] || "";
      const jobTitle =
        jobRef.current.trim().split("\n")[0]?.trim().slice(0, 80) ||
        "Interview Session";

      const session = {
        id: sessionId,
        createdAt,
        resume: resumeRef.current,
        jobTitle,
        job: jobRef.current,
        questions: questionsRef.current,
        answers: answersRef.current,
        feedback: generatedFeedback,
        level: selectedLevelRef.current,
        starrScore,
        transcript: questionsRef.current.map((question, index) => ({
          question,
          answer: answersRef.current[index] || "(no response)",
        })),
        analysis: {
          starrHighlights: {},
          weakPoints,
          strongPoints: [],
        },
      };

      const snapshot = {
        sessionId,
        createdAt,
        starrScore,
        topWeakness,
        jobTitle,
      };

      saveInterviewSession(session, userId);
      saveGrowthHubSnapshot(snapshot, userId);
      // Always mark onboarding done so GrowthHub is accessible after the interview.
      try { window.localStorage.setItem("hirelyProfileDone", "1"); } catch { /* ignore */ }
      if (!isSignedIn) {
        savePendingGuestSession(session, snapshot);
      }

      setSavedSessionId(sessionId);
      setSessionStarrScore(starrScore);
      setFeedback(generatedFeedback);
      setStatus("finished");
    } catch {
      setError("Unable to generate feedback.");
      setFeedback("");
      setStatus("finished");
    }
  }, [isSignedIn, userId]);

  useEffect(() => {
    doGenerateFeedbackRef.current = doGenerateFeedback;
  }, [doGenerateFeedback]);

  const handleEndInterview = async () => {
    await doGenerateFeedbackRef.current();
  };

  const handleDataChannelMessage = (raw: string) => {
    let msg: RealtimeEvent;
    try { msg = JSON.parse(raw); } catch { return; }
    switch (msg.type) {
      case "response.audio.delta":
        setAiSpeaking(true);
        break;
      case "response.audio_transcript.delta":
        aiTranscriptBufferRef.current += msg.delta || "";
        setAiTranscript(aiTranscriptBufferRef.current);
        break;
      case "response.audio.done":
        setAiSpeaking(false);
        aiTranscriptBufferRef.current = "";
        break;
      case "response.audio_transcript.done":
        setAiTranscript("");
        break;
      case "input_audio_buffer.speech_started":
        setUserSpeaking(true);
        setUserTranscript("");
        break;
      case "input_audio_buffer.speech_stopped":
        setUserSpeaking(false);
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const transcript: string = msg.transcript || "";
        setUserTranscript(transcript);
        answerCountRef.current += 1;
        answersRef.current = [...answersRef.current, transcript];
        setAnsweredCount(answerCountRef.current);
        if (answerCountRef.current >= questionsRef.current.length) {
          setTimeout(() => doGenerateFeedbackRef.current(), 4500);
        }
        break;
      }
      case "error":
        setError(`Realtime API error: ${msg.error?.message ?? "Unknown error"}`);
        setStatus("error");
        break;
      default:
        break;
    }
  };

  const parseQuestions = (body: string): string[] =>
    body
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*\d+[\).\-]?\s*/, "").trim())
      .filter((l) => l.length > 0);

  const startRealtimeSession = async (questions: string[]) => {
    setStatus("connecting");

    try {
      const sessionRes = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });

      const sessionData = await sessionRes.json();

      if (!sessionRes.ok) {
        setError(sessionData.error || "Failed to start realtime session.");
        setStatus("error");
        return;
      }

      const { clientSecret } = sessionData;

      // 1. WebRTC setup
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setError("WebRTC connection lost.");
          setStatus("error");
          cleanup();
        }
      };

      // audio output
      const audioEl = document.createElement("audio");
      audioEl.autoplay = true;
      document.body.appendChild(audioEl);
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
        setupAiAnalyser(event.streams[0]);
      };

      // mic input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setupMicAnalyser(stream);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 2. Data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (event) => {
        handleDataChannelMessage(event.data);
      });

      dc.addEventListener("error", () => {
        setError("Data channel error.");
        setStatus("error");
      });

      // 3. Open event
      dc.addEventListener("open", () => {
        setStatus("interview");
        startVisualizationLoop();

        const firstQuestion = questions[0];

        setTimeout(() => {
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

      // 4. SDP handshake
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
        setError(`WebRTC failed: ${answerSdp}`);
        setStatus("error");
        cleanup();
        return;
      }

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect.";
      setError(message);
      setStatus("error");
    }
  };

  const startGenerate = async (resumeText: string, jobText: string, selectedLevel: InterviewLevel) => {
    setStatus("generating");
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: resumeText,
          job: jobText,
          jobLink: jobLinkRef.current,
          level: selectedLevel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to generate interview questions.");
        setStatus("error");
        return;
      }
      const list = parseQuestions(data.questions || "");
      if (!list.length) {
        setError("Could not generate questions. Try a different job description.");
        setStatus("error");
        return;
      }
      questionsRef.current = list;
      setTotalQuestions(list.length);
      await startRealtimeSession(list);
    } catch {
      setError("Server error while generating questions.");
      setStatus("error");
    }
  };

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
    // Stay on selection screen — user picks level before we generate
    return () => { cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectLevel = async (selectedLevel: InterviewLevel) => {
    selectedLevelRef.current = selectedLevel;
    await startGenerate(resumeRef.current, jobRef.current, selectedLevel);
  };

  const getStatusLabel = () => {
    switch (status) {
      case "loading":
      case "generating":
        return "Generating your personalized interview questions...";
      case "connecting":
        return "Connecting to AI interviewer...";
      case "interview":
        if (userSpeaking) return "Listening to your response...";
        if (aiSpeaking) return `Question ${answeredCount + 1} of ${totalQuestions} - AI speaking`;
        return `Question ${answeredCount + 1} of ${totalQuestions} - your turn`;
      case "feedback":
        return "Generating AI feedback on your performance...";
      case "finished":
        return "Interview completed!";
      case "error":
        return "Something went wrong.";
      default:
        return "Preparing...";
    }
  };

  return (
    <div className="lp-root">
      <main>
        <section className="iv-session">
          {(status === "interview" || status === "connecting" || status === "generating") && (
            <div className="iv-end-row">
              <button className="lp-btn-ghost iv-end-btn" onClick={handleEndInterview}>
                End Interview
              </button>
            </div>
          )}

          {/* Level Selection */}
          {status === "selection" && (
            <div className="iv-selection-grid">
              <h1 className="lp-h2">Choose Your Interview Level</h1>
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
                Your session feels like a real recruiter call — no question counter, just a conversation.
              </p>
              <div className={styles.levelCards}>
                {([
                  { id: "quick",     count: "3",  title: "BASIC",     desc: "Foundational intro & character" },
                  { id: "medium",    count: "6",  title: "MEDIUM",    desc: "Career history & scenario-based" },
                  { id: "intensive", count: "9",  title: "INTENSIVE", desc: "Technical, behavioral & culture fit" },
                ] as const).map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.atomicCard} ${styles[item.id]} glass-card`}
                    onClick={() => handleSelectLevel(item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectLevel(item.id)}
                  >
                    <div className={styles.atomicIconWrapper}>
                      <div className={`${styles.atomicIcon} ${styles[item.id]}`} />
                    </div>
                    <h3 className={styles.atomicTitle}>{item.title}</h3>
                    <div className={styles.atomicDetails}>
                      <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.92rem" }}>{item.count} Questions</span>
                      <p style={{ color: "#6b7280", fontSize: "0.82rem", marginTop: 4 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading / Generating / Connecting */}
          {(status === "loading" || status === "generating" || status === "connecting") && (
            <div className="iv-loading-state">
              <div className="iv-spinner" />
              <p className="iv-loading-label">{getStatusLabel()}</p>
            </div>
          )}

          {/* Active interview */}
          {status === "interview" && (
            <>
              <div className={`iv-dual-pulse glass-card iv-dual-pulse--${visualState}`}>
                <div className="iv-coach-panel">
                  <p className="iv-signal-label">Hirely Coach</p>
                  <div className="iv-coach-mesh-wrap" aria-hidden="true">
                    <div ref={meshRef} className="iv-coach-mesh">
                      <span className="iv-coach-glow" />
                      <span className="iv-coach-fluid" />
                      <span className="iv-coach-fluid iv-coach-fluid--alt" />
                      <span className="iv-coach-core">HC</span>
                    </div>
                  </div>
                  <p className="iv-signal-sub">
                    {visualState === "ai-speaking"
                      ? "Coach output active"
                      : visualState === "user-speaking"
                      ? "Coach resting while you speak"
                      : "Coach resting pulse"}
                  </p>
                </div>

                <div className="iv-user-wave-panel">
                  <p className="iv-signal-label">Active Listener</p>
                  <canvas
                    ref={userWaveCanvasRef}
                    className="iv-user-wave-canvas"
                    aria-label="User microphone waveform"
                  />
                  <p className="iv-signal-sub">
                    {visualState === "user-speaking"
                      ? "Mic input detected"
                      : visualState === "ai-speaking"
                      ? "Flattened while coach speaks"
                      : "Listening line idle"}
                  </p>
                </div>
              </div>

              <div className="iv-progress-row">
                <span className="iv-progress-label">
                  Question {answeredCount + 1} of {totalQuestions}
                </span>
                <div className="iv-progress-track">
                  <div
                    className="iv-progress-fill"
                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                  />
                </div>
                <span className="iv-progress-pct">
                  {Math.round((answeredCount / totalQuestions) * 100)}%
                </span>
              </div>

              <div className={`iv-voice-card glass-card${aiSpeaking ? " iv-voice-card--ai-active" : ""}`}>
                <div className="iv-voice-header">
                  <div className="iv-avatar iv-avatar--ai">AI</div>
                  <div>
                    <div className="iv-voice-name">AI Interviewer</div>
                    <div className="iv-voice-status">
                      {aiSpeaking ? "Speaking..." : "Waiting for your response"}
                    </div>
                  </div>
                  <div className={`iv-live-dot${aiSpeaking ? " iv-live-dot--on" : ""}`} />
                </div>

                {aiTranscript && aiSpeaking && (
                  <CoachTooltip
                    context="interview"
                    message="Stay calm and structure your answer: Situation → Task → Action → Result. Lead with a measurable outcome."
                    placement="bottom"
                  >
                    <p className="iv-transcript iv-transcript--ai">{aiTranscript}</p>
                  </CoachTooltip>
                )}
              </div>

              <div className={`iv-voice-card glass-card${userSpeaking ? " iv-voice-card--user-active" : ""}`}>
                <div className="iv-voice-header">
                  <div className="iv-avatar iv-avatar--user">You</div>
                  <div>
                    <div className="iv-voice-name">Your Response</div>
                    <div className="iv-voice-status">
                      {userSpeaking ? "Listening..." : userTranscript ? "Response recorded" : "Waiting for you to speak"}
                    </div>
                  </div>
                  {userSpeaking && <div className="iv-live-dot iv-live-dot--user iv-live-dot--on" />}
                </div>

                {userTranscript && !userSpeaking && (
                  <p className="iv-transcript iv-transcript--user">{userTranscript}</p>
                )}
              </div>
            </>
          )}

          {/* Feedback generating */}
          {status === "feedback" && (
            <div className="iv-loading-state">
              <div className="iv-spinner" />
              <p className="iv-loading-label">Generating your personalized feedback...</p>
            </div>
          )}

          {/* Finished with feedback */}
          {status === "finished" && feedback && (
            <div className="iv-feedback glass-card">
              <div className="iv-fb2-header">
                <div>
                  <span className="lp-eyebrow">Interview Complete</span>
                  <h2 className="lp-h2" style={{ marginBottom: 0 }}>Your Performance Report</h2>
                  {savedSessionId && (
                    <p className="iv-fb2-saved">Session saved to your archive ✓</p>
                  )}
                </div>
                {sessionStarrScore > 0 && (
                  <div className="iv-fb2-score">
                    <span
                      className="iv-fb2-score-num"
                      style={{
                        color:
                          sessionStarrScore >= 75
                            ? "#10b981"
                            : sessionStarrScore >= 50
                            ? "#3b82f6"
                            : "#f59e0b",
                      }}
                    >
                      {sessionStarrScore}
                    </span>
                    <span className="iv-fb2-score-label">/100 STARR</span>
                  </div>
                )}
              </div>

              {(feedbackStrongPoints.length > 0 || feedbackWeakPoints.length > 0) && (
                <div className="iv-fb2-highlights">
                  {feedbackStrongPoints.length > 0 && (
                    <div>
                      <p className="hist-highlight-label hist-highlight-label--strong">Strengths</p>
                      <div className="hist-highlight-list">
                        {feedbackStrongPoints.map((p) => (
                          <span key={p} className="hist-highlight-pill hist-highlight-pill--strong">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {feedbackWeakPoints.length > 0 && (
                    <div>
                      <p className="hist-highlight-label hist-highlight-label--weak">Areas to Improve</p>
                      <div className="hist-highlight-list">
                        {feedbackWeakPoints.map((p) => (
                          <span key={p} className="hist-highlight-pill hist-highlight-pill--weak">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="hist-feedback-body">
                <div
                  className="md-body"
                  dangerouslySetInnerHTML={{ __html: formattedFeedback }}
                />
              </div>

              <div className="iv-feedback-actions">
                <button
                  className="lp-btn-ghost"
                  onClick={() =>
                    savedSessionId
                      ? router.push(`/voice?mode=retry&sessionId=${savedSessionId}`)
                      : router.push("/voice")
                  }
                >
                  ↺ Retry Interview
                </button>
                <button className="lp-btn-primary" onClick={() => router.push("/growthhub")}>
                  Go to GrowthHub →
                </button>
              </div>
            </div>
          )}

          {/* Error */}
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