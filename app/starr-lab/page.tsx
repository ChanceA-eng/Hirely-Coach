"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { XP_PER_LEVEL, loadInterviewHistory } from "../lib/interviewStorage";
import CoachTooltip from "../components/CoachTooltip";
import "./page.css";

const XP_KEY = "hirelyCoachXP";
const LAB_KEY = "hirelyStarrLabProgressV2";

type GameId = "redline" | "sequence" | "pushback" | "quantifier" | "gatekeeper";

type LabProgress = {
  plays: Record<GameId, number>;
  goldStatus: Record<GameId, boolean>;
  highFidelityBadge: Record<GameId, boolean>;
  completedModules: GameId[];
  gatekeeperPassed: boolean;
  logicComboPrimed: boolean;
};

type GameCompletion = {
  gameId: GameId;
  score: number;
  gold: boolean;
  highFidelity: boolean;
  baseXP: number;
  detail: string;
};

const APPRENTICE_LEVEL = 3;
const APPRENTICE_XP_THRESHOLD = (APPRENTICE_LEVEL - 1) * XP_PER_LEVEL;
const NEW_GAMES: GameId[] = ["redline", "sequence", "pushback", "quantifier"];

const defaultProgress: LabProgress = {
  plays: { redline: 0, sequence: 0, pushback: 0, quantifier: 0, gatekeeper: 0 },
  goldStatus: { redline: false, sequence: false, pushback: false, quantifier: false, gatekeeper: false },
  highFidelityBadge: { redline: false, sequence: false, pushback: false, quantifier: false, gatekeeper: false },
  completedModules: [],
  gatekeeperPassed: false,
  logicComboPrimed: false,
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function levelFromXP(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function rankFromLevel(level: number) {
  if (level < 3) return "Novice";
  if (level < 6) return "Apprentice";
  if (level < 10) return "Candidate";
  if (level < 15) return "Professional";
  return "Executive";
}

const GAME_META: Record<GameId, { title: string; desc: string; minLevel: number }> = {
  redline: {
    title: "Redline Resume Review",
    desc: "Novice flash-card speed drill for fluff and metric cleanup.",
    minLevel: 1,
  },
  sequence: {
    title: "STARR Logic Puzzle",
    desc: "Novice drag/drop cards to build S-T-A-R-R flow with decoy control.",
    minLevel: 1,
  },
  pushback: {
    title: "Push-Back Counter",
    desc: "Apprentice pressure rounds with multi-question interviewer follow-ups.",
    minLevel: 3,
  },
  quantifier: {
    title: "Quantifier Lab",
    desc: "Apprentice metric forge to strengthen measurable outcomes.",
    minLevel: 3,
  },
  gatekeeper: {
    title: "Gatekeeper Exam",
    desc: "Candidate gate exam for level-up eligibility and logic certification.",
    minLevel: 6,
  },
};

function loadXP() {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(XP_KEY) || "0", 10);
}

function saveXP(next: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(XP_KEY, String(next));
}

function parseProgress(raw: string | null): LabProgress {
  if (!raw) return defaultProgress;
  try {
    const parsed = JSON.parse(raw) as Partial<LabProgress>;
    return {
      ...defaultProgress,
      ...parsed,
      plays: { ...defaultProgress.plays, ...(parsed.plays || {}) },
      goldStatus: { ...defaultProgress.goldStatus, ...(parsed.goldStatus || {}) },
      highFidelityBadge: { ...defaultProgress.highFidelityBadge, ...(parsed.highFidelityBadge || {}) },
      completedModules: Array.isArray(parsed.completedModules) ? parsed.completedModules : [],
      gatekeeperPassed: Boolean(parsed.gatekeeperPassed),
      logicComboPrimed: Boolean(parsed.logicComboPrimed),
    };
  } catch {
    return defaultProgress;
  }
}

function loadLabProgress(userId?: string | null): LabProgress {
  if (typeof window === "undefined") return defaultProgress;
  const key = userId ? `${LAB_KEY}:${userId}` : LAB_KEY;
  return parseProgress(window.localStorage.getItem(key));
}

function saveLabProgress(progress: LabProgress, userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = userId ? `${LAB_KEY}:${userId}` : LAB_KEY;
  window.localStorage.setItem(key, JSON.stringify(progress));
}

function highFidelityCount(progress: LabProgress) {
  return NEW_GAMES.filter((g) => progress.highFidelityBadge[g]).length;
}

function hasApprenticeGate(progress: LabProgress) {
  return highFidelityCount(progress) >= 2;
}

function initialTabFromQuery(moduleType: string | null): GameId {
  if (moduleType === "logic") return "sequence";
  if (moduleType === "storytelling") return "quantifier";
  if (moduleType === "delivery") return "pushback";
  return "redline";
}

type RedlineSnippet = {
  text: string;
  badWord?: string;
  category: "fluff" | "metric" | "format";
};

const REDLINE_SNIPPETS: RedlineSnippet[] = [
  { text: "Helped the team with many things and supported projects.", badWord: "many", category: "metric" },
  { text: "Managed roadmap for 2 product lines and shipped 6 features in 1 quarter.", category: "metric" },
  { text: "Very passionate self-starter with excellent communication skills.", badWord: "Very", category: "fluff" },
  { text: "increased retention by 18% after redesigning onboarding.", badWord: "increased", category: "format" },
  { text: "Reduced cloud spend by 22% by automating idle instance shutdown.", category: "metric" },
  { text: "Worked on lots of cross-functional initiatives.", badWord: "lots", category: "fluff" },
  { text: "Led QA pipeline refactor, cutting release defects from 14 to 5.", category: "metric" },
  { text: "Delivered high-impact improvements that significantly boosted outcomes.", badWord: "significantly", category: "fluff" },
  { text: "Built KPI dashboard used by 11 managers to review weekly performance.", category: "metric" },
  { text: "coordinated vendor operations and reduced ticket backlog 31%.", badWord: "coordinated", category: "format" },
];

function normalizeToken(token: string) {
  return token.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function RedlineGame({ onComplete }: { onComplete: (result: GameCompletion) => void }) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);

  const active = REDLINE_SNIPPETS[snippetIndex % REDLINE_SNIPPETS.length];
  const cadenceMs = timeLeft <= 20 ? 1400 : 2200;

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(timer);
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  useEffect(() => {
    if (!started || finished || timeLeft <= 0) return;
    const rotator = window.setTimeout(() => {
      if (active.badWord) setAttempts((v) => v + 1);
      setSnippetIndex((v) => v + 1);
    }, cadenceMs);
    return () => window.clearTimeout(rotator);
  }, [started, finished, timeLeft, snippetIndex, cadenceMs, active.badWord]);

  useEffect(() => {
    if (!finished) return;
    const accuracy = attempts === 0 ? 0 : (correct / attempts) * 100;
    const speed = correct;
    const score = clamp(Math.round(accuracy * 0.7 + speed * 2.4), 0, 100);
    const gold = accuracy >= 90 && speed >= 8;
    onComplete({
      gameId: "redline",
      score,
      gold,
      highFidelity: gold,
      baseXP: 420 + Math.round(score * 1.8),
      detail: `Accuracy ${Math.round(accuracy)}%, speed ${speed}/min`,
    });
  }, [finished, attempts, correct, onComplete]);

  const tokens = active.text.split(" ");

  function nextSnippet() {
    setSnippetIndex((v) => v + 1);
  }

  function clickToken(token: string) {
    if (!started || finished) return;
    if (!active.badWord) {
      setAttempts((v) => v + 1);
      nextSnippet();
      return;
    }
    const isHit = normalizeToken(token) === normalizeToken(active.badWord);
    setAttempts((v) => v + 1);
    if (isHit) setCorrect((v) => v + 1);
    nextSnippet();
  }

  function markClean() {
    if (!started || finished) return;
    setAttempts((v) => v + 1);
    if (!active.badWord) setCorrect((v) => v + 1);
    nextSnippet();
  }

  if (!started) {
    return (
      <div className="game-start">
        <p>60-second hiring-manager sprint. Redline errors under pressure and keep 90% accuracy for Gold.</p>
        <button className="sl-btn sl-btn--primary" onClick={() => setStarted(true)}>Start Redline</button>
      </div>
    );
  }

  if (finished) {
    return <p className="game-done">Scoring complete. Review your XP summary above.</p>;
  }

  return (
    <div>
      <div className="game-topline">
        <span className="chip">Time: {timeLeft}s</span>
        <span className="chip">Correct: {correct}</span>
        <span className="chip">Attempts: {attempts}</span>
        <span className="chip">Mode: {timeLeft <= 20 ? "High Pressure" : "Warmup"}</span>
      </div>
      <div className="redline-lane">
        <div className="redline-snippet" key={`${snippetIndex}-${timeLeft}`}>
          {tokens.map((tk, idx) => (
            <button key={`${tk}-${idx}`} className="token-btn" onClick={() => clickToken(tk)}>{tk}</button>
          ))}
        </div>
      </div>
      <div className="redline-footer">
        <p>Category: {active.category}</p>
        <button className="sl-btn sl-btn--ghost" onClick={markClean}>No issue in this line</button>
      </div>
    </div>
  );
}

type SequenceCard = { id: string; text: string; slot: "S" | "T" | "A" | "R" | "Rf" | "D" };

function SequenceGame({ weakAnswer, onComplete }: { weakAnswer: string; onComplete: (result: GameCompletion) => void }) {
  const scenario = useMemo<SequenceCard[]>(() => {
    const fallback: SequenceCard[] = [
      { id: "c1", text: "Our onboarding drop-off climbed to 46% after a pricing change.", slot: "S" },
      { id: "c2", text: "I was asked to recover activation without adding headcount.", slot: "T" },
      { id: "c3", text: "I built a 3-step onboarding path and instrumented funnel events daily.", slot: "A" },
      { id: "c4", text: "Activation improved 19% in 8 weeks and support tickets dropped 13%.", slot: "R" },
      { id: "c5", text: "Next time I would align analytics tagging before launch to reduce rework.", slot: "Rf" },
      { id: "c6", text: "I also love hiking and coffee culture in my city.", slot: "D" },
    ];
    if (!weakAnswer) return fallback;
    return fallback;
  }, [weakAnswer]);

  const [bank, setBank] = useState<string[]>(scenario.map((s) => s.id));
  const [slots, setSlots] = useState<Record<string, string | null>>({ S: null, T: null, A: null, R: null, Rf: null, D: null });
  const [dragging, setDragging] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  function cardById(id: string | null) {
    return scenario.find((c) => c.id === id) || null;
  }

  function placeInSlot(slot: string, cardId: string) {
    setSlots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === cardId) next[k] = null;
      });
      setBank((b) => b.filter((id) => id !== cardId));
      if (next[slot]) {
        setBank((b) => [...b, next[slot] as string]);
      }
      next[slot] = cardId;
      return next;
    });
  }

  function sendBack(cardId: string) {
    setSlots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (next[k] === cardId) next[k] = null;
      });
      return next;
    });
    setBank((b) => (b.includes(cardId) ? b : [...b, cardId]));
  }

  function evaluate() {
    let points = 0;
    const starrSlots = ["S", "T", "A", "R", "Rf"];
    starrSlots.forEach((slot) => {
      const card = cardById(slots[slot]);
      if (!card) return;
      if (card.slot === slot) points += 20;
      else points -= 10;
      if (card.slot === "D") points -= 15;
    });
    const decoyCard = cardById(slots.D);
    if (decoyCard?.slot === "D") points += 10;
    const normalized = clamp(points, 0, 100);
    setScore(normalized);

    const gold = normalized >= 85 && decoyCard?.slot === "D";
    onComplete({
      gameId: "sequence",
      score: normalized,
      gold,
      highFidelity: gold,
      baseXP: 460 + Math.round(normalized * 2),
      detail: `Sequence score ${normalized} with decoy discipline`,
    });
  }

  return (
    <div>
      <p className="game-note">Drag each sentence into S-T-A-R-R order and discard the decoy in the Decoy Bin.</p>
      <div className="sequence-grid">
        {(["S", "T", "A", "R", "Rf", "D"] as const).map((slot) => (
          <div
            key={slot}
            className="drop-slot"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const cardId = e.dataTransfer.getData("text/plain") || dragging;
              if (cardId) placeInSlot(slot, cardId);
            }}
          >
            <div className="drop-title">{slot === "D" ? "Decoy Bin" : slot}</div>
            {slots[slot] ? (
              <div
                className="placed-card"
                draggable
                onDragStart={(e) => {
                  setDragging(slots[slot]);
                  e.dataTransfer.setData("text/plain", slots[slot] as string);
                }}
                onDoubleClick={() => sendBack(slots[slot] as string)}
              >
                {cardById(slots[slot])?.text}
              </div>
            ) : (
              <div className="slot-empty">Drop here</div>
            )}
          </div>
        ))}
      </div>
      <div className="bank-wrap">
        <div className="drop-title">Sentence Bank</div>
        <div className="bank-cards">
          {bank.map((id) => (
            <div
              key={id}
              className="bank-card"
              draggable
              onDragStart={(e) => {
                setDragging(id);
                e.dataTransfer.setData("text/plain", id);
              }}
            >
              {cardById(id)?.text}
            </div>
          ))}
        </div>
      </div>
      <button className="sl-btn sl-btn--primary" onClick={evaluate}>Submit Sequence</button>
      {score !== null && <p className="game-done">Score: {score}. Gold requires 85+ and correct decoy removal.</p>}
    </div>
  );
}

type PushRound = { claim: string; options: string[]; best: number };

const PUSHBACK_NOVICE: PushRound[] = [
  {
    claim: "I am a great team player.",
    options: [
      "Nice. What is your favorite part of teamwork?",
      "Tell me one conflict you resolved and the measurable outcome.",
      "Do your teammates like you?",
    ],
    best: 1,
  },
  {
    claim: "I improved operations.",
    options: [
      "Can you explain exactly what metric improved and by how much?",
      "When did this happen?",
      "Were operations difficult?",
    ],
    best: 0,
  },
  {
    claim: "I led a big migration.",
    options: [
      "What specific risks did you own and how did you de-risk them?",
      "How big was the team?",
      "Was the migration fun?",
    ],
    best: 0,
  },
];

const PUSHBACK_STRESS: PushRound[] = [
  {
    claim: "I drove strategy across many initiatives.",
    options: [
      "What one decision had the largest business impact, and what trade-off did you choose?",
      "How many initiatives were there?",
      "Did leadership agree quickly?",
    ],
    best: 0,
  },
  {
    claim: "I handled a difficult stakeholder.",
    options: [
      "Was the stakeholder technical?",
      "Give one moment of push-back, your response structure, and the measurable result.",
      "How often did you meet?",
    ],
    best: 1,
  },
  {
    claim: "The launch went really well.",
    options: [
      "What went right?",
      "Define 'really well' with pre/post metrics, timeframe, and user impact.",
      "Were there any bugs?",
    ],
    best: 1,
  },
  {
    claim: "I improved team productivity.",
    options: [
      "What exact workflow changed and what efficiency delta did you record?",
      "Did the team appreciate it?",
      "Did productivity stay high forever?",
    ],
    best: 0,
  },
];

function PushbackGame({ onComplete }: { onComplete: (result: GameCompletion) => void }) {
  const [mode, setMode] = useState<"novice" | "apprentice">("novice");
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const rounds = mode === "novice" ? PUSHBACK_NOVICE : PUSHBACK_STRESS;
  const round = rounds[index];

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === round.best) setCorrect((v) => v + 1);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      const pct = Math.round(((correct + (picked === round.best ? 1 : 0)) / rounds.length) * 100);
      const score = pct;
      const gold = mode === "apprentice" ? pct >= 85 : pct >= 80;
      setDone(true);
      onComplete({
        gameId: "pushback",
        score,
        gold,
        highFidelity: gold,
        baseXP: 360 + Math.round(score * 2.2),
        detail: `${mode} pressure round with ${pct}% precision`,
      });
      return;
    }
    setIndex((v) => v + 1);
    setPicked(null);
  }

  if (done) return <p className="game-done">Simulation complete. Use your score summary to refine your questions.</p>;

  return (
    <div>
      <div className="game-topline">
        <span className="chip">Mode</span>
        <button className={`chip-toggle ${mode === "novice" ? "active" : ""}`} onClick={() => { setMode("novice"); setIndex(0); setPicked(null); setCorrect(0); }}>Novice</button>
        <button className={`chip-toggle ${mode === "apprentice" ? "active" : ""}`} onClick={() => { setMode("apprentice"); setIndex(0); setPicked(null); setCorrect(0); }}>Stress Test</button>
      </div>
      <div className="avatar-bubble">
        <p className="claim-title">AI claim:</p>
        <p>{round.claim}</p>
      </div>
      <div className="push-options">
        {round.options.map((opt, i) => {
          let cls = "push-opt";
          if (picked !== null) {
            if (i === round.best) cls += " push-opt--correct";
            else if (i === picked) cls += " push-opt--wrong";
          }
          return (
            <button key={opt} className={cls} onClick={() => choose(i)}>{opt}</button>
          );
        })}
      </div>
      {picked !== null && <button className="sl-btn sl-btn--primary" onClick={next}>{index + 1 < rounds.length ? "Next" : "Finish"}</button>}
    </div>
  );
}

function QuantifierGame({ onComplete }: { onComplete: (result: GameCompletion) => void }) {
  const [budgetK, setBudgetK] = useState(50);
  const [wasteCut, setWasteCut] = useState(15);
  const [months, setMonths] = useState(6);
  const [teamSize, setTeamSize] = useState(7);
  const [done, setDone] = useState(false);

  const impactScore = clamp(
    Math.round(wasteCut * 2 + budgetK * 0.45 + teamSize * 1.3 + (18 - months) * 1.4),
    0,
    100,
  );

  const forged = `Managed a $${budgetK}k budget, reducing waste by ${wasteCut}% over ${months} months across ${teamSize} stakeholders.`;

  function finish() {
    setDone(true);
    const gold = impactScore >= 85;
    onComplete({
      gameId: "quantifier",
      score: impactScore,
      gold,
      highFidelity: gold,
      baseXP: 390 + Math.round(impactScore * 2.4),
      detail: `Impact score ${impactScore} from metric injection`,
    });
  }

  return (
    <div>
      <p className="game-note">Transform: &quot;I managed a budget.&quot; into a measurable Result statement using metric nodes.</p>
      <div className="quant-grid">
        <label>
          Budget ($k): <strong>{budgetK}</strong>
          <input type="range" min={10} max={250} value={budgetK} onChange={(e) => setBudgetK(parseInt(e.target.value, 10))} />
        </label>
        <label>
          Waste Reduction (%): <strong>{wasteCut}</strong>
          <input type="range" min={0} max={40} value={wasteCut} onChange={(e) => setWasteCut(parseInt(e.target.value, 10))} />
        </label>
        <label>
          Timeframe (months): <strong>{months}</strong>
          <input type="range" min={1} max={18} value={months} onChange={(e) => setMonths(parseInt(e.target.value, 10))} />
        </label>
        <label>
          Stakeholders: <strong>{teamSize}</strong>
          <input type="range" min={2} max={20} value={teamSize} onChange={(e) => setTeamSize(parseInt(e.target.value, 10))} />
        </label>
      </div>
      <div className="impact-card">
        <p className="impact-label">Forged Result</p>
        <p>{forged}</p>
        <p className="impact-score">Impact Score: {impactScore}</p>
      </div>
      {!done && <button className="sl-btn sl-btn--primary" onClick={finish}>Forge and Submit</button>}
      {done && <p className="game-done">Submission captured. Gold starts at Impact Score 85.</p>}
    </div>
  );
}

type GateQ = { q: string; options: string[]; correct: number };

const GATEKEEPER_QUESTIONS: GateQ[] = [
  {
    q: "Which answer opening is most logically structured?",
    options: [
      "I did many things, but mostly operations and strategy.",
      "The key outcome was +12% conversion; I achieved it by redesigning onboarding in 6 weeks.",
      "It depends on what you mean by structured.",
    ],
    correct: 1,
  },
  {
    q: "Best push-back to 'I improved collaboration'?",
    options: [
      "What changed in team behavior and what measurable output improved?",
      "Did people like collaborating more?",
      "Was collaboration always hard?",
    ],
    correct: 0,
  },
  {
    q: "Which sentence belongs to Result?",
    options: [
      "I was responsible for delivery planning.",
      "I mapped dependencies and managed blockers.",
      "Cycle time dropped from 11 days to 6 after rollout.",
    ],
    correct: 2,
  },
  {
    q: "How should you handle a decoy detail in a tight answer?",
    options: [
      "Include it if it sounds interesting.",
      "Remove it unless it directly supports the impact narrative.",
      "Place it in Situation regardless.",
    ],
    correct: 1,
  },
  {
    q: "Which reflection sounds strongest?",
    options: [
      "I learned that projects are hard.",
      "I learned to align risk owners earlier; this reduced escalation noise in later launches.",
      "I learned people should communicate.",
    ],
    correct: 1,
  },
  {
    q: "Best metric statement?",
    options: [
      "Improved process quality significantly.",
      "Improved process quality by 21% over one quarter across 3 teams.",
      "Improved process quality in many areas.",
    ],
    correct: 1,
  },
  {
    q: "When under pressure, what sequence preserves logic?",
    options: [
      "Result -> Action -> Situation -> Reflection",
      "Situation -> Task -> Action -> Result -> Reflection",
      "Task -> Situation -> Result -> Action",
    ],
    correct: 1,
  },
];

function GatekeeperExam({ onComplete }: { onComplete: (passed: boolean, score: number) => void }) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started || done) return;
    const t = window.setInterval(() => {
      setTimeLeft((v) => {
        if (v <= 1) {
          window.clearInterval(t);
          setDone(true);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [started, done]);

  useEffect(() => {
    if (!done) return;
    const logicScore = clamp(Math.round((correct / GATEKEEPER_QUESTIONS.length) * 10), 0, 10);
    onComplete(logicScore >= 7, logicScore);
  }, [done, correct, onComplete]);

  if (!started) {
    return (
      <div className="game-start">
        <p>Gatekeeper Exam: 3 minutes. Pass with Logic Score 7+ to complete Apprentice gate.</p>
        <button className="sl-btn sl-btn--primary" onClick={() => setStarted(true)}>Start Gatekeeper</button>
      </div>
    );
  }

  if (done) {
    return <p className="game-done">Exam complete. Logic score submitted.</p>;
  }

  const q = GATEKEEPER_QUESTIONS[index];

  function next() {
    if (index + 1 >= GATEKEEPER_QUESTIONS.length) {
      setDone(true);
      return;
    }
    setIndex((v) => v + 1);
    setPicked(null);
  }

  return (
    <div>
      <div className="game-topline">
        <span className="chip">Time: {timeLeft}s</span>
        <span className="chip">Q {index + 1}/{GATEKEEPER_QUESTIONS.length}</span>
      </div>
      <CoachTooltip context="quiz" message="Look for keywords like 'impact', 'led', or 'resulted in'. The best STARR answers always reference a measurable outcome." placement="top">
        <p className="exam-question">{q.q}</p>
      </CoachTooltip>
      <div className="push-options">
        {q.options.map((opt, i) => {
          let cls = "push-opt";
          if (picked !== null) {
            if (i === q.correct) cls += " push-opt--correct";
            else if (i === picked) cls += " push-opt--wrong";
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => {
                if (picked !== null) return;
                setPicked(i);
                if (i === q.correct) setCorrect((v) => v + 1);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked !== null && <button className="sl-btn sl-btn--primary" onClick={next}>{index + 1 < GATEKEEPER_QUESTIONS.length ? "Next" : "Finish"}</button>}
    </div>
  );
}

function StarrLabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();

  const [xp, setXp] = useState(0);
  const [progress, setProgress] = useState<LabProgress>(defaultProgress);
  const [xpFlash, setXpFlash] = useState("");
  const [lastSummary, setLastSummary] = useState("");
  const [activeGame, setActiveGame] = useState<GameId>(initialTabFromQuery(searchParams.get("moduleType")));
  const [modalGame, setModalGame] = useState<GameId | null>(null);

  const latestAnswer = useMemo(() => {
    const sessions = loadInterviewHistory(userId);
    const latest = sessions[0];
    if (!latest?.answers?.length) return "";
    return [...latest.answers].reverse().find((a) => (a || "").trim().length > 40) || "";
  }, [userId]);

  useEffect(() => {
    setXp(loadXP());
    setProgress(loadLabProgress(userId));
  }, [userId]);

  const level = levelFromXP(xp);
  const canPromote = hasApprenticeGate(progress);
  const lockedAtNovice = level >= APPRENTICE_LEVEL && !canPromote;
  const shownRank = lockedAtNovice ? "Novice (Badge Locked)" : rankFromLevel(level);

  const xpToNext = XP_PER_LEVEL - (xp % XP_PER_LEVEL);
  const xpPct = ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  const playedGames = NEW_GAMES.filter((g) => progress.plays[g] > 0).length;
  const goldGames = NEW_GAMES.filter((g) => progress.goldStatus[g]).length;
  const moduleCount = progress.completedModules.length;
  const hfCount = highFidelityCount(progress);

  const noviceReady = moduleCount >= 2 && playedGames >= 3;
  const apprenticeReady = moduleCount >= 5 && goldGames >= 3 && progress.gatekeeperPassed;

  const gameOrder: GameId[] = ["redline", "sequence", "pushback", "quantifier", "gatekeeper"];

  function lockReason(gameId: GameId): string {
    const meta = GAME_META[gameId];
    const requiredXp = (meta.minLevel - 1) * XP_PER_LEVEL;

    if (xp < requiredXp) {
      return `Earn ${requiredXp - xp} XP to unlock ${meta.title}.`;
    }

    if (gameId === "gatekeeper" && !hasApprenticeGate(progress)) {
      return "Earn 2 High-Fidelity badges to unlock Gatekeeper Exam.";
    }

    return "";
  }

  function isLocked(gameId: GameId): boolean {
    return lockReason(gameId).length > 0;
  }

  const visibleGames = gameOrder;

  function writeProgress(next: LabProgress) {
    setProgress(next);
    saveLabProgress(next, userId);
  }

  function applyGameCompletion(result: GameCompletion) {
    setLastSummary(`${result.gameId.toUpperCase()}: ${result.detail}`);

    const nextProgress: LabProgress = {
      ...progress,
      plays: { ...progress.plays, [result.gameId]: progress.plays[result.gameId] + 1 },
      goldStatus: { ...progress.goldStatus, [result.gameId]: progress.goldStatus[result.gameId] || result.gold },
      highFidelityBadge: {
        ...progress.highFidelityBadge,
        [result.gameId]: progress.highFidelityBadge[result.gameId] || result.highFidelity,
      },
      completedModules: progress.completedModules.includes(result.gameId)
        ? progress.completedModules
        : [...progress.completedModules, result.gameId],
    };

    if (result.gameId === "quantifier" && result.score >= 70) {
      nextProgress.logicComboPrimed = true;
    }

    let awarded = result.baseXP;
    if (result.gameId === "sequence" && result.gold && nextProgress.logicComboPrimed) {
      awarded = Math.round(result.baseXP * 1.5);
      nextProgress.logicComboPrimed = false;
      setLastSummary(`${result.gameId.toUpperCase()}: Logic Combo 1.5x applied. ${result.detail}`);
    }

    const gated = !hasApprenticeGate(nextProgress);
    const nextRawXP = xp + awarded;
    const finalXP = gated && xp < APPRENTICE_XP_THRESHOLD && nextRawXP >= APPRENTICE_XP_THRESHOLD
      ? APPRENTICE_XP_THRESHOLD - 1
      : nextRawXP;

    setXp(finalXP);
    saveXP(finalXP);
    setXpFlash(`+${finalXP - xp} XP`);
    setTimeout(() => setXpFlash(""), 1900);

    writeProgress(nextProgress);
  }

  function completeGatekeeper(passed: boolean, logicScore: number) {
    const nextProgress: LabProgress = {
      ...progress,
      plays: { ...progress.plays, gatekeeper: progress.plays.gatekeeper + 1 },
      gatekeeperPassed: progress.gatekeeperPassed || passed,
      completedModules: progress.completedModules.includes("gatekeeper")
        ? progress.completedModules
        : [...progress.completedModules, "gatekeeper"],
    };
    setLastSummary(`GATEKEEPER: Logic Score ${logicScore}/10 ${passed ? "(PASS)" : "(RETRY)"}`);
    writeProgress(nextProgress);

    if (passed) {
      const bonus = 520;
      const finalXP = xp + bonus;
      setXp(finalXP);
      saveXP(finalXP);
      setXpFlash(`+${bonus} XP`);
      setTimeout(() => setXpFlash(""), 1900);
    }
  }

  function renderGame(gameId: GameId) {
    if (gameId === "redline") return <RedlineGame onComplete={applyGameCompletion} />;
    if (gameId === "sequence") return <SequenceGame weakAnswer={latestAnswer} onComplete={applyGameCompletion} />;
    if (gameId === "pushback") return <PushbackGame onComplete={applyGameCompletion} />;
    if (gameId === "quantifier") return <QuantifierGame onComplete={applyGameCompletion} />;
    return <GatekeeperExam onComplete={completeGatekeeper} />;
  }

  return (
    <div className="lp-root">
      <main className="sl2-root">
        <button className="sl2-back" onClick={() => router.push("/training")}>Back to Training</button>

        <section className="xp-banner glass-card sl2-banner">
          <div className="xp-banner-left">
            <span className="xp-level-badge">LV {level}</span>
            <div>
              <div className="xp-title">{shownRank}</div>
              <div className="xp-sub">{xp} XP total · {xpToNext} XP to next level</div>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${Math.round(xpPct)}%` }} />
            </div>
            <span className="xp-pct">{Math.round(xpPct)}%</span>
          </div>
          {xpFlash && <div className="xp-flash">{xpFlash}</div>}
        </section>

        {lockedAtNovice && (
          <div className="sl2-warning glass-card">
            XP Engine Gate: High-Fidelity Badge required in at least two games before Apprentice unlock.
            Current badges: {hfCount} / 2
          </div>
        )}

        <section className="sl2-lab-head">
          <p className="eyebrow">STARR Lab · Blueprint Arena</p>
          <h1 className="lp-h2">Redline, Sequence, Push-Back, Quantifier</h1>
          <p className="th-sub">All accelerator games and progression gates are consolidated here.</p>
        </section>

        <section className="sl2-gatekeeper-table glass-card">
          <h2>Gatekeeper Exam Ladder</h2>
          <div className="gate-grid">
            <div>
              <strong>Novice</strong>
              <p>Complete 2 modules</p>
              <p>Play 3 games</p>
              <p>Gatekeeper: N/A</p>
            </div>
            <div>
              <strong>Apprentice</strong>
              <p>Complete 5 modules</p>
              <p>Gold in 3 games</p>
              <p>Pass Gatekeeper 3-minute exam (Logic Score 7+)</p>
            </div>
            <div>
              <strong>Live Status</strong>
              <p>Modules: {moduleCount}/5</p>
              <p>Games played: {playedGames}/3</p>
              <p>Gold games: {goldGames}/3</p>
              <p>Gatekeeper: {progress.gatekeeperPassed ? "Passed" : "Pending"}</p>
              <p>Novice ready: {noviceReady ? "Yes" : "No"}</p>
              <p>Apprentice ready: {apprenticeReady ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        <section className="sl2-launcher-grid">
          {visibleGames.map((gameId) => {
            const meta = GAME_META[gameId];
            const locked = isLocked(gameId);
            const reason = lockReason(gameId);
            const isActive = activeGame === gameId;
            return (
              <button
                key={gameId}
                className={`sl2-launch-card${isActive ? " active" : ""}${locked ? " locked" : ""}`}
                onClick={() => {
                  if (!locked) {
                    setActiveGame(gameId);
                    setModalGame(gameId);
                  }
                }}
                aria-disabled={locked}
                type="button"
              >
                <div className="sl2-launch-head">
                  <strong>{meta.title}</strong>
                  {locked ? <span className="sl2-lock-chip">LOCKED</span> : <span className="sl2-open-chip">OPEN</span>}
                </div>
                <p>{meta.desc}</p>
                <p className="sl2-launch-level">Tier: {rankFromLevel(meta.minLevel)}</p>
                {locked ? <p className="sl2-lock-note">{reason}</p> : <p className="sl2-open-note">Click to open this game nudge.</p>}
              </button>
            );
          })}
        </section>

        <section className="sl2-game-shell glass-card">
          <h3>{GAME_META[activeGame].title}</h3>
          <p>{GAME_META[activeGame].desc}</p>
          {isLocked(activeGame) ? (
            <div className="sl2-locked-panel">
              <p>🔒 {lockReason(activeGame)}</p>
            </div>
          ) : (
            <div className="sl2-selected-actions">
              <p>Open launches the selected game in a focused practice nudge without triggering the rest of the lab.</p>
              <button className="sl-btn sl-btn--primary" onClick={() => setModalGame(activeGame)}>
                Open {GAME_META[activeGame].title}
              </button>
            </div>
          )}
        </section>

        <section className="sl2-summary glass-card">
          <h3>Session Summary</h3>
          <p>{lastSummary || "Complete any game to generate your performance summary and XP event."}</p>
          <p>Logic Combo status: {progress.logicComboPrimed ? "Primed (win STARR Logic Puzzle for 1.5x XP)" : "Not primed"}</p>
        </section>

        {modalGame && (
          <div className="sl2-modal-overlay" onClick={() => setModalGame(null)} role="presentation">
            <div className="sl2-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={GAME_META[modalGame].title}>
              <div className="sl2-modal-head">
                <div>
                  <p className="sl2-modal-label">STARR Lab Practice</p>
                  <h2>{GAME_META[modalGame].title}</h2>
                </div>
                <button className="sl2-modal-close" type="button" onClick={() => setModalGame(null)}>
                  Close
                </button>
              </div>
              <p className="sl2-modal-sub">{GAME_META[modalGame].desc}</p>
              <div className="sl2-modal-body glass-card">
                {renderGame(modalGame)}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StarrLabPage() {
  return (
    <Suspense fallback={<div className="lp-root" style={{ padding: 36, color: "#94a3b8" }}>Loading STARR Lab...</div>}>
      <StarrLabInner />
    </Suspense>
  );
}
