"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { loadInterviewHistory } from "../../lib/interviewStorage";
import { saveInterviewDraft } from "../../lib/resumeStorage";
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
  tags: string[];
  matchScore: number;
};

const PROFILE_KEY = "hirelyProfile";

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

function makeQuestions(job: MatchedJob) {
  return [
    `Why do you want to join ${job.company} as a ${job.title}?`,
    `Tell me about a measurable result that proves you can succeed in this ${job.title} role.`,
    `How would you handle your first 90 days in ${job.location}?`,
  ];
}

export default function TargetingArrayPage() {
  const router = useRouter();
  const { userId } = useAuth();

  const [query, setQuery] = useState("");
  const [minMatch, setMinMatch] = useState(55);
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [selected, setSelected] = useState<MatchedJob | null>(null);
  const [scanTick, setScanTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const history = useMemo(() => loadInterviewHistory(userId), [userId]);
  const resumeText = history[0]?.resume ?? (typeof window !== "undefined" ? sessionStorage.getItem("interview_resume") ?? "" : "");

    function readProfile(): Profile {
    if (typeof window === "undefined") return {} as Profile;
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as Profile;
    } catch {
      return {} as Profile;
    }
    }

    const [profile, setProfile] = useState<Profile>(readProfile);

  const activeKj = (profile.currentJobTitle || profile.preferredRole || "").trim();

    // KJ Bridge: re-read profile when Profile Hub saves changes
    useEffect(() => {
      function handleStorage(e: StorageEvent) {
        if (e.key === PROFILE_KEY || e.key === null) {
          setProfile(readProfile());
          setScanTick((t) => t + 1);
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
        if (!cancelled) setJobs((payload.jobs ?? []) as MatchedJob[]);
      } catch {
        if (!cancelled) setError("Unable to load matched roles right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMatches();
    return () => {
      cancelled = true;
    };
  }, [activeKj, minMatch, profile.city, profile.state, query, resumeText, scanTick]);

  const topMatches = jobs.slice(0, 3);
  const averageMatch = jobs.length ? Math.round(jobs.reduce((acc, job) => acc + job.matchScore, 0) / jobs.length) : 0;

  const practiceRole = (job: MatchedJob) => {
    const questions = makeQuestions(job);

    const roleJobDescription = [
      `${job.title} at ${job.company}`,
      `Location: ${job.location}`,
      `Salary: ${job.salary}`,
      "Known High-Pressure Interview Prompts:",
      ...questions.map((question, index) => `${index + 1}. ${question}`),
    ].join("\n");

    saveInterviewDraft({
      resume: resumeText || "Resume not provided yet. Focus on measurable outcomes.",
      jobTitle: job.title,
      job: roleJobDescription,
      jobLink: "",
    });
    sessionStorage.setItem("interview_seedQuestions", JSON.stringify(questions));
    router.push("/voice/interview");
  };

  return (
    <div className="ta-root">
      <main className="ta-main">
        <header className="ta-header">
          <div>
            <p className="gh-eyebrow">Targeting Array</p>
            <h1 className="ta-title">Autonomous KJ Targeting System</h1>
            <p className="ta-sub">Data-dense, coach-guided job matching based on your Known Job and resume keywords.</p>
          </div>
          {userId && <Link href="/growthhub" className="gh-back-link">← GrowthHub</Link>}
        </header>

        <section className="ta-query-terminal">
          <input
            className="ta-query-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setScanTick((v) => v + 1)}
            placeholder="[Enter Role, Technology, or Company Header]"
            aria-label="Role or company search"
          />
          <button className="ta-scan-btn" onClick={() => setScanTick((v) => v + 1)}>
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

        <section className="ta-body">
          <div className="ta-feed">
            <AnimatePresence mode="popLayout">
              {jobs.map((job, index) => (
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

                  <p className="gh-nudge-text ta-description">{job.description}</p>

                  <div className="ta-tags">
                    {job.tags.map((tag) => (
                      <span key={`${job.id}-${tag}`} className="ta-tag-mastered">{tag}</span>
                    ))}
                  </div>

                  <p className="ta-salary-line">Salary: {job.salary}</p>

                  <div className="ta-cta-row">
                    <button className="gh-nudge-cta" onClick={() => setSelected(job)}>View Details</button>
                    <button className="ta-practice-inline-btn" onClick={() => practiceRole(job)}>Practice This Role</button>
                    <Link href="/training" className="ta-results-btn">Open Quantifying Results</Link>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>

            {loading && <div className="ta-empty">Scanning roles...</div>}
            {!loading && !jobs.length && !error && <div className="ta-empty">No jobs matched this filter. Scan again with broader terms.</div>}
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
            <motion.div
              className="ta-modal"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="ta-modal-section-label">Ghost Application Preview</p>
              <h2>{selected.title} · {selected.company}</h2>
              <p className="ta-modal-sub">Top 3 Scariest Questions</p>
              <ol className="ta-question-list">
                {makeQuestions(selected).map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              <button className="ta-practice-btn" onClick={() => practiceRole(selected)}>Practice This Role</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
