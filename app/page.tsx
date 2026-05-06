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
    description: "Most resumes are ignored because they don't match the job. Paste a link to any job and our AI helps you rewrite your resume to match exactly what the company is looking for. Stop guessing. Be the perfect match every time.",
    href: "/canvas",
  },
  {
    variant: "simulation",
    title: "Interview Practice",
    subtitle: "Practice Interviews",
    description: "Interviews are scary and high-pressure. Practice with an AI that talks like a real boss. Choose your level — Casual for basic practice, Professional for real job tests, or Surgical for the hardest questions.",
    href: "/voice/interview",
  },
  {
    variant: "impact",
    title: "The Impact Log",
    subtitle: "Career Progress Tracker",
    description: "People forget their hard work when it's time for a promotion. Write down your Weekly Wins in our easy log. Earn Impact Points (IP) to level up your profile from Candidate to Professional.",
    href: "/growthhub",
  },
  {
    variant: "asset",
    title: "The Asset Generator",
    subtitle: "Professional Portfolio Builder",
    description: "Writing professional emails and portfolios takes too much time. Our AI uses your interview practice and your Wins to write perfect follow-up emails and a professional website for you.",
    href: "/feedback",
  },
];

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
    title: "The Alignment Engine",
    subtitle: "Resume Optimization",
    description: "Paste any job link. Our AI reads what the company wants and rewrites your resume to match. Look like the right person before the interview even starts.",
  },
  {
    title: "Interview Practice.",
    subtitle: "AI Mock Interviews",
    description: "Practice with an AI that acts like a real interviewer. Pick Casual for easy practice, Professional for job-ready pressure, or Surgical for the hardest questions. Get a Score Card after every session.",
  },
  {
    title: "Impact Log & IP System.",
    subtitle: "Achievement Tracking",
    description: "Write down your Weekly Wins and earn Impact Points (IP). Follow your 8-level career growth plan and keep a record of your value — ready for your next promotion or salary talk.",
  },
  {
    title: "AI Asset Generator.",
    subtitle: "Professional Portfolio Builder",
    description: "After each interview, Hirely writes your follow-up emails and builds your career portfolio using your practice sessions and Impact Log. Look like a pro without the hard work.",
  },
];

const CORE_FEATURES = [
  {
    variant: "alignment",
    title: "The Alignment Engine",
    description: "Paste a link to any job. Our AI reads what the company wants and helps you rewrite your resume to match.",
    simpleEnglish: "Stop guessing. Be the perfect match every time.",
    href: "/canvas",
  },
  {
    variant: "simulation",
    title: "Interview Practice",
    description: "Practice with an AI that talks like a real boss. Pick your level: Casual, Professional, or Surgical.",
    simpleEnglish: "Build your confidence before the real meeting.",
    href: "/voice/interview",
  },
  {
    variant: "impact",
    title: "The Impact Log",
    description: "Write down your Weekly Wins. Earn Impact Points (IP) and level up your career profile.",
    simpleEnglish: "Keep a record of your value so you can ask for a higher salary.",
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
    { q: "How does Hirely Coach help me get more job interviews?", a: "Hirely Coach helps you match your resume to each job, practice interviews, and track your wins so recruiters can see your value." },
    { q: "How does the Alignment Engine work?", a: "Paste a job link. Hirely reads the role and helps you rewrite your resume to match it." },
    { q: "What is the difference between Casual, Professional, and Surgical interview levels?", a: "Casual is easy practice. Professional feels like a real interview. Surgical is the hardest level with fast follow-up questions." },
    { q: "What is the Impact Log?", a: "The Impact Log is where you save your Weekly Wins. You earn Impact Points and build proof for interviews, raises, and promotions." },
    { q: "How quickly can I start?", a: "Most users start in under two minutes. Upload your resume and job description, then begin." },
  ];

  return (
    <div className="lp-root lp-accelerator-theme">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Hirely Coach",
            "description": "AI-powered career tools for resume optimization, interview practice, and achievement tracking. Improve your resume, practice real interviews, and get better jobs.",
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
            "@type": "Organization",
            "name": "Hirely Coach",
            "url": "https://hirelycoach.com",
            "description": "We help job seekers improve their resume, practice real interviews, and track their achievements with simple, AI-powered tools.",
            "sameAs": ["https://hirelycoach.com"]
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
                The Best Way to Build Your Career.
              </h1>
              <p className="gh-first-sub">
                Hirely Coach helps you get the job and grow your career. Use our AI tools to fix your resume, practice interviews, and track your work success in one place.
              </p>
              <div className="lp-hero-cta-row">
                <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-hero-cta-btn">
                  Launch your interview now
                </Link>
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
              <strong>Improve your resume</strong>, practice interviews, track your wins, and build your career portfolio in one place.
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
                    <p className="gh-card-simple">{feature.simpleEnglish}</p>
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

        {/* ── STARR + MOCK INTERVIEW HIGHLIGHT ── */}
        <section className="lp-section" id="interview-practice">
          <p className="gh-eyebrow">STARR Lab &amp; AI Mock Interviews</p>
          <h2 className="gh-h1">AI Interview Coach that actually challenges you.</h2>
          <p className="lp-section-sub">
            Learn to answer with the STARR method. Then practice with your AI interview coach. Pick Casual, Professional, or Surgical based on your goal.
          </p>
          <div className="lp-steps" style={{ marginTop: 32 }}>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">STARR Lab</span></div>
              <h3 className="lp-step-title">Structure your stories until they&apos;re automatic.</h3>
              <p className="lp-step-body">Short drills help you build strong stories. You stay clear even when you feel nervous.</p>
            </div>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">Mock Interview</span></div>
              <h3 className="lp-step-title">Simulate the real interview before it&apos;s real.</h3>
              <p className="lp-step-body">Practice with live follow-up questions. Start easy, then move up to harder levels.</p>
            </div>
            <div className="lp-step glass-card">
              <div className="lp-step-top"><span className="lp-step-badge">10-Point Scorecard</span></div>
              <h3 className="lp-step-title">Know exactly what&apos;s costing you the offer.</h3>
              <p className="lp-step-body">See clear scores after each session. You know what to fix next.</p>
            </div>
          </div>
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
          <p className="gh-eyebrow">The System</p>
          <h2 className="gh-h1">Four integrated career tools in one platform</h2>
          <p className="lp-section-sub">
            <strong>Hirely Coach</strong> helps you improve your resume, practice interviews, log wins, and generate career proof in one dashboard.
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
            Every practice session gives you a clear <strong>Score Card</strong> with simple results:<br />
            <span aria-label="Checkmark">✅</span> <strong>Alignment:</strong> Does your resume match the job?<br />
            <span aria-label="Checkmark">✅</span> <strong>Clarity:</strong> Is your speaking easy to understand?<br />
            <span aria-label="Checkmark">✅</span> <strong>Logic:</strong> Do your answers make sense?<br />
            No guessing. No vague feedback.
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
            <strong>Upload your resume. Practice interviews. Track your wins.</strong> It takes less than 2 minutes to get started.
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
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>Many users improve Clarity scores by 40% in their first 3 sessions.</p>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "#10b981" }}>8 Levels</p>
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>Track your growth from Candidate to Executive.</p>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0 0 8px 0", color: "#10b981" }}>100%</p>
              <p style={{ fontSize: "0.9rem", margin: 0, color: "#ccc" }}>See how well your profile matches your target role.</p>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: "0.95rem", color: "#888", marginBottom: 40 }}>
            <strong>Recent Ascensions:</strong> User_402 → Level 4 (Professional) | User_589 → Level 5 (Senior) | User_721 → Level 4 (Professional)
          </p>
        </section>

        {/* ── WHY WE EXIST ── */}
        <section className="lp-section" id="about" style={{ textAlign: "center" }}>
          <p className="gh-eyebrow">Our Mission</p>
          <h2 className="gh-h1">Why Hirely Coach Exists</h2>
          <p className="lp-section-sub" style={{ maxWidth: 640, margin: "0 auto 24px" }}>
            We help job seekers <strong>speak clearly</strong>, <strong>show their value</strong>, and <strong>get better jobs</strong> using simple, AI-powered tools. No jargon. No guesswork.
          </p>
          <p className="lp-section-sub" style={{ maxWidth: 640, margin: "0 auto 32px", fontSize: "0.92rem", color: "#64748b" }}>
            After improving your resume, try our{" "}
            <a href="#interview-practice" style={{ color: "#10b981", textDecoration: "underline" }}>AI interview practice</a>{" "}
            to prepare for real questions. After each session, use the{" "}
            <a href="/growthhub" style={{ color: "#10b981", textDecoration: "underline" }}>Impact Log</a>{" "}
            to track your wins and build your career story.
          </p>
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
            <strong>Hirely Coach</strong> gives you the tools to plan your future. Fix your resume, practice your talking skills, and save your best work results.
          </p>
          <div className="lp-cta-actions">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn" type="button">Launch your interview now</button>
              </SignUpButton>
            </SignedOut>
            <Link href={isSignedIn ? "/voice/interview" : "/voice"} className="global-auth-btn global-auth-btn--strong lp-cta-preview-btn" style={{ display: isSignedIn ? undefined : "none" }}>
              Launch your interview now
            </Link>
          </div>
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