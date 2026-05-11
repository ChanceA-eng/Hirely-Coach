"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedOut, SignUpButton, useAuth } from "@clerk/nextjs";
import "./growthhub/page.css";

const METRICS = [
  {
    category: "Knowledge and Accuracy",
    items: [
      { name: "Answer Correctness", desc: "Are your answers correct and complete?" },
      { name: "Reasoning Quality", desc: "Do your ideas follow a clear order?" },
      { name: "Question Understanding", desc: "Do you understand the question before you answer?" },
    ],
  },
  {
    category: "Communication and Delivery",
    items: [
      { name: "Communication Clarity", desc: "Is your speaking clear and easy to follow?" },
      { name: "Behavioral Story Quality", desc: "Do your stories show your actions and results?" },
      { name: "Confidence Calibration", desc: "Do you sound calm and confident?" },
    ],
  },
  {
    category: "Interview Strategy",
    items: [
      { name: "Role Alignment Coverage", desc: "Do your examples match what this job needs?" },
      { name: "Depth Under Follow-ups", desc: "Can you answer follow-up questions well?" },
      { name: "Time Management", desc: "Do you answer clearly within the time limit?" },
      { name: "Recovery Ability", desc: "How do you handle hard questions?" },
    ],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload your resume & target role",
    body: "Takes 60 seconds. Share your resume and the job link — we read everything and start matching your profile to what the company wants.",
    badge: "Foundation",
  },
  {
    num: "02",
    title: "Get your Alignment Score and tailored profile",
    body: "See exactly where your resume matches the job. Get AI suggestions to improve it before you go to the interview.",
    badge: "Signal",
  },
  {
    num: "03",
    title: "Practice interviews, log your wins, and level up",
    body: "Run Interview Practice sessions, earn Impact Points, and let Hirely build your career portfolio. Track your rise from Candidate to Professional.",
    badge: "Mastery",
  },
];

const PROBLEMS = [
  {
    title: "Your resume is being ignored",
    body: "Most resumes don't match the job posting. Recruiters move on in seconds.",
  },
  {
    title: "Interviews feel scary and high-pressure",
    body: "You practice alone but there's no feedback. You don't know what you're doing wrong.",
  },
  {
    title: "You forget your hard work when it matters most",
    body: "When it's time for a promotion or a new job, you can't remember — or prove — what you've done.",
  },
  {
    title: "Writing emails and portfolios wastes your time",
    body: "You spend hours trying to sound professional. It's exhausting and the results aren't great.",
  },
];

const SOLUTIONS = [
  {
    title: "Your Resume Optimizer matches you to the job",
    body: "Paste any job link. Our AI rewrites your resume to match what the company is looking for. Be the perfect match before the recruiter even opens your file.",
  },
  {
    title: "Practice interviews with a real AI coach",
    body: "Our AI talks like a real boss and gives you honest feedback. Pick your level: Casual, Professional, or Surgical. Build real confidence.",
  },
  {
    title: "Your Impact Log saves your wins for you",
    body: "Write down what you did each week. Earn Impact Points (IP) and level up from Candidate to Professional. Prove your value when it counts.",
  },
  {
    title: "Your AI writes your emails and portfolio for you",
    body: "After each practice session, Hirely writes your follow-up emails and builds your professional portfolio. Look like an expert without the hard work.",
  },
];

const CAPABILITIES = [
  {
    title: "Find your voice",
    subtitle: "Modules 1-3",
    description:
      "Phonics, Grammar, Vocabulary — Build your foundation with pronunciation, sentence structure, and professional words.",
  },
  {
    title: "Learn Conversation Skills",
    subtitle: "Modules 4-9",
    description:
      "Pronouns, Verbs, Dialogue — Practice real workplace conversations and daily scenarios.",
  },
  {
    title: "Ace Your Interview",
    subtitle: "Modules 10-12",
    description:
      "Self-Introduction, Interview Prep, Exit Exam — Practice how to talk about yourself and handle real job interview questions.",
  },
];

const CORE_FEATURES = [
  {
    variant: "simulation",
    title: "The Alignment Engine",
    description: "Paste a link to any job. Our AI reads what the company wants and helps you rewrite your resume to match. Stop guessing. Be the perfect match every time.",
    href: "/canvas",
  },
  {
    variant: "training",
    title: "Interview Practice",
    description: "Practice with an AI that talks like a real boss. Pick your level: Casual, Professional, or Surgical. Build your confidence before the real meeting.",
    href: "/voice/interview",
  },
  {
    variant: "archive",
    title: "The Impact Log",
    description: "Write down your Weekly Wins. Earn Impact Points (IP) and level up your career profile. Keep a record of your value so you can ask for a higher salary.",
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
    { q: "How does Hirely Coach help me get more job interviews?", a: "Hirely Coach helps you improve your resume, practice interviews, and show your work clearly so you look stronger to recruiters and hiring managers." },
    { q: "How does the Alignment Engine work?", a: "Paste any job link and Hirely reads what the company wants, then helps rewrite your resume so it matches the role better." },
    { q: "What is the difference between Casual, Professional, and Surgical interview levels?", a: "Casual is lighter practice, Professional adds realistic pressure, and Surgical is the toughest mode with sharper follow-ups." },
    { q: "What is the Impact Log?", a: "The Impact Log helps you record your weekly wins, earn Impact Points, and keep proof of your value for future promotions or job changes." },
    { q: "How quickly can I start?", a: "Most users upload context and launch their first simulation in under a minute." },
  ];

  return (
    <div className="lp-root lp-accelerator-theme">
      <main className="gh-main">
        <section className="gh-first-time">
          <div className="gh-first-layout">
            <div className="gh-terminal-box">
              <p className="gh-eyebrow">The Career OS</p>
              <h1 className="gh-first-h1" style={{ maxWidth: 700 }}>
                The Best Way to Build Your Career.
              </h1>
              <p className="gh-first-sub">
                Hirely Coach helps you get the job and grow your career. Use our AI tools to fix your resume, practice interviews, and track your work success in one place.
              </p>
              <div className="lp-hero-cta-row">
                <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-hero-cta-btn">
                  Try our interview practice
                </Link>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="global-auth-btn lp-hero-cta-btn" type="button">Create your account</button>
                  </SignUpButton>
                </SignedOut>
              </div>
              <div className="gh-first-badges">
                <span>AI Resume Optimization</span>
                <span>•</span>
                <span>Interview Practice</span>
                <span>•</span>
                <span>Achievement Tracking</span>
              </div>
            </div>
            <aside className="gh-blueprint-panel" aria-hidden="true">
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div className="lp-atomic-hero">
                  <div className="lp-atomic-ring lp-atomic-ring--outer" />
                  <div className="lp-atomic-ring lp-atomic-ring--inner" />
                  <div className="lp-atomic-core">HC</div>
                </div>
                <p style={{ margin: 0, fontSize: "0.74rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#10b981", fontWeight: 700 }}>
                  Career Architecture
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="gh-body" id="features">
          <div>
            <p className="gh-eyebrow">The Power Pillars</p>
            <h2 className="gh-h1 gh-preview-title">Four career tools that work together as one system</h2>
            <p className="gh-first-sub" style={{ maxWidth: 760, marginBottom: 24 }}>
              Improve your resume, practice interviews, track your wins, and build your career portfolio in one place.
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
                Your tools work together. Update your resume, practice interviews, log wins, and build assets from one connected workflow.
              </p>
              <div className="gh-quick-stats">
                <div className="stat-row"><span className="stat-label">Profile Alignment</span><span className="stat-value">100%</span></div>
                <div className="stat-row"><span className="stat-label">Intensity Levels</span><span className="stat-value">Casual → Surgical</span></div>
                <div className="stat-row"><span className="stat-label">Impact Tracking</span><span className="stat-value">8-Level OS</span></div>
              </div>
            </section>
          </aside>
        </section>

        {/* ── PROBLEM / SOLUTION ── */}
        <section className="lp-section" id="why">
          <p className="gh-eyebrow">The Career OS Advantage</p>
          <h2 className="gh-h1">Why job seekers struggle and how Hirely helps</h2>
          <p className="lp-section-sub">
            Most tools are separate. Hirely connects resume updates, interview practice, and win tracking in one system.
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
          <p className="gh-eyebrow">A New Path for English Learners</p>
          <h2 className="gh-h1">Hirely Foundation: 12 Modules, One Goal — Professional English</h2>
          <p className="lp-section-sub">
            Want to build a strong English foundation first? Foundation is a structured 12-modules learning program that teaches you the English skills you need for professional success.
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
          <p className="gh-eyebrow">Your Score Card</p>
          <h2 className="gh-h1">Know exactly what to improve after every session</h2>
          <p className="lp-section-sub">
            Every practice session gives you a clear Score Card with simple results: No guessing. No vague feedback.
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
          <p className="gh-eyebrow">The Path to Ascension</p>
          <h2 className="gh-h1">From profile to promotion in 3 simple steps</h2>
          <p className="lp-section-sub">
            Upload your resume. Practice interviews. Track your wins. It takes less than 2 minutes to get started.
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
          <p className="lp-section-sub">Common questions with clear answers.</p>
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
          <span className="gh-eyebrow">Don&apos;t just work. Grow.</span>
          <h2 className="gh-h1">Are you ready to move to the next level?</h2>
          <p className="lp-cta-sub">
            Hirely Coach gives you the tools to plan your future. Fix your resume, practice your talking skills, and save your best work results.
          </p>
          <div className="lp-cta-actions">
            <div className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn">
              Launch your interview now
            </div>
          </div>
          <p className="lp-cta-note">Your Career OS. Precision. Command. Ascension.</p>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-brand">Hirely Coach</div>
            <p className="lp-footer-tagline">Your Career OS. Precision. Command. Ascension.</p>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col lp-footer-col--product">
              <p className="lp-footer-col-label">Career Tools</p>
              <Link href="/canvas">Resume Optimizer</Link>
              <Link href="/voice/interview">Interview Practice</Link>
              <Link href="/growthhub">Impact Log</Link>
              <Link href="/foundation/home">Foundation</Link>
            </div>
            <div className="lp-footer-col lp-footer-col--account">
              <p className="lp-footer-col-label">Account</p>
              <Link href="/history">Your History</Link>
              <Link href="/admin/jobs">Admin Panel</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} Hirely Coach. Built for career architecture.</p>
        </div>
      </footer>
    </div>
  );
}