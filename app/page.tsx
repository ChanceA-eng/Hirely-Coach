"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedOut, SignUpButton, useAuth } from "@clerk/nextjs";
import "./growthhub/page.css";

const POWER_PILLARS = [
  {
    variant: "alignment",
    title: "The Alignment Engine",
    subtitle: "AI Resume Optimizer",
    description: "Don't just edit—align. Paste any job URL and our AI surgically restructures your resume to match the hiring DNA of the role. Achieve 100% alignment before the recruiter even opens your file.",
    href: "/canvas",
  },
  {
    variant: "simulation",
    title: "Tactical Simulation",
    subtitle: "Adaptive Interview Prep",
    description: "Face the pressure before it's real. Toggle between Casual, Professional, and Surgical intensities. Our AI simulates real-time executive pushback based on your specific target company and resume.",
    href: "/voice/interview",
  },
  {
    variant: "impact",
    title: "The Impact Log",
    subtitle: "Career Progress Tracker",
    description: "Work that isn't tracked is work that isn't rewarded. Log your Weekly Wins to earn Impact Points (IP) and climb the 8-Level Accelerator. Turn a year of effort into a quantified, data-backed evidence vault.",
    href: "/growthhub",
  },
  {
    variant: "asset",
    title: "The Asset Generator",
    subtitle: "AI Portfolio Builder",
    description: "From simulation to submission. Automatically generate high-impact follow-up emails and interactive portfolios that reflect your interview performance and ledger wins.",
    href: "/feedback",
  },
];

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
    title: "Upload your resume & target role",
    body: "Takes 60 seconds. Share your resume and the job URL — our Command Center ingests everything and begins alignment analysis.",
    badge: "Foundation",
  },
  {
    num: "02",
    title: "Get your Alignment Score and tailored profile",
    body: "See exactly where your profile matches the role's hiring DNA. Get AI-powered restructuring suggestions before you even interview.",
    badge: "Signal",
  },
  {
    num: "03",
    title: "Practice, log wins, and ascend",
    body: "Run Tactical Simulations, earn Impact Points, and automatically generate portfolio-quality evidence. Track your climb from Candidate to Professional.",
    badge: "Mastery",
  },
];

const PROBLEMS = [
  {
    title: "Your profile is invisible to the hiring algorithm",
    body: "Generic resumes never align with the specific role. You're competing with 500 identical applicants.",
  },
  {
    title: "Interview prep is disconnected from your career growth",
    body: "You practice interviews in isolation. Your wins never get tracked, quantified, or leveraged for your next move.",
  },
  {
    title: "No data = no evidence for your next promotion",
    body: "Your impact stays in your head. When it's time to ask for the next level, you can't prove what you've built.",
  },
  {
    title: "Career decisions are reactive, not strategic",
    body: "You chase opportunities instead of architecting your path. No clarity on what role comes next or how to get there.",
  },
];

const SOLUTIONS = [
  {
    title: "AI Alignment Engine restructures your profile",
    body: "We parse the job's DNA and rebuild your resume to match it—positioning you as the clear choice before the interview.",
  },
  {
    title: "Tactical Simulation connected to your Impact Log",
    body: "Every interview sharpens your response library. Every win gets logged. Your career is quantified and always current.",
  },
  {
    title: "Impact Points unlock the 8-Level Accelerator",
    body: "Track and verify your climb from Candidate → Contributor → Leader → Executive. Prove it to recruiters and hiring managers.",
  },
  {
    title: "Career OS automates your ascension path",
    body: "You get clarity on your next role, the specific skills to demonstrate, and AI-powered tools to get there faster.",
  },
];

const CAPABILITIES = [
  {
    title: "The Alignment Engine",
    subtitle: "Resume Optimization",
    description: "Paste any job URL. Our AI analyzes the hiring DNA and restructures your resume to match—positioning you as the ideal candidate before the interview even starts.",
  },
  {
    title: "Tactical Simulation.",
    subtitle: "Adaptive Interview Pressure",
    description: "Run interviews at Casual, Professional, or Surgical intensity levels. The AI adapts in real-time, targeting gaps and simulating executive pushback specific to your target role.",
  },
  {
    title: "Impact Log & IP System.",
    subtitle: "Career Quantification",
    description: "Log weekly wins, earn Impact Points, and climb the 8-Level Accelerator. Turn your work into quantified, data-backed evidence that unlocks your next opportunity.",
  },
  {
    title: "AI Asset Generator.",
    subtitle: "Portfolio Automation",
    description: "From your interview performance and impact ledger, Hirely auto-generates high-impact follow-up emails, portfolio pieces, and evidence collateral.",
  },
];

const CORE_FEATURES = [
  {
    variant: "alignment",
    title: "The Alignment Engine",
    description: "Don't just edit—align. Paste any job URL and our AI surgically restructures your resume to match the role's hiring DNA. 100% alignment guaranteed.",
    href: "/canvas",
  },
  {
    variant: "simulation",
    title: "Tactical Simulation",
    description: "Face the pressure before it's real. Toggle between intensity levels. Our AI simulates real-time executive pushback based on your target company.",
    href: "/voice/interview",
  },
  {
    variant: "impact",
    title: "The Impact Log",
    description: "Work that isn't tracked is work that isn't rewarded. Log wins, earn Impact Points (IP), and climb the 8-Level Accelerator.",
    href: "/growthhub",
  },
];

function FeatureIcon({ variant }: { variant: "alignment" | "simulation" | "impact" | "asset" }) {
  if (variant === "alignment") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 12H40L36 36H12L8 12Z" />
        <path d="M24 16V32" />
        <path d="M16 24H32" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
        <path d="M12 12L36 36" />
      </svg>
    );
  }
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
  if (variant === "impact") {
    return (
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M8 20H14V32H8Z" />
        <path d="M18 12H24V32H18Z" />
        <path d="M28 16H34V32H28Z" />
        <path d="M6 34H40" stroke="currentColor" strokeWidth="2" />
        <circle cx="14" cy="28" r="2" fill="currentColor" />
        <circle cx="24" cy="20" r="2" fill="currentColor" />
        <circle cx="34" cy="24" r="2" fill="currentColor" />
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
    { q: "How does the Alignment Engine work?", a: "Paste any job URL. Our AI analyzes the job posting's hiring DNA and automatically restructures your resume to match, positioning you as the ideal candidate before you even interview." },
    { q: "What are Impact Points (IP)?", a: "Impact Points are a quantified currency for your career wins. Log weekly achievements, earn IP, and climb the 8-Level Accelerator—turning a year of work into data-backed evidence for raises, promotions, and leadership positions." },
    { q: "What is the difference between Casual, Professional, and Surgical interview intensities?", a: "Casual is practice-mode with gentle feedback. Professional is interview-ready simulation. Surgical is maximum pressure: executive-level pushback, rapid-fire follow-ups, and zero mercy. Use Surgical to prepare for your toughest competition." },
    { q: "How does the Asset Generator work?", a: "After each interview, our AI analyzes your performance and impact log, then auto-generates high-impact follow-up emails, portfolio snippets, and career collateral that prove your value to recruiters and hiring managers." },
    { q: "How quickly can I start?", a: "Most users create an account and run their first simulation in under 2 minutes. Upload your resume and job description—that's it. The Command Center takes it from there." },
  ];

  return (
    <div className="lp-root lp-accelerator-theme">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Hirely Coach - The Career OS",
            "description": "An AI-powered Career Operating System for professional growth, interview preparation, and career advancement.",
            "url": "https://hirelycoach.com",
            "applicationCategory": "CareerDevelopment",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150"
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.q,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
              }
            }))
          })
        }}
      />
      <main className="gh-main">
        <section className="gh-first-time">
          <div className="gh-first-layout">
            <div className="gh-terminal-box">
              <p className="gh-eyebrow">The Career OS</p>
              <h1 className="gh-first-h1" style={{ maxWidth: 700 }}>
                Master Your Career Journey with Surgical Precision.
              </h1>
              <p className="gh-first-sub">
                The all-in-one Command Center to optimize your profile, simulate high-stakes interviews, and automate your professional impact.
              </p>
              <div className="lp-hero-cta-row">
                <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-hero-cta-btn">
                  Try Hirely Coach Now
                </Link>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="global-auth-btn lp-hero-cta-btn" type="button">Create free account</button>
                  </SignUpButton>
                </SignedOut>
              </div>
              <div className="gh-first-badges">
                <span>AI Alignment Engine</span>
                <span>•</span>
                <span>Tactical Simulation</span>
                <span>•</span>
                <span>Impact Quantification</span>
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
            <h2 className="gh-h1 gh-preview-title">Four command-center modules that work as one system</h2>
            <p className="gh-first-sub" style={{ maxWidth: 760, marginBottom: 24 }}>
              Optimize your profile, practice with surgical precision, quantify your impact, and generate interview-to-opportunity assets.
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
                        <FeatureIcon variant={feature.variant as "alignment" | "simulation" | "impact" | "asset"} />
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
                Your career is a journey, not a series of accidents. Each module feeds the next — from AI resume alignment to STARR-structured mock interviews to impact tracking and asset generation.
              </p>
              <div className="gh-quick-stats">
                <div className="stat-row"><span className="stat-label">Profile Alignment</span><span className="stat-value">100%</span></div>
                <div className="stat-row"><span className="stat-label">Intensity Levels</span><span className="stat-value">Casual → Surgical</span></div>
                <div className="stat-row"><span className="stat-label">Impact Tracking</span><span className="stat-value">8-Level OS</span></div>
              </div>
            </section>
          </aside>
        </section>

        {/* ── STARR + MOCK INTERVIEW HIGHLIGHT ── */}
        <section className="lp-section">
          <p className="gh-eyebrow">STARR Lab & Mock Interviews</p>
          <h2 className="gh-h1">The interview simulator that actually challenges you.</h2>
          <p className="lp-section-sub">
            Go beyond generic practice. Hirely&apos;s STARR Lab enforces Situation, Task, Action, Result, and Reflection structure until your answers are automatic. Then run a live mock interview at Casual, Professional, or Surgical intensity — with real-time executive pushback based on your specific resume and target role.
          </p>
          <div className="lp-steps" style={{ marginTop: 32 }}>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">STARR Lab</span></div>
              <h3 className="lp-step-title">Structure your stories until they&apos;re automatic.</h3>
              <p className="lp-step-body">Interactive drills build STARR fluency under timed pressure. When nerves hit, your answers stay tight.</p>
            </div>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">Mock Interview</span></div>
              <h3 className="lp-step-title">Simulate the real interview before it&apos;s real.</h3>
              <p className="lp-step-body">Live voice simulation with adaptive follow-up pressure. Choose your intensity — Casual for practice, Surgical for maximum pressure.</p>
            </div>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">10-Point Scorecard</span></div>
              <h3 className="lp-step-title">Know exactly what&apos;s costing you the offer.</h3>
              <p className="lp-step-body">Every session scored across logic, storytelling, confidence, depth, and role alignment. No guessing.</p>
            </div>
          </div>
        </section>

        {/* ── PROBLEM / SOLUTION ── */}
        <section className="lp-section" id="why">
          <p className="gh-eyebrow">The Career OS Advantage</p>
          <h2 className="gh-h1">The career platforms you&apos;ve tried got the incentives wrong.</h2>
          <p className="lp-section-sub">
            Most treat interviews and job applications as separate problems. We treat them as one career architecture challenge—connecting every simulation, achievement, and asset into a quantified growth system.
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
          <p className="gh-eyebrow">The System</p>
          <h2 className="gh-h1">Four integrated systems that automate your ascension</h2>
          <p className="lp-section-sub">
            Hirely Coach is built as a career architecture platform: align your profile, practice under pressure with STARR-structured mock interviews, track your impact, and auto-generate career collateral.
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
          <p className="gh-eyebrow">Diagnostic Engine</p>
          <h2 className="gh-h1">You're scored across 10 metrics that real hiring teams use</h2>
          <p className="lp-section-sub">
            Every session produces a diagnostic scorecard. No hidden gaps. No guessing. Know exactly what's working and what's costing you the offer.
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
          <h2 className="gh-h1">From profile to promotion in 3 integrated steps</h2>
          <p className="lp-section-sub">
            No complexity. No friction. Your career is optimized and tracked in real time.
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

        {/* ── SOCIAL PROOF ── */}
        <section className="lp-section">
          <p className="gh-eyebrow">Trust Metrics</p>
          <h2 className="gh-h1">See the gap we close in real time</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 40, marginBottom: 40 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "#10b981" }}>40%</p>
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>Users see a 40% increase in Clarity scores within their first 3 simulations</p>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "#10b981" }}>8 Levels</p>
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>The Accelerator tracks your rise from Candidate to C-Suite Executive</p>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "#10b981" }}>100%</p>
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>Profile alignment with your target role's hiring requirements</p>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.95rem", color: "#888", marginBottom: 40 }}>
            <strong>Recent Ascensions:</strong> User_402 → Level 4 (Professional) | User_589 → Level 5 (Senior) | User_721 → Level 4 (Professional)
          </p>
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
          <span className="gh-eyebrow">Stop Applying. Start Ascending.</span>
          <h2 className="gh-h1">Your career is a journey, not a series of accidents.</h2>
          <p className="lp-cta-sub">
            Hirely Coach is the command center that replaces the stress of job hunting with the precision of career architecture.
          </p>
          <div className="lp-cta-actions">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn" type="button">Try Hirely Coach Now</button>
              </SignUpButton>
            </SignedOut>
            <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn" style={{ display: isSignedIn ? undefined : "none" }}>
              Try Hirely Coach Now
            </Link>
          </div>
          <p className="lp-cta-note">Ready to ascend?</p>
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
              <p className="lp-footer-col-label">Command Center</p>
              <Link href="/canvas">Alignment Engine</Link>
              <Link href="/voice/interview">Tactical Simulation</Link>
              <Link href="/growthhub">Impact Log</Link>
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