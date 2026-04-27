"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  saveGrowthHubSnapshot,
  saveInterviewSession,
  savePendingGuestSession,
} from "../../lib/interviewStorage";
import CoachTooltip from "../../components/CoachTooltip";
import { loadInterviewDraft } from "../../lib/resumeStorage";
import { syncInterviewProgress } from "../../lib/interviewProgress";
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

function makeSessionTimestamp() {
  return Date.now();
}

export default function InterviewPage() {
  const router = useRouter();
  const { userId, isSignedIn } = useAuth();

  const [status, setStatus] = useState<Status>("selection");
  const [answeredCount, setAnsweredCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [userTranscript, setUserTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
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

  const cleanup = () => {
    if (dcRef.current) { try { dcRef.current.close(); } catch { /* ignore */ } dcRef.current = null; }
    if (pcRef.current) { try { pcRef.current.close(); } catch { /* ignore */ } pcRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (audioElRef.current) { audioElRef.current.srcObject = null; audioElRef.current.remove(); audioElRef.current = null; }
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
      setFeedback(generatedFeedback);
      setStatus("finished");
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

      if (!isSignedIn) {
        savePendingGuestSession(session, snapshot);
      } else {
        syncInterviewProgress(snapshot).catch(() => {
          // Non-blocking: local save already completed.
        });
      }
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
      };

      // mic input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
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
              <div className={`iv-signal-box glass-card${aiSpeaking ? " iv-signal-box--active" : ""}`}>
                <p className="iv-signal-label">Emerald Signal Box</p>
                <div className="iv-signal-orb" aria-hidden="true">
                  <span className="iv-signal-ring iv-signal-ring--outer" />
                  <span className="iv-signal-ring iv-signal-ring--inner" />
                  <span className="iv-signal-core">HC</span>
                </div>
                <div className={`iv-signal-wave${aiSpeaking ? " iv-signal-wave--active" : ""}`}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span key={i} className="iv-signal-bar" style={{ animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
                <p className="iv-signal-sub">{aiSpeaking ? "HC is speaking..." : "Listening mode"}</p>
              </div>

              <div className="iv-progress-row">
                <span className="iv-progress-label">
                  Question {answeredCount + 1} of {totalQuestions}
                </span>
                <CoachTooltip context="interview" message="Stay calm and lead with a concrete result. Use the STARR structure: Situation → Task → Action → Result → Reflection." placement="bottom" />
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

              {/* AI Speaking */}
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

                {/* AI waveform */}
                <div className={`iv-waveform iv-waveform--ai${aiSpeaking ? " iv-waveform--active" : ""}`}>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="iv-wave-bar" style={{ animationDelay: `${(i * 0.06) % 0.8}s` }} />
                  ))}
                </div>

                {aiTranscript && aiSpeaking && (
                  <p className="iv-transcript iv-transcript--ai">{aiTranscript}</p>
                )}
              </div>

              {/* User Speaking */}
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

                {/* User waveform */}
                <div className={`iv-waveform iv-waveform--user${userSpeaking ? " iv-waveform--active" : ""}`}>
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="iv-wave-bar" style={{ animationDelay: `${(i * 0.07) % 0.9}s` }} />
                  ))}
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
              <div className="iv-feedback-header">
                <span className="lp-eyebrow">Interview Complete</span>
                <h2 className="lp-h2" style={{ marginBottom: 0 }}>Your Performance Feedback</h2>
              </div>
              <div className="iv-feedback-body">{feedback}</div>
              <div className="iv-feedback-actions">
                <button className="lp-btn-primary" onClick={() => router.push("/history")}>
                  View History
                </button>
                <button className="lp-btn-ghost" onClick={() => router.push("/voice")}>
                  Start New Interview
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