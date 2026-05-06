"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { loadInterviewHistory } from "../../lib/interviewStorage";
import { saveInterviewDraft, saveTargetJobPacket, type TargetJobPacket } from "../../lib/resumeStorage";
import KjNudge from "../../components/KjNudge";
import "../page.css";
import "./page.css";

type Profile = {
  city?: string;
  state?: string;
  zip?: string;
  preferredRole?: string;
  currentJobTitle?: string;
};

type MatchedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  full_description?: string;
  job_url?: string;
  tags: string[];
  matchScore: number;
  alignmentReason?: string;
  scaryQuestions?: string[];
  source?: "matched" | "manual";
};

const PROFILE_KEY = "hirelyProfile";
const MANUAL_JOBS_KEY = "hirely.targeting.manualJobs.v1";

function ScanIcon() {
  return (
    <svg className="ta-scan-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="M10 1V4" />
      <path d="M10 16V19" />
      <path d="M1 10H4" />
      <path d="M16 10H19" />
    </svg>
  );
}

function JobIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16a1 1 0 011 1v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5 18 17H2L10 2.5Z" />
      <path d="M10 7V11" />
      <circle cx="10" cy="14.25" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function readProfile(): Profile {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as Profile;
  } catch {
    return {};
  }
}

function loadManualJobs(): MatchedJob[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(MANUAL_JOBS_KEY) ?? "[]") as MatchedJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManualJobs(jobs: MatchedJob[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MANUAL_JOBS_KEY, JSON.stringify(jobs.slice(0, 40)));
}

function sanitizeText(text: string) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function summarizeDescription(text: string, limit = 220) {
  const normalized = sanitizeText(text).replace(/\n+/g, " ");
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trimEnd()}...`;
}

function buildCoachSummary(job: MatchedJob) {
  if (job.alignmentReason) return job.alignmentReason;
  const signals = [job.location, job.salary].filter(Boolean).join(" • ");
  const tags = job.tags.slice(0, 3).join(", ");
  return `${job.matchScore}% fit based on your KJ profile${tags ? `, with strongest overlap in ${tags.toLowerCase()}` : ""}${signals ? `. Market signal: ${signals}.` : "."}`;
}

function hasFullDescription(job: MatchedJob) {
  return sanitizeText(job.full_description || job.description).length >= 120;
}

function toTargetJobPacket(job: MatchedJob): TargetJobPacket {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    salary: job.salary,
    description: job.description,
    fullDescription: sanitizeText(job.full_description || job.description),
    jobUrl: job.job_url || "",
    tags: job.tags,
    matchScore: job.matchScore,
    coachSummary: buildCoachSummary(job),
    updatedAt: Date.now(),
  };
}

function makeQuestions(job: MatchedJob) {
  if (job.scaryQuestions?.length) {
    return job.scaryQuestions.slice(0, 3);
  }

  return [
    `Why do you want to join ${job.company} as a ${job.title}?`,
    `Tell me about a measurable result that proves you can succeed in this ${job.title} role.`,
    `Which part of this job scope would you prioritize in your first 90 days${job.location ? ` in ${job.location}` : ""}?`,
  ];
}

function mergeJobs(apiJobs: MatchedJob[], manualJobs: MatchedJob[]) {
  const merged = [...manualJobs, ...apiJobs];
  return merged.filter((job, index, all) => all.findIndex((item) => item.id === job.id) === index);
}

export default function TargetingArrayPage() {
  const router = useRouter();
  const { userId } = useAuth();

  const [query, setQuery] = useState("");
  const [minMatch, setMinMatch] = useState(55);
  const [apiJobs, setApiJobs] = useState<MatchedJob[]>([]);
  const [manualJobs, setManualJobs] = useState<MatchedJob[]>(() => loadManualJobs());
  const [selected, setSelected] = useState<MatchedJob | null>(null);
  const [scanTick, setScanTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [intakeUrl, setIntakeUrl] = useState("");
  const [intakeTitle, setIntakeTitle] = useState("");
  const [intakeCompany, setIntakeCompany] = useState("");
  const [intakeLocation, setIntakeLocation] = useState("");
  const [intakeSalary, setIntakeSalary] = useState("");
  const [intakeDescription, setIntakeDescription] = useState("");
  const [intakeMessage, setIntakeMessage] = useState("");
  const [intakeLoading, setIntakeLoading] = useState(false);

  const history = useMemo(() => loadInterviewHistory(userId), [userId]);
  const resumeText = history[0]?.resume ?? (typeof window !== "undefined" ? sessionStorage.getItem("interview_resume") ?? "" : "");
  const activeKj = (profile.currentJobTitle || profile.preferredRole || "").trim();
  const jobs = useMemo(() => mergeJobs(apiJobs, manualJobs), [apiJobs, manualJobs]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === PROFILE_KEY || event.key === null) {
        setProfile(readProfile());
        setScanTick((value) => value + 1);
      }
      if (event.key === MANUAL_JOBS_KEY) {
        setManualJobs(loadManualJobs());
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMatches() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/jobs/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kjTitle: activeKj,
            city: profile.city,
            state: profile.state,
            query,
            resumeText,
            minMatch,
          }),
        });

        if (!res.ok) throw new Error("Failed to match jobs");
        const payload = await res.json();
        if (!cancelled) {
          setApiJobs((payload.jobs ?? []) as MatchedJob[]);
        }
      } catch {
        if (!cancelled) setError("Unable to load matched roles right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMatches();
    return () => {
      cancelled = true;
    };
  }, [activeKj, minMatch, profile.city, profile.state, query, resumeText, scanTick]);

  const topMatches = jobs.slice(0, 3);
  const averageMatch = jobs.length ? Math.round(jobs.reduce((acc, job) => acc + job.matchScore, 0) / jobs.length) : 0;
  const completeDescriptions = jobs.filter((job) => hasFullDescription(job)).length;

  const practiceRole = (job: MatchedJob) => {
    const questions = makeQuestions(job);
    const packet = toTargetJobPacket(job);
    const roleJobDescription = [
      `${job.title} at ${job.company}`,
      job.location ? `Location: ${job.location}` : "",
      job.salary ? `Salary: ${job.salary}` : "",
      `Coach's Summary: ${packet.coachSummary}`,
      "Full Job Description:",
      packet.fullDescription,
      "Known High-Pressure Interview Prompts:",
      ...questions.map((question, index) => `${index + 1}. ${question}`),
    ].filter(Boolean).join("\n\n");

    saveTargetJobPacket(packet);
    saveInterviewDraft({
      resume: resumeText || "Resume not provided yet. Focus on measurable outcomes.",
      jobTitle: job.title,
      job: roleJobDescription,
      jobLink: job.job_url || "",
    });
    sessionStorage.setItem("interview_seedQuestions", JSON.stringify(questions));
    router.push("/voice/interview");
  };

  const optimizeForJob = (job: MatchedJob) => {
    if (!hasFullDescription(job)) {
      setIntakeMessage("Ready to Apply stays locked until a full job description is stored.");
      return;
    }

    saveTargetJobPacket(toTargetJobPacket(job));
    router.push("/upload");
  };

  async function analyzeListingUrl() {
    if (!/^https?:\/\//i.test(intakeUrl.trim())) {
      setIntakeMessage("Paste a valid job URL to scrape the full listing.");
      return;
    }

    setIntakeLoading(true);
    setIntakeMessage("");
    try {
      const res = await fetch("/api/scrape-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: intakeUrl.trim() }),
      });
      const data = (await res.json()) as { title?: string; company?: string; description?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not read that listing.");
      }

      setIntakeTitle((current) => current || String(data.title || ""));
      setIntakeCompany((current) => current || String(data.company || ""));
      setIntakeDescription((current) => current || sanitizeText(String(data.description || "")));
      setIntakeMessage(data.description ? "Listing scraped. Review and save the packet." : "Title found, but paste the full description manually.");
    } catch (fetchError) {
      setIntakeMessage(fetchError instanceof Error ? fetchError.message : "Could not read that listing.");
    } finally {
      setIntakeLoading(false);
    }
  }

  function saveManualPacket() {
    const title = intakeTitle.trim();
    const company = intakeCompany.trim() || "Manual Import";
    const fullDescription = sanitizeText(intakeDescription);
    if (!title) {
      setIntakeMessage("Add a job title before saving this packet.");
      return;
    }

    if (!fullDescription) {
      setIntakeMessage("Paste the full job description before marking this role Ready to Apply.");
      return;
    }

    const manualJob: MatchedJob = {
      id: `manual-${Date.now()}`,
      title,
      company,
      location: intakeLocation.trim() || "Manual intake",
      salary: intakeSalary.trim(),
      description: summarizeDescription(fullDescription),
      full_description: fullDescription,
      job_url: intakeUrl.trim(),
      tags: ["MANUAL", ...(activeKj ? [activeKj.toUpperCase()] : [])].slice(0, 4),
      matchScore: 100,
      source: "manual",
    };

    const nextManualJobs = [manualJob, ...manualJobs];
    setManualJobs(nextManualJobs);
    saveManualJobs(nextManualJobs);
    setSelected(manualJob);
    setIntakeTitle("");
    setIntakeCompany("");
    setIntakeLocation("");
    setIntakeSalary("");
    setIntakeDescription("");
    setIntakeUrl("");
    setIntakeMessage("Manual job packet saved. Ready to Apply is now enabled for that role.");
  }

  return (
    <div className="ta-root">
      <main className="ta-main">
        <header className="ta-header">
          <div>
            <p className="gh-eyebrow">Targeting Array</p>
            <h1 className="ta-title">Autonomous KJ Targeting System</h1>
            <p className="ta-sub">Data-dense, coach-guided job matching based on your Known Job, resume keywords, and full-description job packets.</p>
          </div>
          {userId && <Link href="/growthhub" className="gh-back-link">← GrowthHub</Link>}
        </header>

        <section className="ta-query-terminal">
          <input
            className="ta-query-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && setScanTick((value) => value + 1)}
            placeholder="[Enter Role, Technology, or Company Header]"
            aria-label="Role or company search"
          />
          <button className="ta-scan-btn" onClick={() => setScanTick((value) => value + 1)}>
            <ScanIcon /> Scan
          </button>
        </section>

        <section className="ta-filter-row">
          <label htmlFor="minMatch" className="ta-filter-label">Match-Grade Filter: {minMatch}%+</label>
          <input
            id="minMatch"
            type="range"
            min={35}
            max={95}
            step={1}
            value={minMatch}
            onChange={(event) => setMinMatch(Number(event.target.value))}
            className="ta-range"
          />
        </section>

        <section className="ta-intake-card">
          <div className="ta-intake-head">
            <div>
              <p className="ta-sidebar-title">Ready to Apply Intake</p>
              <h2 className="ta-intake-title">Store the full listing before you optimize or simulate.</h2>
            </div>
            <span className="ta-intake-pill">{completeDescriptions}/{jobs.length || 0} complete packets</span>
          </div>

          <div className="ta-intake-grid">
            <input
              className="ta-query-input"
              value={intakeUrl}
              onChange={(event) => setIntakeUrl(event.target.value)}
              placeholder="Job listing URL for deep scrape"
            />
            <button className="ta-scan-btn" type="button" onClick={() => void analyzeListingUrl()} disabled={intakeLoading}>
              {intakeLoading ? "Reading..." : "Analyze URL"}
            </button>
            <input className="ta-query-input" value={intakeTitle} onChange={(event) => setIntakeTitle(event.target.value)} placeholder="Job title" />
            <input className="ta-query-input" value={intakeCompany} onChange={(event) => setIntakeCompany(event.target.value)} placeholder="Company" />
            <input className="ta-query-input" value={intakeLocation} onChange={(event) => setIntakeLocation(event.target.value)} placeholder="Location" />
            <input className="ta-query-input" value={intakeSalary} onChange={(event) => setIntakeSalary(event.target.value)} placeholder="Salary or range" />
            <textarea
              className="ta-intake-textarea"
              value={intakeDescription}
              onChange={(event) => setIntakeDescription(event.target.value)}
              placeholder="Paste the full job description here if scraping fails or the site is behind a login wall."
            />
          </div>

          <div className="ta-intake-actions">
            <button className="ta-results-btn" type="button" onClick={saveManualPacket}>Save Job Packet</button>
            <p className="ta-intake-note">
              <WarningIcon /> Ready to Apply remains disabled until a full description is stored.
            </p>
          </div>

          {intakeMessage && <p className="ta-intake-message">{intakeMessage}</p>}
        </section>

        <section className="ta-body">
          <div className="ta-feed">
            <AnimatePresence mode="popLayout">
              {jobs.map((job, index) => {
                const packetReady = hasFullDescription(job);
                return (
                  <motion.article
                    key={`${job.id}-${scanTick}`}
                    className="ta-card coach-nudge-box"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.28, delay: index * 0.05 }}
                    layout
                  >
                    <div className="gh-nudge-header ta-card-header">
                      <div className="gh-professional-icon gh-professional-icon--nudge">
                        <JobIcon />
                      </div>
                      <div>
                        <h3 className="gh-nudge-title ta-job-title">{job.title}</h3>
                        <p className="gh-nudge-subtitle ta-company">{job.company} • {job.location}</p>
                      </div>
                      <div className={job.matchScore >= 75 ? "ta-pill-qualified" : "ta-pill-gap"}>{job.matchScore}% Match</div>
                    </div>

                    <p className="gh-nudge-text ta-description">{job.description || summarizeDescription(job.full_description || "")}</p>
                    <p className="ta-coach-summary">Coach&apos;s Summary: {buildCoachSummary(job)}</p>

                    <div className="ta-tags">
                      {job.tags.map((tag) => (
                        <span key={`${job.id}-${tag}`} className="ta-tag-mastered">{tag}</span>
                      ))}
                      {!packetReady && (
                        <span className="ta-warning-chip">
                          <WarningIcon /> Description missing
                        </span>
                      )}
                    </div>

                    <p className="ta-salary-line">Salary: {job.salary || "Not listed"}</p>

                    <div className="ta-cta-row">
                      <button className="gh-nudge-cta" onClick={() => setSelected(job)}>View Details</button>
                      <button className="ta-practice-inline-btn" onClick={() => practiceRole(job)}>Start Interview Simulation</button>
                      <button className="ta-results-btn" type="button" onClick={() => optimizeForJob(job)} disabled={!packetReady}>
                        Optimize Resume for this Job
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>

            {loading && <div className="ta-empty">Scanning roles...</div>}
            {!loading && !jobs.length && !error && <div className="ta-empty">No jobs matched this filter. Scan again with broader terms or save a manual packet.</div>}
            {error && <div className="ta-empty ta-error">{error}</div>}
          </div>

          <aside className="ta-sidebar">
            <div className="ta-diagnostic-card">
              <p className="ta-sidebar-title">Career Diagnostic</p>
              <div className="ta-diagnostic-score">{averageMatch}%</div>
              <p className="ta-sidebar-caption">Current average match score</p>
              <div className="ta-diagnostic-grid">
                <div>
                  <p className="ta-kv-key">Kj<KjNudge /> Baseline</p>
                  <p className="ta-kv-val">{activeKj || "Not detected"}</p>
                </div>
                <div>
                  <p className="ta-kv-key">Location Signal</p>
                  <p className="ta-kv-val">{[profile.city, profile.state, profile.zip].filter(Boolean).join(", ") || "None"}</p>
                </div>
                <div>
                  <p className="ta-kv-key">Ready Packets</p>
                  <p className="ta-kv-val">{completeDescriptions}/{jobs.length || 0}</p>
                </div>
              </div>
            </div>

            <div className="ta-diagnostic-card">
              <p className="ta-sidebar-title">Top Matches</p>
              {topMatches.map((job) => (
                <div key={job.id} className="ta-top-match">
                  <div>
                    <p>{job.title}</p>
                    <span>{job.company}</span>
                  </div>
                  <strong>{job.matchScore}%</strong>
                </div>
              ))}
              {!topMatches.length && <p className="ta-sidebar-empty">No top matches yet.</p>}
            </div>
          </aside>
        </section>
      </main>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="ta-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.aside
              className="ta-drawer"
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ta-drawer-head">
                <div>
                  <p className="ta-modal-section-label">Job Packet</p>
                  <h2 className="ta-drawer-title">{selected.title}</h2>
                  <p className="ta-modal-sub">{selected.company} • {selected.location || "Location pending"}</p>
                </div>
                <button className="ta-close-btn" type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              <div className="ta-drawer-chip-row">
                <span className={selected.matchScore >= 75 ? "ta-pill-qualified" : "ta-pill-gap"}>{selected.matchScore}% Match</span>
                {selected.salary && <span className="ta-drawer-chip">{selected.salary}</span>}
                {selected.job_url && (
                  <a className="ta-drawer-link" href={selected.job_url} target="_blank" rel="noreferrer">
                    Open Original Site ↗
                  </a>
                )}
              </div>

              <div className="ta-drawer-panels">
                <section className="ta-drawer-panel">
                  <p className="ta-drawer-label">Coach&apos;s Summary</p>
                  <p className="ta-coach-summary ta-coach-summary--drawer">{buildCoachSummary(selected)}</p>
                  <p className="ta-drawer-label">Top 3 Scariest Questions</p>
                  <ol className="ta-question-list">
                    {makeQuestions(selected).map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ol>
                </section>

                <section className="ta-drawer-panel ta-drawer-panel--scroll">
                  <p className="ta-drawer-label">Full Description</p>
                  {hasFullDescription(selected) ? (
                    <div className="ta-description-scroll">{sanitizeText(selected.full_description || selected.description)}</div>
                  ) : (
                    <div className="ta-missing-description">
                      <WarningIcon /> This role is not Ready to Apply yet. Paste or scrape the full description first.
                    </div>
                  )}
                </section>
              </div>

              <div className="ta-drawer-actions">
                <button className="ta-results-btn" type="button" onClick={() => optimizeForJob(selected)} disabled={!hasFullDescription(selected)}>
                  Optimize Resume for this Job
                </button>
                <button className="ta-practice-btn" onClick={() => practiceRole(selected)}>Start Interview Simulation</button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
