"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedOut, SignUpButton, useAuth } from "@clerk/nextjs";
import "./growthhub/page.css";

const METRICS = [
  {
    category: "Knowledge & Accuracy",
    items: [
      { name: "Answer Correctness", desc: "Are your answers technically accurate and complete?" },
      { name: "Reasoning Quality", desc: "Is your thinking process logical and well-structured?" },
      { name: "Question Understanding", desc: "Do you fully understand what's being asked before answering?" },
    ],
  },
  {
    category: "Communication & Delivery",
    items: [
      { name: "Communication Clarity", desc: "Are you concise, structured, and easy to follow?" },
      { name: "Behavioral Story Quality", desc: "Do your stories have ownership, actions, and measurable impact?" },
      { name: "Confidence Calibration", desc: "Do you project balanced confidence without over- or underclaiming?" },
    ],
  },
  {
    category: "Interview Strategy",
    items: [
      { name: "Role Alignment Coverage", desc: "Are you mapping your experience to what this role needs?" },
      { name: "Depth Under Follow-ups", desc: "Can you maintain quality when the interviewer pushes deeper?" },
      { name: "Time Management", desc: "Are you delivering enough signal within the time limit?" },
      { name: "Recovery Ability", desc: "How do you handle questions outside your comfort zone?" },
    ],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Paste your resume & job description",
    body: "Takes 30 seconds. Drop your resume text and paste the job description — the simulation engine parses everything instantly.",
    badge: "Core",
  },
  {
    num: "02",
    title: "Get your fit score and tailored questions",
    body: "Instant analysis — see exactly how well you match the role and get questions generated from your specific resume and this job.",
    badge: "Signal",
  },
  {
    num: "03",
    title: "Practice with a live AI mock interview",
    body: "Your interviewer targets weak spots in real-time, challenges you with follow-ups, and scores you across 10 metrics.",
    badge: "Simulation",
  },
];

const PROBLEMS = [
  {
    title: "Generic questions, zero context",
    body: "You drill frameworks that have nothing to do with your resume or the specific role. The interviewer asks something completely different.",
  },
  {
    title: "No signal — just vibes",
    body: "You finish a practice session with no idea if your answer was strong, weak, or a dealbreaker. You guess and hope for the best.",
  },
  {
    title: "Weakest spots stay invisible",
    body: "You over-index on what you're already confident in. The exact gap that costs you offers never gets identified, let alone fixed.",
  },
  {
    title: "Structure collapses under pressure",
    body: "Everything you rehearsed disappears the moment nerves kick in. The real interview bears no resemblance to your prep.",
  },
];

const SOLUTIONS = [
  {
    title: "Questions built from your actual resume",
    body: "Upload your resume and job description. The engine parses both and generates questions specific to your experience and this exact role.",
  },
  {
    title: "10-metric diagnostic on every session",
    body: "Logic, storytelling, confidence, depth, role alignment — every answer scored in real-time. No guessing. No ambiguity.",
  },
  {
    title: "Your Weakest Point, surfaced and trained",
    body: "After each run, Hirely flags your highest-impact gap and routes you directly to the STARR Lab module that fixes it.",
  },
  {
    title: "STARR-structured answers that hold",
    body: "Interactive drills enforce structure until it's automatic. When nerves hit, your answers stay tight because the pattern is locked in.",
  },
];

const CAPABILITIES = [
  {
    title: "Master the Methodology.",
    subtitle: "The STARR Lab",
    description:
      "Interactive puzzles that force you to structure your experience using the STARR (Situation, Task, Action, Result, Reflection) framework.",
  },
  {
    title: "10-Point Evaluation.",
    subtitle: "Diagnostic Metrics",
    description:
      "Real-time feedback on Logic, Storytelling, and Delivery. We identify your Weakest Point so you know exactly where to train.",
  },
  {
    title: "XP-Gated Mastery.",
    subtitle: "Gamified Growth",
    description:
      "Earn XP through interactive logic games and skill-building modules. Level up your performance from Junior to Expert.",
  },
];

const CORE_FEATURES = [
  {
    variant: "simulation",
    title: "Push-Back AI",
    description: "Interviewer follow-ups adapt to your answer depth so weak spots surface before the real interview.",
    href: "/voice/interview",
  },
  {
    variant: "training",
    title: "STARR Lab",
    description: "Interactive training modules for Situation, Task, Action, Result, and Reflection under timed pressure.",
    href: "/training",
  },
  {
    variant: "archive",
    title: "10-Point Evaluation",
    description: "Scorecards track logic, clarity, confidence, and role alignment with replayable transcript evidence.",
    href: "/history",
  },
];

function FeatureIcon({ variant }: { variant: "simulation" | "training" | "archive" }) {
  if (variant === "simulation") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="18" />
        <circle cx="14" cy="24" r="2" />
        <circle cx="24" cy="17" r="2" />
        <circle cx="34" cy="24" r="2" />
        <path d="M16 24L22 19L32 24" />
        <path d="M12 30C15 33 19 35 24 35C29 35 33 33 36 30" />
      </svg>
    );
  }
  if (variant === "training") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="10" r="3" />
        <circle cx="12" cy="18" r="3" />
        <circle cx="16" cy="33" r="3" />
        <circle cx="32" cy="33" r="3" />
        <circle cx="36" cy="18" r="3" />
        <path d="M24 13L12 18L16 33L32 33L36 18L24 13Z" />
        <path d="M12 18L32 33" />
        <path d="M36 18L16 33" />
        <path d="M24 10V24" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M9 12H30L38 20V36H9V12Z" />
      <path d="M30 12V20H38" />
      <ellipse cx="21" cy="17" rx="8" ry="2.5" />
      <path d="M13 17V30" />
      <path d="M29 17V30" />
      <path d="M13 22C13 23.4 16.6 24.5 21 24.5C25.4 24.5 29 23.4 29 22" />
      <path d="M13 27C13 28.4 16.6 29.5 21 29.5C25.4 29.5 29 28.4 29 27" />
      <path d="M35 30V23" />
      <path d="M35 30L31.5 26.5" />
      <path d="M35 30L38.5 26.5" />
    </svg>
  );
}

export default function Home() {
  const { isSignedIn } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How does the 10-point evaluation work?", a: "Each interview is scored across a diagnostic grid that includes logic, storytelling, delivery, depth under follow-ups, and role alignment." },
    { q: "What is the Weakest Point signal?", a: "After each run, Hirely flags your highest-impact weakness so you can jump directly into the right STARR Lab training module." },
    { q: "What happens inside STARR Lab?", a: "You get focused interactive drills that enforce Situation, Task, Action, Result, and Reflection structure until your answers are consistent." },
    { q: "How does progression work?", a: "You earn XP through interviews and training modules, unlock deeper challenges, and level up from foundational to expert performance." },
    { q: "How quickly can I start?", a: "Most users upload context and launch their first simulation in under a minute." },
  ];

  return (
    <div className="lp-root lp-accelerator-theme">
      <main className="gh-main">
        <section className="gh-first-time">
          <div className="gh-first-orb" aria-hidden="true">
            <div className="lp-atomic-hero">
              <div className="lp-atomic-ring lp-atomic-ring--outer" />
              <div className="lp-atomic-ring lp-atomic-ring--inner" />
              <div className="lp-atomic-core">HC</div>
            </div>
          </div>
          <p className="gh-eyebrow">AI Career Coach</p>
          <h1 className="gh-first-h1">Your AI interview coach that actually challenges you.</h1>
          <p className="gh-first-sub">
            Practice with an AI interviewer that adapts in real-time, challenges weak spots, and scores performance so you walk in interview-ready.
          </p>
          <div className="lp-hero-cta-row">
            <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-hero-cta-btn">
              Start Practicing Now
            </Link>
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="global-auth-btn lp-hero-cta-btn" type="button">Create free account</button>
              </SignUpButton>
            </SignedOut>
          </div>
          <div className="gh-first-badges">
            <span>No setup friction</span>
            <span>•</span>
            <span>10 performance metrics</span>
            <span>•</span>
            <span>Role-specific question engine</span>
          </div>
        </section>

        <section className="gh-body" id="features">
          <div>
            <p className="gh-eyebrow">Core Capabilities</p>
            <h2 className="gh-h1 gh-preview-title">Dashboard-grade preview before you even log in</h2>
            <p className="gh-first-sub" style={{ maxWidth: 760, marginBottom: 24 }}>
              Train under pressure, diagnose exactly what is holding you back, and close the gap with focused modules.
            </p>
            <div className="gh-action-grid">
              {CORE_FEATURES.map((feature, idx) => (
                <article
                  key={feature.title}
                  className={`gh-action-card gh-action-card--${feature.variant} glass-card`}
                  style={{ animation: "gh-modal-slide-in 0.35s ease both", animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="gh-action-link gh-action-link--preview" aria-label={`${feature.title} preview`}>
                    <div className="gh-card-header">
                      <div className="gh-professional-icon">
                        <FeatureIcon variant={feature.variant as "simulation" | "training" | "archive"} />
                      </div>
                    </div>
                    <h3 className="gh-card-title">{feature.title}</h3>
                    <p className="gh-card-desc">{feature.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="gh-sidebar">
            <section className="gh-sidebar-card glass-card" style={{ animation: "gh-modal-slide-in 0.35s ease both" }}>
              <p className="gh-sidebar-label">Why This Works</p>
              <p className="gh-sidebar-body">
                Every session maps directly to your target role. No generic prompts, no random prep loops.
              </p>
              <div className="gh-quick-stats">
                <div className="stat-row"><span className="stat-label">STARR Coverage</span><span className="stat-value">100%</span></div>
                <div className="stat-row"><span className="stat-label">Evaluation Metrics</span><span className="stat-value">10</span></div>
                <div className="stat-row"><span className="stat-label">Engine Mode</span><span className="stat-value">Adaptive</span></div>
              </div>
            </section>
          </aside>
        </section>

        {/* ── PROBLEM / SOLUTION ── */}
        <section className="lp-section" id="why">
          <p className="gh-eyebrow">The Gap We Close</p>
          <h2 className="gh-h1">Most interview prep leaves you guessing. We don&apos;t.</h2>
          <p className="lp-section-sub">
            The difference isn&apos;t just AI — it&apos;s the diagnostic layer that tells you exactly what&apos;s broken and builds the specific skill to fix it.
          </p>

          <div className="lp-ps-grid">
            <div className="lp-ps-col">
              <div className="lp-ps-col-header lp-ps-col-header--problem">Without Hirely Coach</div>
              {PROBLEMS.map((p) => (
                <div key={p.title} className="lp-ps-item lp-ps-item--problem">
                  <p className="lp-ps-item-title">{p.title}</p>
                  <p className="lp-ps-item-body">{p.body}</p>
                </div>
              ))}
            </div>
            <div className="lp-ps-col">
              <div className="lp-ps-col-header lp-ps-col-header--solution">With Hirely Coach</div>
              {SOLUTIONS.map((s) => (
                <div key={s.title} className="lp-ps-item lp-ps-item--solution">
                  <p className="lp-ps-item-title">{s.title}</p>
                  <p className="lp-ps-item-body">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CAPABILITIES ── */}
        <section className="lp-section" id="capabilities">
          <p className="gh-eyebrow">Core Capabilities</p>
          <h2 className="gh-h1">A high-fidelity preview of the actual training system</h2>
          <p className="lp-section-sub">
            Hirely Coach is built as a simulation platform: diagnose the gap, train the specific skill, and verify progress with measurable signal.
          </p>

          <div className="lp-metrics-grid">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title} className="lp-metric-group glass-card">
                <p className="lp-metric-category">{capability.subtitle}</p>
                <div className="lp-metric-item" style={{ alignItems: "flex-start" }}>
                  <div className="lp-metric-dot" />
                  <div>
                    <div className="lp-metric-name">{capability.title}</div>
                    <div className="lp-metric-desc">{capability.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── METRICS ── */}
        <section className="lp-section lp-section-alt" id="metrics">
          <p className="gh-eyebrow">Performance Metrics</p>
          <h2 className="gh-h1">Scored across 10 metrics that real interviewers care about</h2>
          <p className="lp-section-sub">
            Every session gives you a diagnostic breakdown showing exactly where you&apos;re strong — and what&apos;s costing you offers.
          </p>

          <div className="lp-metrics-grid">
            {METRICS.map((group) => (
              <div key={group.category} className="lp-metric-group glass-card">
                <p className="lp-metric-category">{group.category}</p>
                {group.items.map((item) => (
                  <div key={item.name} className="lp-metric-item">
                    <div className="lp-metric-dot" />
                    <div>
                      <div className="lp-metric-name">{item.name}</div>
                      <div className="lp-metric-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-section" id="how">
          <p className="gh-eyebrow">How It Works</p>
          <h2 className="gh-h1">From resume to ready in 3 steps</h2>
          <p className="lp-section-sub">
            No scheduling. No waiting. Upload and start preparing in under 2 minutes.
          </p>

          <div className="lp-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="lp-step glass-card">
                <div className="lp-step-top">
                  <span className="lp-step-num">{step.num}</span>
                  <span className="lp-step-badge">{step.badge}</span>
                </div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-section">
          <p className="gh-eyebrow">FAQ</p>
          <h2 className="gh-h1">Want to know more?</h2>
          <div className="lp-faq">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`lp-faq-item${openFaq === i ? " lp-faq-open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="lp-faq-q">
                  <span>{faq.q}</span>
                  <span className="lp-faq-chevron">{openFaq === i ? "−" : "+"}</span>
                </div>
                {openFaq === i && <p className="lp-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="lp-cta-section">
          <span className="gh-eyebrow">AI Career Coach</span>
          <h2 className="gh-h1">Stop preparing in your head.<br />Start practicing out loud.</h2>
          <p className="lp-cta-sub">
            Upload your resume, add the job, and get scored across 10 metrics in a production-style interview simulation.
          </p>
          <div className="lp-cta-actions">
            <div className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn">
              Start Practicing Now
            </div>
          </div>
          <p className="lp-cta-note">Set up in under 60 seconds.</p>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-brand">Hirely Coach</div>
            <p className="lp-footer-tagline">AI-powered Coach that actually challenges you.</p>
          </div>
          <div className="lp-footer-cols">
            <div>
              <p className="lp-footer-col-label">Product</p>
              <Link href="/voice">Mock Interview</Link>
              <a href="#metrics">10 Metrics</a>
              <a href="#how">How It Works</a>
            </div>
            <div>
              <p className="lp-footer-col-label">Account</p>
              <Link href="/history">My History</Link>
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