// ─────────────────────────────────────────────────────────────────────────────
// Hirely Knowledge Base – Article Store
// Edit content here without touching UI code.
// ─────────────────────────────────────────────────────────────────────────────

export type HelpCategory = "game" | "academy" | "tools" | "notifications";

export interface HelpArticle {
  id: string;
  slug: string;
  category: HelpCategory;
  title: string;
  summary: string;
  tags: string[];
  content: HelpSection[];
  /** IDs of related articles to show at the bottom of this article. */
  seeAlso?: string[];
}

export interface HelpSection {
  heading?: string;
  body: string;
  list?: { label: string; detail: string }[];
}

export const HELP_CATEGORIES: {
  id: HelpCategory;
  label: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    id: "game",
    label: "The Game",
    icon: "◈",
    description: "Impact Points, ranks, and how your career momentum is tracked.",
    color: "#10b981",
  },
  {
    id: "academy",
    label: "Academy",
    icon: "◎",
    description: "Course requirements, the mastery path, and how to unlock modules.",
    color: "#6366f1",
  },
  {
    id: "tools",
    label: "Tools",
    icon: "⌘",
    description: "The Job Seeder, Simulation flow, and your Impact Log.",
    color: "#f59e0b",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "◉",
    description: "The Action Feed and staying updated in real-time.",
    color: "#ec4899",
  },
];

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Article 1 ──────────────────────────────────────────────────────────────
  {
    id: "ip-ranks",
    slug: "understanding-career-momentum",
    category: "game",
    title: "Understanding Your Career Momentum (IP & Ranks)",
    summary:
      "How the 'Game' side of Hirely Coach tracks your growth through Impact Points and Ranks.",
    tags: [
      "IP",
      "impact points",
      "ranks",
      "points",
      "career momentum",
      "novice",
      "apprentice",
      "candidate",
      "professional",
      "expert",
      "executive",
      "advanced",
      "master",
      "score",
    ],
    content: [
      {
        heading: "What are Impact Points (IP)?",
        body: "Impact Points are a numerical reflection of your activity. Unlike a typical score, IP represents 'Career Surface Area' — the more you practice and log, the more visible your growth becomes."
      },
      {
        heading: "How to Earn IP",
        body: "You earn IP by taking action inside the platform. Every completed activity adds to your total.",
        list: [
          { label: "Mock Interviews", detail: "50 IP — Completing a full simulation." },
          { label: "Weekly Wins", detail: "20 IP — Logging a real-world achievement." },
          { label: "Module Completion", detail: "100 IP — Finishing an Academy course." },
        ],
      },
      {
        heading: "Ranks",
        body: "There are 8 Ranks: Novice, Apprentice, Candidate, Professional, Expert, Executive, Advanced, and Master. Your Rank is determined by your total IP threshold and completing the required gate action for that level. Higher Ranks unlock exclusive, high-level Academy modules.",
      },
    ],
  },
  // ── Article 2 ──────────────────────────────────────────────────────────────
  {
    id: "academy-courses",
    slug: "academy-and-course-requirements",
    category: "academy",
    title: "The Academy & Course Requirements",
    summary:
      "Why courses are locked and how to progress along the mastery path.",
    tags: [
      "academy",
      "courses",
      "locked",
      "unlock",
      "mastery path",
      "requirements",
      "rank",
      "prerequisite",
      "performance rating",
    ],
    content: [
      {
        heading: "The Mastery Path",
        body: "Hirely Coach uses a structured path. You cannot jump to 'Salary Negotiation' before mastering 'Resume Foundation.' Each step builds the skills needed for the next."
      },
      {
        heading: "Unlocking Courses",
        body: "If a course is locked, check the Requirements tag on the card. It will typically require one of the following:",
        list: [
          {
            label: "Specific Rank",
            detail: "e.g., must be 'Professional' (1,100 IP) or 'Expert' (1,750 IP).",
          },
          {
            label: "Prerequisite Module",
            detail: "Complete a specific earlier module first.",
          },
          {
            label: "Minimum Global Performance Rating",
            detail: "e.g., 85% or higher across your mock interviews.",
          },
        ],
      },
    ],
  },
  // ── Article 3 ──────────────────────────────────────────────────────────────
  {
    id: "job-seeder",
    slug: "job-seeder-and-simulation-flow",
    category: "tools",
    title: "The Job Seeder & Simulation Flow",
    summary:
      "How the app automates your preparation — one link is all you need.",
    tags: [
      "job seeder",
      "simulation",
      "job url",
      "extract",
      "paste",
      "resume",
      "setup",
      "replace",
      "active target",
      "frictionless",
    ],
    content: [
      {
        heading: "One-Link Extraction",
        body: "When you paste a job URL, our AI surgically extracts the Job Title, Company, and Requirements. This information is automatically saved to your profile so you never have to re-enter it.",
      },
      {
        heading: "Frictionless Setup",
        body: "The Simulation page is designed to remember you. Your latest resume and target job are always pre-filled so you can jump straight into practice.",
      },
      {
        heading: "The Replace Feature",
        body: "Need to pivot? Use the [Replace] button next to your resume or simply edit the text in the Job Title/Description boxes. The app updates your 'Active Target' instantly."
      },
    ],
  },
  // ── Article 4 ──────────────────────────────────────────────────────────────
  {
    id: "impact-log",
    slug: "the-impact-log-weekly-wins",
    category: "tools",
    title: "The Impact Log (Weekly Wins)",
    summary:
      "Track real-world professional wins and give your Coach full context.",
    tags: [
      "impact log",
      "weekly wins",
      "wins",
      "growth hub",
      "journal",
      "networking",
      "achievements",
      "log",
      "coach context",
    ],
    content: [
      {
        heading: "What is a Win?",
        body: "A win is any professional action you took outside the app — networking, a successful coffee chat, or a breakthrough in your current project. Big or small, it counts.",
      },
      {
        heading: "Why Log It?",
        body: "The Impact Log sits at the center of your Growth Hub. It serves as your professional journal. Keeping this updated ensures your 'Coach' has the full context of your career progress, not just your interview scores."
      },
    ],
  },
  // ── Article 5 ──────────────────────────────────────────────────────────────
  {
    id: "notifications",
    slug: "notifications-and-the-action-feed",
    category: "notifications",
    title: "Notifications & The Action Feed",
    summary:
      "The orange badge, the feed, and how to stay updated in real-time.",
    tags: [
      "notifications",
      "action feed",
      "orange badge",
      "alert",
      "rank up",
      "performance",
      "feedback",
      "archive",
      "badge",
    ],
    content: [
      {
        heading: "The Orange Badge",
        body: "Whenever you earn IP, reach a new Rank, or receive a performance critique, an orange notification dot will appear in your Growth Hub. It's your signal that something important is waiting.",
      },
      {
        heading: "The Feed",
        body: "Click the notification to see your history. Each alert is a direct link — clicking a 'Performance Ready' notification will take you straight to the Archive to review your feedback."
      },
    ],
  },
  // ── Article 6 ──────────────────────────────────────────────────────────────
  {
    id: "simulation-tiers",
    slug: "simulation-tiers-intensity",
    category: "tools",
    title: "Article 6: Simulation Tiers (Setting the Intensity)",
    summary: "Choosing the right difficulty for your mock interview.",
    tags: [
      "simulation tiers",
      "casual tier",
      "professional tier",
      "surgical tier",
      "difficulty",
      "intensity",
      "mock interview",
      "AI interviewer",
      "grading",
      "STAR",
    ],
    content: [
      {
        heading: "Choosing Your Tier",
        body: "Before you begin a session, you must select a Simulation Tier. This determines the \"personality\" of the AI interviewer and the strictness of the grading.",
        list: [
          {
            label: "Casual Tier",
            detail: "Best for early-stage preparation. The AI is supportive and focuses on your basic storytelling and confidence.",
          },
          {
            label: "Professional Tier",
            detail: "The standard corporate experience. The AI asks common industry questions and expects polished, structured answers (like the STAR method).",
          },
          {
            label: "Surgical Tier",
            detail: "Our most intense mode. The AI will actively challenge your answers, probe for weaknesses in your logic, and grade your technical accuracy with zero margin for error.",
          },
        ],
      },
    ],
    seeAlso: ["mock-interview-experience", "managing-tiers"],
  },
  // ── Article 7 ──────────────────────────────────────────────────────────────
  {
    id: "mock-interview-experience",
    slug: "the-mock-interview-experience",
    category: "tools",
    title: "Article 7: The Mock Interview Experience",
    summary: "What happens inside the simulation room.",
    tags: [
      "mock interview",
      "simulation",
      "contextual questioning",
      "dynamic follow-ups",
      "voice",
      "text",
      "resume",
      "job description",
      "real-time",
    ],
    content: [
      {
        heading: "A Live Conversation",
        body: "The Hirely Coach Simulation is a dynamic, AI-driven environment. Unlike static question lists, this is a \"live\" conversation.",
        list: [
          {
            label: "Contextual Questioning",
            detail: "The AI doesn't just ask random questions. It analyzes your uploaded resume and the pre-filled job description to ask questions that a real recruiter at that specific company would ask.",
          },
          {
            label: "Dynamic Follow-ups",
            detail: "If your answer is vague, the AI will ask a follow-up question to dig deeper. It adapts to what you say in real-time.",
          },
          {
            label: "Format",
            detail: "You can engage via text or voice, allowing you to practice the specific medium of your upcoming interview (Phone screen vs. Video call).",
          },
        ],
      },
    ],
    seeAlso: ["simulation-tiers", "feedback-performance-metrics"],
  },
  // ── Article 8 ──────────────────────────────────────────────────────────────
  {
    id: "feedback-performance-metrics",
    slug: "feedback-and-performance-metrics",
    category: "tools",
    title: "Article 8: Feedback & Performance Metrics",
    summary: "Decoding your post-interview score.",
    tags: [
      "feedback",
      "performance report",
      "alignment",
      "clarity",
      "critical thinking",
      "gap analysis",
      "academy",
      "score",
      "metrics",
    ],
    content: [
      {
        heading: "Your Performance Report",
        body: "After every simulation, you receive a detailed Performance Report. We break your performance down into three surgical metrics.",
        list: [
          {
            label: "Alignment",
            detail: "How well did your experience match the specific needs of the job description? Did you use the right keywords and demonstrate the required skills?",
          },
          {
            label: "Clarity",
            detail: "This measures your communication efficiency. Did you ramble, or was your answer concise and easy to follow?",
          },
          {
            label: "Critical Thinking",
            detail: "How well did you handle \"curveball\" questions? This tracks your ability to stay composed and logical under pressure.",
          },
        ],
      },
      {
        heading: "Gap Analysis",
        body: "The Feedback Page will also provide a Gap Analysis — identifying exactly which Academy modules you should take next to improve your score.",
      },
    ],
    seeAlso: ["notifications", "feedback-gap-analysis"],
  },
  // ── Article 9 ──────────────────────────────────────────────────────────────
  {
    id: "resume-optimizer",
    slug: "the-resume-optimizer",
    category: "tools",
    title: "Article 9: The Resume Optimizer",
    summary: "Aligning your profile with your target role.",
    tags: [
      "resume optimizer",
      "keyword analysis",
      "bullet point",
      "impact-driven",
      "optimization",
      "job target",
      "pre-filled",
      "upload",
    ],
    content: [
      {
        heading: "Pre-Interview Alignment",
        body: "The Optimizer is a pre-interview tool designed to ensure you even get the \"invite.\" It compares your current resume against your active job target.",
        list: [
          {
            label: "Keyword Analysis",
            detail: "It identifies industry-specific terms missing from your resume that are prominent in the job description.",
          },
          {
            label: "Bullet Point Refinement",
            detail: "The Optimizer suggests \"Impact-driven\" rewrites for your experience, turning basic tasks into measurable achievements.",
          },
          {
            label: "Seamless Integration",
            detail: "Because your profile is pre-filled, you can run an optimization check in seconds without re-uploading documents.",
          },
        ],
      },
    ],
    seeAlso: ["job-seeder", "job-seeder-url-extraction"],
  },
  // ── Article 10 ──────────────────────────────────────────────────────────────
  {
    id: "impact-ledger",
    slug: "the-impact-ledger",
    category: "tools",
    title: "Article 10: The Impact Ledger (Long-term Wins)",
    summary: "Managing your history of achievements.",
    tags: [
      "impact ledger",
      "archive",
      "brag sheet",
      "wins",
      "export",
      "performance review",
      "promotion",
      "history",
      "long-term",
    ],
    content: [
      {
        heading: "Your Permanent Record",
        body: "Located inside the Archive, the Impact Ledger is separate from your interview recordings.",
        list: [
          {
            label: "The History of Wins",
            detail: "While the Growth Hub shows your current week's wins, the Ledger stores every win you've ever logged.",
          },
          {
            label: "Strategic Value",
            detail: "This serves as a \"Brag Sheet.\" When it's time for a real-year review or a promotion discussion, you can export your Ledger to show a consistent history of professional impact.",
          },
        ],
      },
    ],
    seeAlso: ["impact-log", "impact-ledger-vs-weekly-wins"],
  },
  // ── Article 11 ──────────────────────────────────────────────────────────────
  {
    id: "help-center-search",
    slug: "using-the-help-center",
    category: "notifications",
    title: "Article 11: Using the Help Center & Search",
    summary: "Navigating the Hirely Coach Knowledge Base.",
    tags: [
      "help center",
      "search",
      "quick-help",
      "contextual links",
      "IP bar",
      "knowledge base",
      "search bar",
      "master level",
      "surgical tier",
    ],
    content: [
      {
        heading: "Quick-Help Icons",
        body: "Every page in the app contains \"Quick-Help\" icons (the small ? buttons).",
        list: [
          {
            label: "Contextual Links",
            detail: "Clicking a help icon next to a feature (like the IP bar) will bring you directly to the relevant article.",
          },
          {
            label: "The Search Bar",
            detail: "Use the search bar at the top of this center to find specific topics, such as \"Master Level\" or \"Surgical Tier.\"",
          },
        ],
      },
    ],
    seeAlso: ["ip-ranks"],
  },
  // ── Article 12 ──────────────────────────────────────────────────────────────
  {
    id: "professional-level",
    slug: "the-professional-level",
    category: "game",
    title: "Article 12: The Professional Level (Level 4)",
    summary: "Transitioning from candidate to career professional.",
    tags: [
      "professional level",
      "level 4",
      "1100 IP",
      "career equity",
      "high-level communication",
      "project ownership",
      "personal branding",
      "networking",
      "quarterly review",
      "academy unlock",
    ],
    content: [
      {
        heading: "A Major Milestone",
        body: "The Professional Level is a major milestone in Hirely Coach. While the \"Candidate\" level focuses on getting the job, the Professional level focuses on excelling within it and building long-term career equity.",
        list: [
          {
            label: "The Shift",
            detail: "At this level, your Academy modules shift from \"Interview Basics\" to \"High-Level Communication,\" \"Project Ownership,\" and \"Personal Branding.\"",
          },
          {
            label: "Requirements",
            detail: "To reach this level, you must accumulate 1,100 IP. This ensures you have not only practiced interviews but have also consistently logged Weekly Wins in your Impact Ledger.",
          },
          {
            label: "Unlocks",
            detail: "Reaching Level 4 unlocks the Advanced Networking and Quarterly Review Strategy modules in the Academy.",
          },
        ],
      },
    ],
    seeAlso: ["ip-ranks", "course-difficulty-scaling"],
  },
  // ── Article 13 ──────────────────────────────────────────────────────────────
  {
    id: "course-difficulty-scaling",
    slug: "course-difficulty-level-scaling",
    category: "academy",
    title: "Article 13: Course Difficulty & Level Scaling",
    summary: "How the Academy adapts to your current Level.",
    tags: [
      "course difficulty",
      "level scaling",
      "foundational courses",
      "strategic courses",
      "mastery courses",
      "negotiation",
      "conflict resolution",
      "mentorship",
      "executive presence",
    ],
    content: [
      {
        heading: "A Scaled Learning Environment",
        body: "The Academy is not a static list of videos; it is a scaled learning environment. As you move up the Accelerator levels, the content becomes more complex.",
        list: [
          {
            label: "Foundational Courses (Levels 1–3)",
            detail: "Focus on the \"Mechanics\" — Resumes, Basic Interviewing, and Job Search Strategy.",
          },
          {
            label: "Strategic Courses (Levels 4–6)",
            detail: "Focus on \"Influence\" — Negotiation, Conflict Resolution, and Leading without Authority.",
          },
          {
            label: "Mastery Courses (Levels 7–8)",
            detail: "Focus on \"Legacy\" — Mentorship, Industry Thought Leadership, and Executive Presence.",
          },
        ],
      },
    ],
    seeAlso: ["academy-courses", "professional-level"],
  },
  // ── Article 14 ──────────────────────────────────────────────────────────────
  {
    id: "ready-to-apply",
    slug: "ready-to-apply",
    category: "tools",
    title: "Article 14: Ready to Apply (The Automatic Submission)",
    summary: "Taking the leap from practice to reality.",
    tags: [
      "ready to apply",
      "submission",
      "application",
      "professional tier score",
      "optimized resume",
      "simulation summary",
      "threshold",
    ],
    content: [
      {
        heading: "The Final Step",
        body: "The \"Ready to Apply\" feature is the final step of the Hirely Coach workflow. Once you have optimized your resume and achieved a \"Professional\" tier score in a simulation, the app assists you in the final submission.",
        list: [
          {
            label: "How it Works",
            detail: "In the Simulation summary page, if your score meets the threshold, the Ready to Apply button activates.",
          },
          {
            label: "Integration",
            detail: "Clicking this uses your saved, optimized resume and job title to prepare your final application package, ensuring the version you submit is the same one you just perfected in the simulation.",
          },
        ],
      },
    ],
    seeAlso: ["resume-optimizer", "feedback-performance-metrics"],
  },
  // ── Articles 15–16 are reserved for future content ──────────────────────────
  // ── Article 17 ──────────────────────────────────────────────────────────────
  {
    id: "job-seeder-url-extraction",
    slug: "job-seeder-url-extraction",
    category: "tools",
    title: "Article 17: Understanding the Job Seeder (URL Extraction)",
    summary: "How to transform a web link into a tailored interview environment.",
    tags: [
      "job seeder",
      "URL",
      "url extraction",
      "scrape",
      "job title",
      "hiring company",
      "core requirements",
      "clean header",
      "active target",
      "data persistence",
    ],
    content: [
      {
        heading: "One Link, Full Context",
        body: "The Job Seeder is one of the most powerful \"surgical\" tools in Hirely Coach. Instead of forcing you to copy and paste walls of text, our AI scrapes the essential data from a job posting URL.",
        list: [
          {
            label: "What it Extracts",
            detail: "The AI identifies the Job Title, the Hiring Company, and the Core Requirements (skills and responsibilities).",
          },
          {
            label: "The \"Clean Header\" Logic",
            detail: "The system automatically replaces messy URLs with professional titles (e.g., \"Software Engineer at Google\") across your entire dashboard.",
          },
          {
            label: "Data Persistence",
            detail: "Once a job is \"seeded,\" it remains your Active Target. This target is used to pre-fill the Simulation, the Resume Optimizer, and the Feedback metrics until you choose to replace it.",
          },
        ],
      },
    ],
    seeAlso: ["job-seeder", "troubleshooting-tech-specs"],
  },
  // ── Article 18 ──────────────────────────────────────────────────────────────
  {
    id: "feedback-gap-analysis",
    slug: "feedback-page-gap-analysis",
    category: "tools",
    title: "Article 18: The Feedback Page & Gap Analysis",
    summary: "Moving from a \"Score\" to a \"Strategy.\"",
    tags: [
      "feedback page",
      "gap analysis",
      "score breakdown",
      "transcript",
      "alignment",
      "clarity",
      "critical thinking",
      "performance trends",
      "academy modules",
      "executive presence",
    ],
    content: [
      {
        heading: "Your Post-Interview Debrief",
        body: "The Feedback page is your post-interview debrief. It is designed to act as a bridge between the Simulation and the Academy.",
        list: [
          {
            label: "The Score Breakdown",
            detail: "You are graded on Alignment, Clarity, and Critical Thinking.",
          },
          {
            label: "The Transcript",
            detail: "Review exactly what you said versus what the AI said. The AI highlights specific moments where your answer could have been more \"Surgical.\"",
          },
          {
            label: "Gap Analysis",
            detail: "This is a dynamic list of recommended Academy modules. If you scored low on \"Executive Presence,\" the Gap Analysis will provide a direct link to the Level 4 Professional Communication course.",
          },
          {
            label: "Performance Trends",
            detail: "The page also shows how this session compares to your previous ones, tracking your \"Clarity\" score over time.",
          },
        ],
      },
    ],
    seeAlso: ["feedback-performance-metrics", "academy-courses"],
  },
  // ── Article 19 ──────────────────────────────────────────────────────────────
  {
    id: "managing-tiers",
    slug: "managing-simulation-tiers",
    category: "tools",
    title: "Article 19: Managing Your Tiers (Casual vs. Professional vs. Surgical)",
    summary: "How the interview difficulty adapts to your career stage.",
    tags: [
      "managing tiers",
      "casual tier",
      "professional tier",
      "surgical tier",
      "STAR method",
      "behavioral profile",
      "follow-up questions",
      "level 7",
      "level 8",
      "advanced",
      "master",
    ],
    content: [
      {
        heading: "Behavioral Profiles",
        body: "Before starting any simulation, you must choose a Tier. This selection changes the AI's \"Behavioral Profile\":",
        list: [
          {
            label: "Casual Tier",
            detail: "The AI acts as a friendly recruiter. It gives you more time to speak and focuses on your \"Storytelling.\"",
          },
          {
            label: "Professional Tier",
            detail: "The AI acts as a Senior Manager. It expects structured answers (like STAR) and will ask 1–2 challenging follow-up questions to test your depth.",
          },
          {
            label: "Surgical Tier",
            detail: "The AI acts as an Executive or Technical Lead. It will purposefully interrupt or push back on your logic to see how you handle pressure. Note: High scores in this tier are required for Level 7 (Advanced) and Level 8 (Master) rankings.",
          },
        ],
      },
    ],
    seeAlso: ["simulation-tiers", "mock-interview-experience"],
  },
  // ── Article 20 ──────────────────────────────────────────────────────────────
  {
    id: "impact-ledger-vs-weekly-wins",
    slug: "impact-ledger-vs-weekly-wins",
    category: "tools",
    title: "Article 20: The Impact Ledger vs. Weekly Wins",
    summary: "Organizing your professional evidence.",
    tags: [
      "impact ledger",
      "weekly wins",
      "growth hub",
      "archive",
      "brag sheet",
      "IP rewards",
      "export",
      "performance reviews",
      "date indexed",
    ],
    content: [
      {
        heading: "Two Complementary Systems",
        body: "While they work together, the Growth Hub and the Archive handle your \"Wins\" differently.",
        list: [
          {
            label: "The Growth Hub Feed",
            detail: "This is for your Weekly Wins. It is meant to be updated every Friday. These entries give you immediate IP rewards and keep your momentum high.",
          },
          {
            label: "The Impact Ledger (Archive)",
            detail: "This is your long-term database. It stores every win you've ever entered. It is indexed by date and category, allowing you to quickly find evidence for \"Result-based\" interview questions.",
          },
          {
            label: "Exporting Data",
            detail: "In a future update, you will be able to export your Impact Ledger as a \"Brag Sheet\" to bring into real-world performance reviews.",
          },
        ],
      },
    ],
    seeAlso: ["impact-log", "impact-ledger"],
  },
  // ── Article 21 ──────────────────────────────────────────────────────────────
  {
    id: "troubleshooting-tech-specs",
    slug: "troubleshooting-tech-specs",
    category: "notifications",
    title: "Article 21: Troubleshooting & Tech Specs",
    summary: "Ensuring a smooth experience.",
    tags: [
      "troubleshooting",
      "microphone",
      "voice simulation",
      "link scraping",
      "paywall",
      "manual entry",
      "IP sync",
      "progress syncing",
      "refresh",
      "headset",
      "browser permissions",
    ],
    content: [
      {
        heading: "Common Issues & Fixes",
        body: "To keep the experience \"Real,\" the technical setup must be flawless.",
        list: [
          {
            label: "Microphone Access",
            detail: "If you are using the Voice Simulation, ensure your browser has permission to access your microphone. We recommend using a headset for the highest clarity score.",
          },
          {
            label: "Link Scraping Issues",
            detail: "If the Job Seeder cannot read a specific URL (due to a paywall or login requirement), you can always use the \"Manual Entry\" toggle to paste the description directly.",
          },
          {
            label: "Progress Syncing",
            detail: "Your IP and Level progress are saved in real-time. If you complete a module but don't see your IP increase, refresh the Growth Hub to sync with the server.",
          },
        ],
      },
    ],
    seeAlso: ["job-seeder-url-extraction", "simulation-tiers"],
  },
  // ── Article 22 ──────────────────────────────────────────────────────────────
  {
    id: "ready-to-apply-feature",
    slug: "ready-to-apply-feature",
    category: "tools",
    title: "Article 22: The Ready to Apply Feature",
    summary: "Closing the loop between practice and the real world.",
    tags: [
      "ready to apply",
      "green light",
      "optimized resume",
      "professional tier score",
      "75%",
      "target job",
      "completed",
      "archive",
      "final checklist",
      "application",
    ],
    content: [
      {
        heading: "Your Green Light",
        body: "The Ready to Apply button is your \"Green Light.\" It only appears when:",
        list: [
          {
            label: "Optimized Résumé",
            detail: "You have a Résumé optimized for the specific job.",
          },
          {
            label: "Score Threshold",
            detail: "You have achieved a Professional Tier score of 75% or higher for that job.",
          },
        ],
      },
      {
        heading: "What Happens Next",
        body: "Clicking this button marks the \"Target Job\" as Completed in your Archive and provides a final checklist of your optimized documents, ensuring you go into the real application with 100% confidence.",
      },
    ],
    seeAlso: ["ready-to-apply", "resume-optimizer", "feedback-performance-metrics"],
  },
];

/** Full-text search across title, summary, tags, and content. */
export function searchArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_ARTICLES;
  return HELP_ARTICLES.filter((a) => {
    const haystack = [
      a.title,
      a.summary,
      ...a.tags,
      ...a.content.map((s) => [s.heading ?? "", s.body, ...(s.list ?? []).map((l) => l.label + " " + l.detail)].join(" ")),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
