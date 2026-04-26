"use client";

import { Suspense, useState, useRef, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import mammoth from "mammoth";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { findInterviewSession } from "../lib/interviewStorage";
import {
  clearInterviewDraft,
  loadInterviewDraft,
  loadSavedResume,
  saveInterviewDraft,
  saveSavedResume,
} from "../lib/resumeStorage";
import "../growthhub/page.css";

const PROFILE_KEY = "hirelyProfile";
const KJ_EXTRACT_KEY = "hirelyKjExtract";

type PdfTextContent = { items: Array<{ str?: string }> };
type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
type PdfDocument = { numPages: number; getPage: (index: number) => Promise<PdfPage> };
type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};
type PdfJsWindow = Window & typeof globalThis & { pdfjsLib?: PdfJsLib; pdfjs?: PdfJsLib };

function ResumeIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M12 8H29L37 16V40H12V8Z" />
      <path d="M29 8V16H37" />
      <path d="M18 23H31" />
      <path d="M18 29H31" />
      <path d="M18 35H27" />
    </svg>
  );
}

function JobIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M8 16H40V38H8V16Z" />
      <path d="M18 16V12C18 10.9 18.9 10 20 10H28C29.1 10 30 10.9 30 12V16" />
      <path d="M8 24H40" />
      <path d="M22 24H26" />
    </svg>
  );
}

function MicAlertIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 8C20.7 8 18 10.7 18 14V24C18 27.3 20.7 30 24 30C27.3 30 30 27.3 30 24V14C30 10.7 27.3 8 24 8Z" />
      <path d="M14 22V24C14 29.5 18.5 34 24 34C29.5 34 34 29.5 34 24V22" />
      <path d="M24 34V40" />
      <path d="M19 40H29" />
      <path d="M12 12L36 36" />
    </svg>
  );
}

function VoiceInterviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const [resume, setResume] = useState("");
  const [fileName, setFileName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [job, setJob] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [error, setError] = useState("");
  const [micStatus, setMicStatus] = useState<"idle" | "granted" | "denied">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request mic permission on page load
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        setMicStatus("granted");
      })
      .catch(() => {
        setMicStatus("denied");
      });
  }, []);

  useEffect(() => {
    const savedResume = loadSavedResume();
    if (savedResume) {
      setResume(savedResume.text);
      setFileName(savedResume.fileName);
    }

    const draft = loadInterviewDraft();
    if (draft) {
      if (draft.resume) setResume(draft.resume);
      if (draft.jobTitle) setJobTitle(draft.jobTitle);
      if (draft.job) setJob(draft.job);
      if (draft.jobLink) setJobLink(draft.jobLink);
    }

    const mode = searchParams.get("mode");
    const sessionId = searchParams.get("sessionId");

    if (mode === "retry" && sessionId) {
      const session = findInterviewSession(sessionId, userId);
      if (session) {
        setResume(session.resume);
        setJobTitle(session.jobTitle || "");
        setJob(session.job);
        setJobLink(sessionStorage.getItem("interview_job_link") || "");
        setFileName("Restored from previous session");
      }
      return;
    }

    if (mode === "new") {
      setResume("");
      setFileName("");
      setJobTitle("");
      setJob("");
      setJobLink("");
    }
  }, [searchParams, userId]);

  async function syncKjFromResume(resumeText: string) {
    try {
      const res = await fetch("/api/kj/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      if (!res.ok) return;
      const extracted = await res.json() as {
        knownJobTitle?: string;
        coreSkills?: string[];
        city?: string;
        state?: string;
        zip?: string;
      };

      sessionStorage.setItem(KJ_EXTRACT_KEY, JSON.stringify(extracted));
      localStorage.setItem("hirelyKjData", JSON.stringify(extracted));

      const raw = localStorage.getItem(PROFILE_KEY);
      const profile = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      const merged = {
        ...profile,
        city: (profile.city as string) || extracted.city || "",
        state: (profile.state as string) || extracted.state || "",
        zip: (profile.zip as string) || extracted.zip || "",
        currentJobTitle:
          (profile.currentJobTitle as string) || extracted.knownJobTitle || "",
        preferredRole:
          (profile.preferredRole as string) || extracted.knownJobTitle || "",
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new StorageEvent("storage", { key: PROFILE_KEY }));
    } catch {
      // Non-blocking; interview setup should continue even if extraction fails.
    }
  }

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
      await new Promise((resolve) => { script.onload = resolve; });
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
    try {
      let text = "";
      if (file.type === "text/plain") {
        text = await readTextFile(file);
      } else if (file.type === "application/pdf") {
        text = await readPDFFile(file);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        text = await readDOCXFile(file);
      } else if (file.type === "application/msword") {
        setError("DOC files are not supported. Please convert to DOCX.");
        return;
      } else {
        setError("Unsupported file type. Please upload PDF, DOCX, or TXT.");
        return;
      }
      setResume(text);
      setFileName(file.name);
      setError("");
      saveSavedResume({ text, fileName: file.name });
      await syncKjFromResume(text);
    } catch {
      setError("Unable to read the file. Please try a different file.");
    }
  };

  const startInterview = () => {
    const normalizedLink = jobLink.trim();
    const normalizedJobTitle = jobTitle.trim() || (normalizedLink ? "Role from listing" : "");

    if (!resume.trim() || !normalizedJobTitle || (!job.trim() && !normalizedLink)) {
      setError("Please provide your resume and either a job description or job link. A job title is only required when no link is provided.");
      return;
    }

    const normalizedJob = job.trim();
    const jobPayload = normalizedJob || `Job listing URL: ${normalizedLink}`;

    saveInterviewDraft({
      resume,
      jobTitle: normalizedJobTitle,
      job: jobPayload,
      jobLink: normalizedLink,
    });
    router.push("/voice/interview");
  };

  const clearAll = () => {
    setResume("");
    setFileName("");
    setJobTitle("");
    setJob("");
    setJobLink("");
    setError("");
    clearInterviewDraft();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="lp-root lp-nudge-typography vi-nudge-typography lp-accelerator-theme">
      {/* ── MIC DENIED BANNER ── */}
      {micStatus === "denied" && (
        <div className="vi-mic-banner">
          <span className="vi-mic-icon"><MicAlertIcon /></span>
          <span>
            Microphone access was denied. Please allow microphone access in your browser settings to use mock interviews.
          </span>
        </div>
      )}

      {/* ── MIC GRANTED TOAST ── */}
      {micStatus === "granted" && (
        <div className="vi-mic-banner vi-mic-banner--ok">
          <span>✓ Microphone ready</span>
        </div>
      )}

      <main className="gh-main">
        {userId && (
          <Link href="/growthhub" className="gh-back-link" style={{ marginBottom: 18 }}>
            ← GrowthHub
          </Link>
        )}
        <section className="gh-header-row" style={{ marginBottom: 36 }}>
          <div className="gh-header-left">
            <p className="gh-eyebrow">Mock Interview</p>
            <h1 className="gh-h1">Speak like you are in the interview.</h1>
            <p className="gh-first-sub">
              Upload your resume and job description. Hirely generates recruiter-style prompts and adapts to your answers in real time.
            </p>
          </div>
          <div className="gh-sidebar-card glass-card" style={{ minWidth: 300, animation: "gh-modal-slide-in 0.3s ease both" }}>
            <span className="gh-readiness-pill">Live Signal Ready</span>
            <div className="gh-first-orb" style={{ margin: "18px auto 10px", width: "fit-content" }}>
              <div className="lp-atomic-hero">
                <div className="lp-atomic-ring lp-atomic-ring--outer" />
                <div className="lp-atomic-ring lp-atomic-ring--inner" />
                <div className="lp-atomic-core">HC</div>
              </div>
            </div>
            <p className="gh-sidebar-body" style={{ marginBottom: 0, color: "#10b981", animation: "gh-emerald-pulse 1.8s ease-in-out infinite alternate" }}>
              Emerald signal active
            </p>
          </div>
        </section>

        <section className="gh-body">
          <div className="vi-setup">
            <p className="gh-eyebrow vi-setup-overline">Upload</p>
            <h2 className="gh-h1 vi-setup-heading">UPLOAD YOUR RESUME &amp; JOB TARGET</h2>
            <p className="lp-section-sub vi-setup-sub">Takes 30 seconds. No account needed.</p>

            <div className="vi-cards">
            {/* Resume upload card */}
            <div className="vi-input-card glass-card">
              <div className="vi-card-header">
                <span className="vi-card-icon"><ResumeIcon /></span>
                <div>
                  <div className="vi-card-label">Resume</div>
                  <div className="vi-card-hint">PDF, DOCX, or TXT</div>
                </div>
                {fileName && <span className="vi-card-badge">✓ Loaded</span>}
              </div>

              <input
                ref={fileInputRef}
                id="resumeFile"
                type="file"
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleResumeUpload}
                title="Upload resume file"
                className="vi-file-input-hidden"
              />

              {fileName ? (
                <div className="vi-file-loaded">
                  <span className="vi-file-name">{fileName}</span>
                  <button
                    className="vi-replace-btn"
                    onClick={() => { setResume(""); setFileName(""); fileInputRef.current!.value = ""; fileInputRef.current?.click(); }}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <button
                  className="vi-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="vi-upload-icon">↑</span>
                  Click to upload resume
                </button>
              )}

              <p className="vi-upload-sub">Supports PDF, DOCX, and TXT files</p>
            </div>

            {/* Job description card */}
            <div className="vi-input-card glass-card">
              <div className="vi-card-header">
                <span className="vi-card-icon"><JobIcon /></span>
                <div>
                  <div className="vi-card-label">Job Target</div>
                  <div className="vi-card-hint">Title + description or listing URL</div>
                </div>
                <button type="button" className="vi-clear-all-btn" onClick={clearAll}>
                  Clear All
                </button>
                {jobTitle.trim() && (job.trim().length > 40 || jobLink.trim().length > 8) && <span className="vi-card-badge">✓ Added</span>}
              </div>

              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job Title (required only if no link is provided)"
                className="vi-textarea"
              />

              <textarea
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder="Paste the job description here (optional if you provide a link below)"
                className="vi-textarea vi-textarea--fill"
              />

              <input
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                placeholder="Or paste job listing URL (LinkedIn, Indeed, company site)"
                className="vi-textarea"
                aria-label="Job listing URL"
              />
            </div>
          </div>

          {error && <div className="lp-error vi-error">{error}</div>}

          <div className="vi-cta">
            <button
              className="lp-btn-primary lp-btn-lg"
              onClick={startInterview}
              disabled={!resume.trim() || (!job.trim() && !jobLink.trim()) || (!jobTitle.trim() && !jobLink.trim())}
            >
              Start your interview
            </button>
            <p className="vi-cta-note">
              Requires microphone access · Chrome or Edge recommended
            </p>
          </div>
          </div>

          <aside className="gh-sidebar">
            <div className="gh-sidebar-card glass-card" style={{ animation: "gh-modal-slide-in 0.3s ease both", animationDelay: "0.08s" }}>
              <p className="gh-sidebar-label">Interview Signal</p>
              <p className="gh-sidebar-body">
                Your session runs in live voice mode with adaptive follow-up pressure and recruiter-style pacing.
              </p>
            </div>
            <div className="gh-sidebar-card glass-card" style={{ animation: "gh-modal-slide-in 0.3s ease both", animationDelay: "0.16s" }}>
              <p className="gh-sidebar-label">AI Transcript</p>
              <p className="gh-sidebar-body">Questions are captured during the interview and saved in your archive report.</p>
            </div>
            <div className="gh-sidebar-card glass-card" style={{ animation: "gh-modal-slide-in 0.3s ease both", animationDelay: "0.24s" }}>
              <p className="gh-sidebar-label">Your Transcript</p>
              <p className="gh-sidebar-body">Your responses are analyzed for STARR structure, strengths, and weak points after each session.</p>
            </div>
          </aside>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-brand">Hirely Coach</div>
            <p className="lp-footer-tagline">AI-powered interview prep that actually challenges you.</p>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col lp-footer-col--product">
              <p className="lp-footer-col-label">Product</p>
              <Link href="/voice">Mock Interview</Link>
              <Link href="/#metrics">10 Metrics</Link>
              <Link href="/#how">How It Works</Link>
            </div>
            <div className="lp-footer-col lp-footer-col--account">
              <p className="lp-footer-col-label">Account</p>
              <Link href="/history">My History</Link>
              <Link href="/admin/jobs">Admin Panel</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} Hirely Coach. Built for smarter interview prep.</p>
        </div>
      </footer>
    </div>
  );
}

export default function VoiceInterviewPage() {
  return (
    <Suspense fallback={<div className="lp-root" style={{ padding: 32, color: "#94a3b8" }}>Loading interview setup...</div>}>
      <VoiceInterviewPageInner />
    </Suspense>
  );
}
