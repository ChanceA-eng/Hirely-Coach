import { loadImpactEntries } from "../lib/impactLog";
import { loadInterviewHistory } from "../lib/interviewStorage";
import {
  HARD_GATES,
  LEVELS,
  hasExportedPerformancePortfolio,
  type ProgressTier,
} from "../lib/progression";

export type QuizOption = {
  label: string;
  text: string;
  correct: boolean;
};

export type QuizQuestion = {
  scenario: string;
  options: QuizOption[];
};

export type CourseContent = {
  executiveBrief: string;
  playbookItems: string[];
  quiz: QuizQuestion[];
};

export type CourseEntry = {
  id: string;
  title: string;
  level: ProgressTier["title"];
  track: string;
  summary: string;
  readingMins: number;
  targetTool: string;
  prerequisiteCourseId?: string;
  completionGate?: {
    type: "resume-scan-min-score" | "creative-impact-win" | "negotiation-sim-min-score";
    minScore?: number;
    scoreLabel?: string;
  };
  content: CourseContent;
};

export const COURSE_CATALOG: CourseEntry[] = [
  /* ─── NOVICE ──────────────────────────────────────────────────────── */
  {
    id: "interview-types",
    title: "Introduction to Interview Types",
    level: "Novice",
    track: "Interview Skills",
    summary: "Decode every interviewer's hidden agenda and tailor your message to the right persona.",
    readingMins: 6,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `In the high-end job market, an interview is not a "test" of your personality — it is a series of **strategic gates**. Each gate has a different "Sentry" with a specific motive. If you give a "Peer" answer to an "Executive," you fail. You must identify the persona before you open your mouth.

**The Screener (The Gatekeeper):** Usually HR or a junior recruiter. Their goal is **Risk Mitigation**. They have 100 candidates and need to find 90 reasons to say "No." They check for salary alignment, location, and basic keyword match.

**The Peer / Technical Lead (The Practitioner):** This person will actually work with you. Their goal is **Resource Assessment**. They want to know: "Will I have to fix your mistakes?" and "Are you faster than me?"

**The Executive / Stakeholder (The Decision Maker):** The person who owns the budget. Their goal is **ROI (Return on Investment)**. They don't care *how* you do the work; they care *how your work moves the needle* on company revenue or efficiency.`,
      playbookItems: [
        '**The "Who\'s Who" Inquiry:** 24 hours before any interview, email the coordinator: *"Could you share the titles and roles of the panel? I want to ensure my preparation aligns with their specific departmental goals."*',
        "**Audience-Centric Messaging:** To Screeners: Be clear, concise, and hit every keyword in the JD. To Peers: Talk shop — use the technical language of the role. To Executives: Use *The Language of Business*: Profit, Loss, Scale, and Strategy.",
        '**The 30-Second Pivot:** Prepare three versions of your "Tell me about yourself" pitch, tailored to these three personas.',
      ],
      quiz: [
        {
          scenario:
            'You are meeting the VP of Operations for a final round. They ask, "How do you handle a heavy workload?" What is the "Executive" response?',
          options: [
            {
              label: "A",
              text: "I stay late and make sure every task on my list is checked off.",
              correct: false,
            },
            {
              label: "B",
              text: "I prioritize tasks based on their impact on quarterly KPIs and delegate or automate low-value processes to protect the bottom line.",
              correct: true,
            },
            {
              label: "C",
              text: "I'm a very hard worker and I never complain about extra hours.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "overcoming-nerves",
    title: "Overcoming Interview Nerves",
    level: "Novice",
    track: "Interview Skills",
    summary: "Convert anxiety into peak performance using physiological anchoring and elite mental framing.",
    readingMins: 5,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `Nerves are a biological signal that you are entering a "High-Stakes" environment. The mistake most professionals make is trying to **suppress** the feeling, which leads to **Cognitive Load** — your brain is so busy trying to look calm that it forgets how to be smart.

Elite performers use **Physiological Anchoring**. You must move the energy from your chest (anxiety) to your brain (focus).`,
      playbookItems: [
        '**Reframing the Bio-Signal:** When your heart races, tell yourself: *"This is my body preparing me to perform. I am pumped, not panicked."* This simple linguistic shift changes how the brain processes adrenaline.',
        "**The Impact Ledger Anchor:** Five minutes before the call, open your Hirely Coach Archive. Read your top 3 \"Wins.\" This provides *Cognitive Priming* — it forces your brain to recall your competence, making it impossible for Imposter Syndrome to take root.",
        "**The 4-7-8 Technique:** Inhale for 4 seconds, hold for 7, exhale for 8. The long exhale triggers the Vagus nerve, which manually shuts down the \"Fight or Flight\" response.",
        '**The Consultant Frame:** Remind yourself: *"They have a problem (an open role). I am a specialist who might have the solution. We are just two professionals seeing if we are a match."* This removes the power imbalance.',
      ],
      quiz: [
        {
          scenario:
            "Halfway through an interview, you realize you gave a poor answer to a previous question. You feel your face getting hot and your heart racing. What is the move?",
          options: [
            {
              label: "A",
              text: "Ignore it and hope they didn't notice.",
              correct: false,
            },
            {
              label: "B",
              text: 'Take a breath, and at the end of your current answer, say: "Actually, thinking back to your question about [X], I\'d like to add one key detail I missed that clarifies my approach."',
              correct: true,
            },
            {
              label: "C",
              text: "Stop the interview to apologize for being nervous.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "star-101",
    title: "STAR Method 101",
    level: "Novice",
    track: "Interview Skills",
    summary: "Master the logic filter that turns vague stories into verifiable, promotion-grade evidence.",
    readingMins: 7,
    targetTool: "STARR Lab",
    content: {
      executiveBrief: `The STAR Method isn't just a "template" — it is a **Logic Filter**. Recruiters hear hundreds of "vague stories" (e.g., "I'm a great team player"). STAR forces you to provide **Verifiable Evidence**. If your story doesn't have a "Result," it didn't happen.

In the world of Hirely Coach, we focus on the **Impact-to-Action Ratio**: 80% of your story should be the specific steps you took and the measurable outcome they produced.`,
      playbookItems: [
        '**Situation (10%):** Set the stage. *"Our department was facing a 20% churn rate."*',
        '**Task (10%):** Define your specific responsibility. *"I was tasked with identifying the root cause."*',
        '**Action (60%):** Use high-impact verbs. *I analyzed, I implemented, I negotiated.* Avoid "We."',
        '**Result (20%):** The "Proof." Always use a number. *"We reduced churn to 5% within 90 days."*',
        '**The "High-End" Distinction:** A *Junior* STAR story ends with "The project was a success." A *Master* STAR story ends with "This resulted in a $50k cost saving and became the new standard operating procedure for the regional team."',
      ],
      quiz: [
        {
          scenario:
            'Which of these is a properly formatted "Action" statement for a STAR story?',
          options: [
            {
              label: "A",
              text: "We all worked together to make sure the client was happy.",
              correct: false,
            },
            {
              label: "B",
              text: "I handled the communication between the two departments.",
              correct: false,
            },
            {
              label: "C",
              text: "I designed a new automated tracking system in Excel that consolidated three manual reports into one live dashboard.",
              correct: true,
            },
          ],
        },
      ],
    },
  },
  /* ─── APPRENTICE (locked placeholder) ────────────────────────────── */
  {
    id: "deep-dive-star",
    title: "Deep Dive into the STAR Method",
    level: "Apprentice",
    track: "Interview Skills",
    summary: "Use STAR as a strategy framework, not a script, and connect past wins to future business challenges.",
    readingMins: 8,
    targetTool: "The Simulator",
    prerequisiteCourseId: "star-101",
    content: {
      executiveBrief: `Most candidates use **Situation, Task, Action, Result (STAR)** as a shield; you will use it as a scalpel. The difference between a Novice STAR and an Apprentice STAR is the **Action-to-Strategy ratio**. You must prove not just what you did, but the strategic intent behind it.

At this level, we introduce the **Pivot Point**: connecting your past result to the current company's future challenge.`,
      playbookItems: [
        "**The 60% Action Rule:** Your Action section must be the longest part of your story. Break it into three steps: 1) Diagnosis, 2) Execution, 3) Optimization.",
        "**The Active Verbs List:** Replace passive words like \"helped\" or \"led\" with \"Architected,\" \"Standardized,\" \"Negotiated,\" or \"Automated.\"",
        "**The Future-Proof Bridge:** End your Result with a bridge: \"I applied this logic to resolve [Problem X], and I am prepared to apply that same framework to your current [Specific Department Challenge].\"",
      ],
      quiz: [
        {
          scenario: "You are explaining a time you failed. How do you finish the Result section of the STAR story?",
          options: [
            {
              label: "A",
              text: "I learned that I should have worked harder and I won't let it happen again.",
              correct: false,
            },
            {
              label: "B",
              text: "I identified the systemic gap that caused the failure and implemented a redundant check-in process that prevented it from recurring for the remainder of the fiscal year.",
              correct: true,
            },
            {
              label: "C",
              text: "It wasn't entirely my fault, but we managed to fix it in the end.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "behavioral-interview-basics",
    title: "Behavioral Interview Basics",
    level: "Apprentice",
    track: "Interview Skills",
    summary: "Build a reusable story library mapped to conflict, leadership, adaptability, and failure.",
    readingMins: 7,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `Behavioral interviewing is based on one premise: past behavior is the best predictor of future performance. Recruiters are not asking \"What would you do?\"; they are asking \"What did you do?\"

To win here, you need a **Mental Filing Cabinet** of stories categorized by core competencies: Conflict, Leadership, Adaptability, and Failure.`,
      playbookItems: [
        "**The Rule of Three:** Prepare three universal stories that can be adapted to multiple questions. One conflict story can often be reframed as a leadership story.",
        "**The Negative-to-Positive Flip:** When asked about conflict, never blame a person. Blame a misalignment of objectives or a communication gap.",
        "**The Non-Verbal Anchor:** During the Action phase, lean in slightly to signal engagement and authority.",
      ],
      quiz: [
        {
          scenario: "An interviewer asks, \"Tell me about a time you disagreed with your manager.\" What is the objective of this question?",
          options: [
            {
              label: "A",
              text: "To see if you are a yes-man or a troublemaker.",
              correct: false,
            },
            {
              label: "B",
              text: "To assess your ability to navigate professional hierarchy while advocating for the best business outcome.",
              correct: true,
            },
            {
              label: "C",
              text: "To find out if your previous manager was difficult to work with.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "communication-fundamentals",
    title: "Effective Communication Fundamentals",
    level: "Apprentice",
    track: "Professional Skills",
    summary: "Use structured answers and active listening to project clarity, confidence, and executive presence.",
    readingMins: 6,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `In high-end roles, communication is synonymous with clarity of thought. If you ramble, you are seen as disorganized. If you are too brief, you are seen as inexperienced.

Apprentice-level communication uses **Bottom Line Up Front (BLUF)**: give the answer first, then provide context.`,
      playbookItems: [
        "**The BLUF Technique (Bottom Line Up Front):** Give a one-sentence executive summary first. Example: \"Yes, I have managed budgets exceeding $500k; specifically, I oversaw...\"",
        "**The Vocalized Pause:** Replace filler words with silent pauses. Silence sounds more authoritative than filler noise.",
        "**Active Listening Hooks:** Reuse the interviewer's own wording: \"You mentioned the team is focused on scalability...\" This creates a mirroring effect.",
      ],
      quiz: [
        {
          scenario: "An interviewer asks a broad question: \"Tell me about your experience.\" How do you start?",
          options: [
            {
              label: "A",
              text: "Where would you like me to start? My first job or my college degree?",
              correct: false,
            },
            {
              label: "B",
              text: "I have spent the last five years specializing in [Core Skill], with a focus on delivering [Specific Result]. To give you the best context, should I focus on my recent project at [Company X]?",
              correct: true,
            },
            {
              label: "C",
              text: "Start from the beginning of your resume and walk through every role.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "time-management-pros",
    title: "Time Management for Busy Professionals",
    level: "Apprentice",
    track: "Professional Skills",
    summary: "Prioritize high-impact work, protect deep-focus time, and decline low-value tasks with professionalism.",
    readingMins: 8,
    targetTool: "Archive",
    content: {
      executiveBrief: `Time management is a misnomer; you cannot manage time. You can only manage priorities and energy. High-level professionals do not do more; they do the right things.

Use the **Eisenhower Matrix** to separate urgent tasks (which keep you busy) from important tasks (which get you promoted).`,
      playbookItems: [
        "**The 80/20 Audit:** Identify the 20% of tasks that generate 80% of your impact, and protect time for those activities.",
        "**Time Blocking:** Do not work from an open to-do list. Schedule deep work blocks (extended focus sessions) directly in your calendar.",
        "**The No Framework:** Decline low-value work gracefully: \"I would love to help, but to hit our deadline on [High-Priority Project], I need to keep my focus there for now.\"",
      ],
      quiz: [
        {
          scenario: "You have a major project due in two days, and a colleague asks for 15 minutes to help with a minor administrative task. What is the Apprentice-level response?",
          options: [
            {
              label: "A",
              text: "Sure, I can help quickly. I like being a team player.",
              correct: false,
            },
            {
              label: "B",
              text: "I am currently in a deep-work block for the [Project Name] deadline. Can we touch base on Thursday once that is submitted?",
              correct: true,
            },
            {
              label: "C",
              text: "Ignore the email until you finish your work.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  /* ─── CANDIDATE (locked placeholder) ─────────────────────────────── */
  {
    id: "tough-interview-questions",
    title: "Tackling Tough Interview Questions",
    level: "Candidate",
    track: "Interview Skills",
    summary: "Use pivot-and-reframe psychology to turn pressure questions into proof of value.",
    readingMins: 9,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `Tough questions (for example: \"What is your greatest weakness?\") are not traps; they are **Value Tests**. Interviewers are measuring self-awareness and resilience.

At the Candidate level, use **Pivot and Reframe**: acknowledge the challenge, then pivot directly to a skill or solution that benefits the company.`,
      playbookItems: [
        "**Weakness Reframes:** Avoid fake weaknesses. Use a real technical gap you are actively closing, then prove progress with evidence.",
        "**The Why Us Anchor:** Do not center what the company can do for you. Center the specific problem you are uniquely equipped to solve.",
        "**Handling the Gap:** Frame employment gaps or missing tool experience as a strategic pivot or focused skill-acquisition period.",
      ],
      quiz: [
        {
          scenario:
            "An interviewer says: You do not seem to have much experience with Software X. How will you handle that?",
          options: [
            {
              label: "A",
              text: "I am a very fast learner and I am sure I can figure it out quickly.",
              correct: false,
            },
            {
              label: "B",
              text: "While my primary expertise is in Software Y, the underlying logic of Software X is nearly identical. In my last role, I migrated a team to a new platform in under two weeks, and I plan to apply that same learning framework here.",
              correct: true,
            },
            {
              label: "C",
              text: "Is that software really necessary for this specific role?",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "unique-interview-story",
    title: "Developing Your Unique Interview Story",
    level: "Candidate",
    track: "Interview Skills",
    summary: "Build one signature story that frames you as a strategic decision-maker under pressure.",
    readingMins: 10,
    targetTool: "Archive",
    content: {
      executiveBrief: `Most candidates are functional: they list duties. You must be narrative.

Build a **Signature Story** from your Impact Ledger that demonstrates how you handle ambiguity and deliver at scale. Use the Hero's Journey sequence: challenge, strategic choice, universal result.`,
      playbookItems: [
        "**Internal Monologue:** Explain what you were thinking during the turning point. This reveals judgment and executive logic.",
        "**Conflict Hook:** Every story needs a villain. In business, that is often inefficiency, declining revenue, or technical debt.",
        "**Universal Result:** Close with transferability: what system or template did you create that others can now reuse?",
      ],
      quiz: [
        {
          scenario: "What is the most important element of a signature story?",
          options: [
            {
              label: "A",
              text: "Making sure the story is at least ten minutes long to show detail.",
              correct: false,
            },
            {
              label: "B",
              text: "Demonstrating a high-stakes decision you made that led to a measurable business outcome.",
              correct: true,
            },
            {
              label: "C",
              text: "Proving that you did all the work by yourself without any help.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "advanced-keyword-optimization",
    title: "Advanced Keyword Optimization (ATS)",
    level: "Candidate",
    track: "Resume & Branding",
    summary: "Use contextual keywords and result-coupled phrasing to improve Applicant Tracking System ranking.",
    readingMins: 11,
    targetTool: "Resume Optimizer",
    completionGate: {
      type: "resume-scan-min-score",
      minScore: 60,
      scoreLabel: "Keyword Match Score",
    },
    content: {
      executiveBrief: `Before a human sees your resume, an **Applicant Tracking System (ATS)** often scores and ranks it.

To beat modern filters, go beyond buzzwords. Use contextual keywords: not just \"management\", but specific patterns like stakeholder management or budget management paired with measurable outcomes.`,
      playbookItems: [
        "**Mirror the Job Description (JD):** Focus first on hard skills in the top five bullet points of the Job Description (JD).",
        "**Standard Formatting:** Avoid design-heavy layouts that break text extraction. If parsers cannot read it, ranking collapses.",
        "**Keyword-to-Result Ratio:** Pair each technical keyword with a measurable result in the same bullet line.",
      ],
      quiz: [
        {
          scenario: "How should you include Project Management on your resume for a high-end ATS?",
          options: [
            {
              label: "A",
              text: "List it in a skills section at the bottom of the page.",
              correct: false,
            },
            {
              label: "B",
              text: "Integrate it into an achievement: Utilized Project Management frameworks to deliver Project Name 10% under budget.",
              correct: true,
            },
            {
              label: "C",
              text: "Bold Project Management every time it appears.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "impactful-bullet-points",
    title: "Crafting Impactful Bullet Points",
    level: "Candidate",
    track: "Resume & Branding",
    summary: "Apply the What-How-Why formula to convert responsibilities into quantified outcomes.",
    readingMins: 9,
    targetTool: "Resume Optimizer",
    content: {
      executiveBrief: `A resume is a marketing document, not a job description.

Standard bullets explain responsibility. Impactful bullets prove achievement. Use the **What-How-Why** structure: what you did, how you did it, and why it mattered.`,
      playbookItems: [
        "**So What Audit:** Every bullet must answer the implied recruiter question: so what changed because of this work?",
        "**Lead with the Verb:** Start with power verbs such as orchestrated, accelerated, or surpassed.",
        "**Number Rule:** At least 70% of bullet points should include a hard number, currency value, or percentage.",
      ],
      quiz: [
        {
          scenario: "Which option is the most impactful bullet point?",
          options: [
            {
              label: "A",
              text: "Responsible for answering customer emails and resolving complaints.",
              correct: false,
            },
            {
              label: "B",
              text: "Managed a team of five people to ensure high customer satisfaction.",
              correct: false,
            },
            {
              label: "C",
              text: "Reduced customer churn by 12% in Quarter 3 by implementing a new automated feedback loop for high-priority accounts.",
              correct: true,
            },
          ],
        },
      ],
    },
  },
  /* ─── EXPERT ──────────────────────────────────────────────────────── */
  {
    id: "systems-thinking-foundations",
    title: "Systems Thinking for Career Operators",
    level: "Expert",
    track: "Career Strategy",
    summary: "Model bottlenecks, feedback loops, and leverage points to scale your impact beyond individual tasks.",
    readingMins: 11,
    targetTool: "System Mapping",
    content: {
      executiveBrief: `Experts stop solving isolated problems and start engineering systems. Your value increases when outcomes persist even when you are offline.

Use a systems lens: map inputs, constraints, and downstream effects before proposing a fix.`,
      playbookItems: [
        "**Bottleneck First:** Improve the slowest stage in the workflow before optimizing everything else.",
        "**Feedback Loops:** Capture one metric that tells you if your intervention is compounding or decaying.",
        "**Leverage Points:** Prioritize low-effort changes that influence multiple teams or milestones.",
      ],
      quiz: [
        {
          scenario: "Which move reflects systems thinking in a cross-functional project?",
          options: [
            { label: "A", text: "Work faster individually to clear your own queue.", correct: false },
            { label: "B", text: "Identify the handoff delay between teams and redesign the approval sequence.", correct: true },
            { label: "C", text: "Wait for leadership to assign new process rules.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "operating-rhythm-design",
    title: "Operating Rhythm Design",
    level: "Expert",
    track: "Leadership",
    summary: "Build weekly and monthly decision cadences that reduce chaos and improve execution quality.",
    readingMins: 10,
    targetTool: "System Mapping",
    content: {
      executiveBrief: `High-performing teams run on rhythm, not urgency. Create lightweight rituals for planning, risk review, and execution accountability.`,
      playbookItems: [
        "**Weekly Control Tower:** Track 3 priorities, 3 blockers, and 3 decisions required.",
        "**Decision Log:** Record key calls and rationale so future teams can audit and improve.",
        "**Escalation Rules:** Define when a blocker is solved locally versus raised to leadership.",
      ],
      quiz: [
        {
          scenario: "A team repeatedly misses deadlines despite long meetings. What is the expert move?",
          options: [
            { label: "A", text: "Schedule even longer status meetings.", correct: false },
            { label: "B", text: "Implement a fixed decision cadence with explicit owners and due dates.", correct: true },
            { label: "C", text: "Push all deadlines by two weeks.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "process-improvement-playbook",
    title: "Process Improvement Playbook",
    level: "Expert",
    track: "Leadership",
    summary: "Design repeatable process upgrades and prove business impact with measurable before/after evidence.",
    readingMins: 12,
    targetTool: "System Mapping",
    content: {
      executiveBrief: `Process improvement is the bridge into executive trust. Your objective is not a clever fix; it is a repeatable, auditable operating standard.`,
      playbookItems: [
        "**Baseline Snapshot:** Capture cycle time, error rate, and throughput before interventions.",
        "**Pilot and Compare:** Run a small controlled rollout and compare deltas over a fixed window.",
        "**Adoption Protocol:** Publish one-page SOP updates so the improvement survives team turnover.",
      ],
      quiz: [
        {
          scenario: "What evidence best validates a process improvement win?",
          options: [
            { label: "A", text: "Positive comments from one stakeholder.", correct: false },
            { label: "B", text: "Before/after metrics showing lower cycle time and fewer errors.", correct: true },
            { label: "C", text: "A plan to improve in the next quarter.", correct: false },
          ],
        },
      ],
    },
  },
  /* ─── EXECUTIVE ───────────────────────────────────────────────────── */
  {
    id: "difficult-interviews-mastery",
    title: "Mastering Difficult Interviews (Panel, Case, Technical)",
    level: "Executive",
    track: "Interview Skills",
    summary: "Demonstrate executive composure under stress with visual problem framing and stakeholder control.",
    readingMins: 11,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `Executive interviews are stress tests. You are not judged only on the right answer; you are judged on your process.

In case interviews and panel rounds, demonstrate executive composure by using visual language to simplify complexity and make decision logic visible.`,
      playbookItems: [
        "**The Whiteboard Method:** Use a digital whiteboard or notepad to sketch your logic live. This positions you as a visual leader.",
        "**Stakeholder Map:** In panel rounds, identify the Skeptic and the Champion. Win the Skeptic first by validating concerns, then propose your path.",
        "**Second-Order Thinking:** Solve the root issue behind the issue. Example: fix onboarding friction causing churn, not only churn symptoms.",
      ],
      quiz: [
        {
          scenario: "During a case interview, you receive a problem with no clear data. How do you respond?",
          options: [
            {
              label: "A",
              text: "I cannot answer this without more information.",
              correct: false,
            },
            {
              label: "B",
              text: "Since we lack hard data, I will make a set of logical assumptions based on market standards to build a framework for the solution.",
              correct: true,
            },
            {
              label: "C",
              text: "Guess a number and hope it is close.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "advanced-star-applications",
    title: "Advanced STAR Method Applications",
    level: "Executive",
    track: "Interview Skills",
    summary: "Upgrade to STAR-L and prove systemic learning, scale, and organization-level impact.",
    readingMins: 10,
    targetTool: "The Simulator",
    content: {
      executiveBrief: `At the Executive level, STAR becomes STAR-L: Situation, Task, Action, Result, Learning.

Leaders are expected to be learning machines. Every win or failure should generate a systemic improvement that raises company performance.`,
      playbookItems: [
        "**The L (Learning):** End stories with a reusable lesson. Example: cross-department silos reduce Return on Investment (ROI), so introduce a weekly silo-breaker sync.",
        "**Creative Pivot:** When discussing failure, highlight the workaround you designed under pressure.",
        "**Scale Factor:** Use percentages in addition to absolute numbers to show business scaling fluency.",
      ],
      quiz: [
        {
          scenario: "What is the primary difference between a manager STAR story and an executive STAR story?",
          options: [
            {
              label: "A",
              text: "The executive story is always much longer.",
              correct: false,
            },
            {
              label: "B",
              text: "The executive story emphasizes systemic impact on the company, not only task completion.",
              correct: true,
            },
            {
              label: "C",
              text: "The executive story mentions more famous people.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "leadership-influence-basics",
    title: "Leadership and Influence Basics",
    level: "Executive",
    track: "Professional Skills",
    summary: "Influence outcomes without authority by combining strategic empathy with creative narrative framing.",
    readingMins: 9,
    targetTool: "Archive",
    content: {
      executiveBrief: `Leadership is not a title. Leadership is the ability to influence outcomes without authority.

Creative professionalism at this level means using storytelling to align people to your vision through strategic empathy.`,
      playbookItems: [
        "**Inclusion Hook:** Position proposals as direct support for the other team’s Key Performance Indicators (KPI).",
        "**Narrative Arc:** Use a bridge-to-the-future story that paints a concrete post-solution state.",
        "**3-to-1 Feedback Rule:** For each creative critique, provide three constructive observations to preserve social capital.",
      ],
      quiz: [
        {
          scenario: "You need help from an overworked department. What is the influence move?",
          options: [
            {
              label: "A",
              text: "Say it is a direct order from the chief executive officer (CEO).",
              correct: false,
            },
            {
              label: "B",
              text: "Identify one pain point in their workflow and show how your project removes that pain.",
              correct: true,
            },
            {
              label: "C",
              text: "Offer to do their work for them in exchange.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  {
    id: "workplace-problem-solving",
    title: "Problem Solving in the Workplace",
    level: "Executive",
    track: "Professional Skills",
    summary: "Move from reactive fixes to anticipatory systems using first-principles and constraint-based innovation.",
    readingMins: 12,
    targetTool: "Archive",
    completionGate: {
      type: "creative-impact-win",
    },
    content: {
      executiveBrief: `Standard problem solving is reactive. Executive problem solving is anticipatory.

You do not wait for fires; you design creative firebreaks. Use first-principles thinking to rebuild better systems from fundamentals.`,
      playbookItems: [
        "**5 Whys Technique:** Ask why repeatedly to separate root cause from visible symptom.",
        "**Inversion Method:** Ask what would guarantee failure, then design safeguards against those failure modes.",
        "**Constraint-Based Innovation:** Limited budget or staff can sharpen creativity and produce higher-leverage solutions.",
      ],
      quiz: [
        {
          scenario: "A major client is upset by a delay. What is the executive problem-solving move?",
          options: [
            {
              label: "A",
              text: "Offer a 50% discount immediately.",
              correct: false,
            },
            {
              label: "B",
              text: "Diagnose the root cause, present a zero-repeat plan, and provide an exclusive value-add that costs little but increases client success.",
              correct: true,
            },
            {
              label: "C",
              text: "Blame the junior team member who caused the delay.",
              correct: false,
            },
          ],
        },
      ],
    },
  },
  /* ─── ADVANCED (locked placeholder) ──────────────────────────────── */
  {
    id: "manager-comms",
    title: "Manager Communication Systems",
    level: "Advanced",
    track: "Career Strategy",
    summary: "Build weekly updates that surface ROI, ownership, and strategic alignment clearly.",
    readingMins: 12,
    targetTool: "Archive",
    content: {
      executiveBrief: `Advanced professionals communicate upward through outcomes, not activity. Your manager should understand business effect in under 60 seconds.

Use concise updates that combine context, action, and business delta every week.`,
      playbookItems: [
        "**Weekly Executive Snapshot:** Share priorities, blockers, and decisions requested in three sections.",
        "**Outcome First:** Lead with measurable movement before describing process details.",
        "**Market Anchor Prep:** Use the Salary Research Tool in this lesson to benchmark your role and calibrate compensation conversations.",
      ],
      quiz: [
        {
          scenario: "What makes an executive-ready weekly update?",
          options: [
            { label: "A", text: "A long list of all tasks completed this week.", correct: false },
            { label: "B", text: "A concise update with outcomes, blockers, and clear asks tied to business impact.", correct: true },
            { label: "C", text: "Only risks, because leaders already know your wins.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "smart-networking-career-growth",
    title: "Smart Networking for Career Growth",
    level: "Advanced",
    track: "Job Search Strategy",
    summary: "Build a personal intelligence network and move into the hidden job market through high-trust referrals.",
    readingMins: 10,
    targetTool: "Archive",
    content: {
      executiveBrief: `At the Advanced level, networking is not about "finding a job"; it is about Information Arbitrage. You are building a "Personal Intelligence Network." The goal is to reach the Hidden Job Market—the 70% of high-paying roles that are never posted on LinkedIn because they are filled via trusted referrals. You move from "Applying" to "Being Invited."`,
      playbookItems: [
        "**The Reverse Interview Outreach:** Reach out to peers at target companies not for a job, but for market intelligence. \"I am analyzing the [X] landscape and your work at [Company] stands out. I’d love to hear your perspective on the current shift toward [Industry Trend].\"",
        "**The Super-Connector Strategy:** Identify the people who know everyone. Provide them with value first by sharing an article, a lead, or a compliment on their work before ever asking for an introduction.",
        "**The Referrer’s Edge:** When someone agrees to refer you, do not just send a resume. Send a Referral Blurb with 3 bullet points they can copy/paste that make them look good for recommending you.",
      ],
      quiz: [
        {
          scenario: "You want an introduction to a VP at a target company. You have a mutual connection who is a former colleague. What is the most professional way to ask?",
          options: [
            { label: "A", text: "Can you tell the VP to hire me? I really need this role.", correct: false },
            { label: "B", text: "I’m preparing a proposal for the [X] team at your firm. Would you be open to introducing me to the VP so I can ensure my insights align with their current strategic priorities?", correct: true },
            { label: "C", text: "Send a LinkedIn request to the VP and mention your friend's name in the note.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "salary-negotiation-confidence",
    title: "Negotiating Your Salary with Confidence",
    level: "Advanced",
    track: "Job Search Strategy",
    summary: "Reframe negotiation as value realignment and use anchors, non-monetary levers, and walk-away discipline.",
    readingMins: 11,
    targetTool: "STARR Lab",
    completionGate: {
      type: "negotiation-sim-min-score",
      minScore: 85,
      scoreLabel: "Value Captured",
    },
    content: {
      executiveBrief: `Negotiation is the only 30-minute conversation that can change your net worth for the next decade. Most professionals treat it as a "request." Experts treat it as a Value Realignment. You are not asking for more money because you "want" it; you are correcting the price point to match the ROI (Return on Investment) you will generate.`,
      playbookItems: [
        "**The Anchor and the Range:** Never give a single number. Provide a high-end bracket based on market data. If the market pays $120k-$140k, your range is $135k-$155k. This anchors the conversation at the top.",
        "**The Non-Monetary Lever:** If base salary is capped, pivot immediately to Lifestyle and Equity. Negotiate for signing bonuses, performance tranches (a raise after 6 months), or title upgrades.",
        "**The Walk-Away Mindset:** Be prepared to say no. Negotiation power belongs to the person who needs the deal less. Use your Impact Ledger as your shield.",
      ],
      quiz: [
        {
          scenario: "The recruiter says, 'This offer is already at the top of our budget.' What is the Advanced-level response?",
          options: [
            { label: "A", text: "I understand. I don't want to be difficult, so I'll accept.", correct: false },
            { label: "B", text: "I appreciate that transparency. Given the specific [X] and [Y] results I’m expected to deliver, I’m confident the value exceeds the current budget. Can we look at an objective-based bonus to bridge the gap?", correct: true },
            { label: "C", text: "I know you have more money, I've seen your stock prices.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "strategic-career-pivoting",
    title: "Strategic Career Pivoting",
    level: "Advanced",
    track: "Job Search Strategy",
    summary: "Transpose your skill-stack into higher-growth sectors using bridge language and proof-of-transfer wins.",
    readingMins: 10,
    targetTool: "Archive",
    content: {
      executiveBrief: `An Advanced professional does not get stuck in a dying industry. You must know how to Transfer Your Authority. This requires re-coding your experience. You are not changing jobs; you are transposing your skill-stack into a higher-growth market.`,
      playbookItems: [
        "**The Skill-Stack Audit:** Identify your sector-agnostic skills such as Crisis Management, System Design, and Revenue Optimization.",
        "**The Bridge Language:** If moving from Finance to Tech, translate domain jargon into target-market language.",
        "**The Beta Project:** Take on a small freelance or pro-bono project in the new sector and log a win in your Archive.",
      ],
      quiz: [
        {
          scenario: "You want to move into a completely new industry where you have no direct experience. What is the strongest asset on your resume?",
          options: [
            { label: "A", text: "A long cover letter explaining why you want to change careers.", correct: false },
            { label: "B", text: "A Comparative Impact section that shows how your past achievements directly solve the new industry's current problems.", correct: true },
            { label: "C", text: "Going back to university to get a second degree in that field.", correct: false },
          ],
        },
      ],
    },
  },
  /* ─── MASTER (locked placeholder) ────────────────────────────────── */
  {
    id: "long-term-career-planning-succession",
    title: "Long-Term Career Planning & Succession",
    level: "Master",
    track: "Career Planning & Strategy",
    summary: "Architect a category-defining legacy through long-horizon impact design and succession thinking.",
    readingMins: 14,
    targetTool: "Archive",
    content: {
      executiveBrief: `Mastery is the transition from Success to Significance. A Master-level professional doesn't just manage a career; they architect a Category of One. You must move beyond the "Next Promotion" mindset and begin thinking about your Succession. True authority is proven by the strength of the systems and people you leave behind. You are now playing the "Infinite Game."`,
      playbookItems: [
        "**The \"Category of One\" Definition:** Identify the intersection of three things: What you are world-class at, what you love doing, and what the market pays a premium for. This is your Zone of Genius.",
        "**The Multi-Generational Roadmap:** Create a 5-year and 10-year Impact Vision. This isn't about titles; it’s about the Legacy Projects you want to be remembered for.",
        "**Mentorship as Leverage:** Start actively developing the next generation of leaders. This builds your Alumni Network, a high-trust network that compounds your industry reach.",
      ],
      quiz: [
        {
          scenario: "You have reached the top of your current organization. What is the Master-level next move?",
          options: [
            { label: "A", text: "Retire or coast until retirement.", correct: false },
            { label: "B", text: "Transition into a Board Member or Strategic Advisor role where you can apply your expertise across multiple organizations while building your personal brand.", correct: true },
            { label: "C", text: "Ask for a 5% raise to stay another year.", correct: false },
          ],
        },
      ],
    },
  },
  {
    id: "personal-brand-authority-model",
    title: "Building Your Personal Brand (The Authority Model)",
    level: "Master",
    track: "Career Planning & Strategy",
    summary: "Build a thought-leadership ecosystem backed by verified impact and durable trust signals.",
    readingMins: 13,
    targetTool: "Profile Hub",
    content: {
      executiveBrief: `Your brand is no longer a resume; it is an Ecosystem. At the Master level, you must own your Digital Real Estate. You move from being a consumer of content to a Creator of Thought Leadership. You are not looking for work; you are issuing manifestos that attract the right partners, investors, and recruiters.`,
      playbookItems: [
        "**The Content Flywheel:** Regularly publish deep dives on your industry. Use wins from your Impact Ledger as proof points.",
        "**The Anchor Platform:** Choose one primary channel (LinkedIn, newsletter, or speaking) and dominate it with consistency.",
        "**The Verification Loop:** Use your Hirely Coach Master Certificate and QR-coded Performance Portfolio as objective proof. Verified Data is the ultimate currency.",
      ],
      quiz: [
        {
          scenario: "What is the most effective way to protect your Personal Brand during a crisis?",
          options: [
            { label: "A", text: "Delete your social media and wait for it to blow over.", correct: false },
            { label: "B", text: "Lean on your Archive of Results. A brand built on Verified Impact is much harder to damage than one built on Image.", correct: true },
            { label: "C", text: "Hire a PR firm to write a generic apology.", correct: false },
          ],
        },
      ],
    },
  },
];

export const LEVEL_ORDER: ProgressTier["title"][] = [
  "Novice",
  "Apprentice",
  "Candidate",
  "Expert",
  "Executive",
  "Advanced",
  "Master",
];

export const NOVICE_COURSE_IDS = COURSE_CATALOG
  .filter((course) => course.level === "Novice")
  .map((course) => course.id);

export const APPRENTICE_COURSE_IDS = COURSE_CATALOG
  .filter((course) => course.level === "Apprentice")
  .map((course) => course.id);

export type CourseGateSignals = {
  loggedWins: number;
  bestBehavioralSimulationScore: number;
  processImprovementWinsVerified: number;
  leadershipCourseCompleted: boolean;
  salaryNegotiationSimulationScore: number;
  hasExportedPortfolio: boolean;
};

type HistorySession = ReturnType<typeof loadInterviewHistory>[number];

function hasQualifiedSimulation(session: HistorySession): boolean {
  const answered = session.answers.filter((answer) => String(answer || "").trim().length >= 20).length;
  const totalChars = session.answers.reduce((sum, answer) => sum + String(answer || "").trim().length, 0);
  return answered >= 3 && totalChars >= 240;
}

function bestSimulationScoreByKeyword(userId: string | null | undefined, keyword: string): number {
  const sessions = loadInterviewHistory(userId).filter(hasQualifiedSimulation);
  const re = new RegExp(keyword, "i");
  return sessions.reduce((best, session) => {
    const context = `${session.jobTitle || ""} ${session.job || ""} ${session.level || ""} ${session.questions.join(" ")}`;
    if (!re.test(context)) return best;
    const score = Number(session.starrScore || 0);
    return Number.isFinite(score) ? Math.max(best, Math.floor(score)) : best;
  }, 0);
}

export function buildCourseGateSignals(
  completed: Set<string>,
  userId?: string | null
): CourseGateSignals {
  const entries = loadImpactEntries(userId);
  const loggedWins = entries.length;

  const bestBehavioralSimulationScore = bestSimulationScoreByKeyword(userId, "behavioral");
  const salaryNegotiationSimulationScore = bestSimulationScoreByKeyword(userId, "salary|negotiation");

  const processImprovementWinsVerified = entries.filter((entry) => {
    const combined = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
    const processTag = /process\s*improvement|workflow|leadership/.test(combined);
    const verifiedByCoach = /\bhc\b|hirely\s*coach|coach\s*verified|verified\s*by\s*coach/.test(combined);
    return processTag && verifiedByCoach;
  }).length;

  return {
    loggedWins,
    bestBehavioralSimulationScore,
    processImprovementWinsVerified,
    leadershipCourseCompleted: completed.has("leadership-influence-basics"),
    salaryNegotiationSimulationScore,
    hasExportedPortfolio: hasExportedPerformancePortfolio(),
  };
}

export function getCourseLevelAccess(
  userIp: number,
  gateSignals: CourseGateSignals
): {
  access: Map<ProgressTier["title"], boolean>;
  candidateGateMet: boolean;
  levelGateDetails: Map<ProgressTier["title"], string>;
} {
  const minIpByLevel = new Map<ProgressTier["title"], number>(
    LEVELS.map((level) => [level.title, level.minIp])
  );

  const access = new Map<ProgressTier["title"], boolean>();
  const levelGateDetails = new Map<ProgressTier["title"], string>();
  const gateMetByLevel: Record<ProgressTier["title"], boolean> = {
    Novice: true,
    Apprentice: gateSignals.loggedWins >= 3,
    Candidate: gateSignals.bestBehavioralSimulationScore >= 80,
    Expert: gateSignals.processImprovementWinsVerified >= 1,
    Executive: gateSignals.leadershipCourseCompleted,
    Advanced: gateSignals.salaryNegotiationSimulationScore >= 90,
    Master: gateSignals.hasExportedPortfolio,
  };

  for (const level of LEVEL_ORDER) {
    const minIp = minIpByLevel.get(level) ?? 0;
    const ipMet = userIp >= minIp;

    const prevLevel = LEVEL_ORDER[Math.max(0, LEVEL_ORDER.indexOf(level) - 1)];
    const prevUnlocked = prevLevel ? access.get(prevLevel) ?? true : true;

    if (level === "Novice") {
      access.set(level, true);
      levelGateDetails.set(level, "Unlocked by default.");
    } else {
      const gateMet = gateMetByLevel[level];
      const unlocked = ipMet && prevUnlocked && gateMet;
      access.set(level, unlocked);

      if (!ipMet) {
        levelGateDetails.set(level, `Reach ${level} and ${minIp} IP to unlock.`);
      } else if (!prevUnlocked) {
        levelGateDetails.set(level, `Complete previous level requirements to unlock ${level}.`);
      } else if (!gateMet) {
        levelGateDetails.set(level, HARD_GATES[level]?.requirement || "Complete required gate action.");
      } else {
        levelGateDetails.set(level, "Unlocked.");
      }
    }
  }

  return {
    access,
    candidateGateMet: gateMetByLevel.Candidate,
    levelGateDetails,
  };
}

export function getCourse(id: string): CourseEntry | undefined {
  return COURSE_CATALOG.find((c) => c.id === id);
}

// localStorage key for completed courses
export const COMPLETED_COURSES_KEY = "hirely.courses.completed.v1";

export function loadCompletedCourses(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(COMPLETED_COURSES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markCourseComplete(id: string): void {
  if (typeof window === "undefined") return;
  const existing = loadCompletedCourses();
  existing.add(id);
  window.localStorage.setItem(COMPLETED_COURSES_KEY, JSON.stringify([...existing]));
}

const OPTIMIZER_STATE_KEY_PREFIX = "hirely.optimizer.state.v1";
const SUGGESTION_REWARD_KEY = "hirelyReward.suggestion.v1";
const NEGOTIATION_SIM_BEST_KEY = "hirely.starr.negotiation.best.v1";
const NEGOTIATOR_BADGE_KEY = "hirely.starr.badge.negotiator.v1";

function optimizerStateKey(userId?: string | null): string {
  return `${OPTIMIZER_STATE_KEY_PREFIX}:${userId ?? "guest"}`;
}

type OptimizerStateShape = {
  report?: {
    overallScore?: number;
  };
};

export type ResumeOptimizerSignals = {
  hasRunScan: boolean;
  keywordMatchScore: number;
  impactfulBulletsSaved: number;
};

export type NegotiationSimSignals = {
  bestValueCaptured: number;
  hasNegotiatorBadge: boolean;
};

export function loadNegotiationSimSignals(): NegotiationSimSignals {
  if (typeof window === "undefined") {
    return { bestValueCaptured: 0, hasNegotiatorBadge: false };
  }

  const bestValueCaptured = Math.max(
    0,
    Math.min(100, Math.floor(Number(window.localStorage.getItem(NEGOTIATION_SIM_BEST_KEY) || "0")))
  );
  const hasNegotiatorBadge = window.localStorage.getItem(NEGOTIATOR_BADGE_KEY) === "1";

  return {
    bestValueCaptured,
    hasNegotiatorBadge,
  };
}

export function loadResumeOptimizerSignals(userId?: string | null): ResumeOptimizerSignals {
  if (typeof window === "undefined") {
    return { hasRunScan: false, keywordMatchScore: 0, impactfulBulletsSaved: 0 };
  }

  let keywordMatchScore = 0;
  let hasRunScan = false;

  try {
    const raw = window.localStorage.getItem(optimizerStateKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as OptimizerStateShape;
      const score = Number(parsed?.report?.overallScore || 0);
      if (Number.isFinite(score) && score > 0) {
        keywordMatchScore = Math.max(0, Math.min(100, Math.floor(score)));
        hasRunScan = true;
      }
    }
  } catch {
    // ignore parse issues
  }

  let impactfulBulletsSaved = 0;
  try {
    const raw = window.localStorage.getItem(SUGGESTION_REWARD_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    if (Array.isArray(parsed)) {
      impactfulBulletsSaved = parsed.filter((token) => {
        const value = String(token || "");
        return value.startsWith("suggestion:xyz:") || value.startsWith("suggestion:swap:");
      }).length;
    }
  } catch {
    // ignore parse issues
  }

  return {
    hasRunScan,
    keywordMatchScore,
    impactfulBulletsSaved,
  };
}
