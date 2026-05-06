"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SofiaGuide from "../../components/foundation/SofiaGuide";
import { handleGraduation, FOUNDATION_IP_BONUS } from "../../lib/foundationProgress";

const QUESTIONS = [
  {
    prompt: "How do you greet a manager professionally in the morning?",
    options: ["Hey!", "Good morning, sir/ma'am.", "Yo, what's up?", "Habari za asubuhi (Swahili only)"],
    correct: 1,
  },
  {
    prompt: "Which sentence is grammatically correct?",
    options: [
      "I am having three years of experience.",
      "I am from having experience three years.",
      "I have three years of experience.",
      "I experience three years of have.",
    ],
    correct: 2,
  },
  {
    prompt: "You are in an interview. The recruiter asks: 'Tell me about yourself.' You should:",
    options: [
      "Talk about your family and childhood.",
      "Say your name, experience, and one key achievement.",
      "Say nothing and wait for another question.",
      "Only say your name.",
    ],
    correct: 1,
  },
  {
    prompt: "What does 'deadline' mean?",
    options: [
      "A type of telephone line.",
      "The final date or time by which work must be completed.",
      "A line on the road.",
      "A break during the workday.",
    ],
    correct: 1,
  },
  {
    prompt: "Choose the correct power verb for a resume: 'I ___ a team of 8 people.'",
    options: ["did", "was doing", "led", "was leading around"],
    correct: 2,
  },
];

export default function GraduatePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [graduating, setGraduating] = useState(false);

  const score = submitted
    ? Math.round(
        (answers.filter((a, i) => a === QUESTIONS[i].correct).length / QUESTIONS.length) * 100
      )
    : 0;
  const passed = score >= 80;

  async function submit() {
    if (answers.some((a) => a === null)) return;
    setSubmitted(true);
  }

  async function graduate() {
    setGraduating(true);
    await handleGraduation();
    router.push("/foundation/ascension");
  }

  function retry() {
    setAnswers(Array(QUESTIONS.length).fill(null));
    setSubmitted(false);
  }

  return (
    <div className="gp-wrap">
      <div className="gp-container">
        {/* Header */}
        <div className="gp-header">
          <p className="gp-eyebrow">Foundation Assessment · Final Gate</p>
          <h1 className="gp-title">Graduation Assessment</h1>
          <p className="gp-sub">
            Score <strong>80% or higher</strong> to graduate from Hirely Foundation and unlock your
            career journey in Hirely Coach.
          </p>
        </div>

        {/* Sofia intro */}
        <SofiaGuide
          message="This is your moment! Answer all 5 questions honestly. You have prepared for this. I believe in you."
          messageSw="Hii ni wakati wako! Jibu maswali yote 5 kwa uaminifu. Umejiandaa kwa hili. Ninakuamini."
          variant="intro"
          showTranslate
        />

        {/* Questions */}
        <div className="gp-questions">
          {QUESTIONS.map((q, qi) => (
            <div key={qi} className="gp-question">
              <p className="gp-prompt">
                <span className="gp-q-num">Q{qi + 1}.</span> {q.prompt}
              </p>
              <div className="gp-options">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  let cls = "";
                  if (submitted) {
                    if (oi === q.correct) cls = "gp-opt--correct";
                    else if (chosen) cls = "gp-opt--wrong";
                  } else if (chosen) cls = "gp-opt--selected";

                  return (
                    <button
                      key={oi}
                      className={`gp-opt ${cls}`}
                      onClick={() => {
                        if (submitted) return;
                        const next = [...answers];
                        next[qi] = oi;
                        setAnswers(next);
                      }}
                      disabled={submitted}
                    >
                      <span className="gp-opt-key">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit / Result */}
        {!submitted && (
          <button
            className="gp-submit-btn"
            onClick={submit}
            disabled={answers.some((a) => a === null)}
          >
            Submit Final Assessment →
          </button>
        )}

        {submitted && (
          <div className={`gp-result ${passed ? "gp-result--pass" : "gp-result--fail"}`}>
            <div className="gp-result-score-wrap">
              <span className="gp-result-icon">{passed ? "🎓" : "📚"}</span>
              <div>
                <p className="gp-result-score">{score}%</p>
                <p className="gp-result-label">{passed ? "PASSED" : "NOT YET"}</p>
              </div>
            </div>
            {passed ? (
              <div className="gp-pass-content">
                <SofiaGuide
                  message={`Incredible! You scored ${score}%. You are no longer a student — you are a Candidate. Welcome to Hirely Coach.`}
                  messageSw={`Ajabu! Umepata ${score}%. Wewe si mwanafunzi tena — wewe ni Mgombea. Karibu Hirely Coach.`}
                  variant="celebrate"
                  showTranslate
                />
                <div className="gp-rewards">
                  <div className="gp-reward-item">
                    <span className="gp-reward-icon">🏅</span>
                    <div>
                      <p className="gp-reward-title">Foundation Graduate Badge</p>
                      <p className="gp-reward-sub">Permanently displayed on your profile</p>
                    </div>
                  </div>
                  <div className="gp-reward-item">
                    <span className="gp-reward-icon">⚡</span>
                    <div>
                      <p className="gp-reward-title">+{FOUNDATION_IP_BONUS} Bonus Impact Points</p>
                      <p className="gp-reward-sub">You start Coach Mode already ahead</p>
                    </div>
                  </div>
                </div>
                <button
                  className="gp-graduate-btn"
                  onClick={graduate}
                  disabled={graduating}
                >
                  {graduating ? "Ascending…" : "🚀 Enter Hirely Coach →"}
                </button>
              </div>
            ) : (
              <div className="gp-fail-content">
                <p className="gp-fail-msg">
                  You need 80% to graduate. Review the lessons for the questions you missed and try again.
                  You are so close!
                </p>
                <button className="gp-retry-btn" onClick={retry}>
                  Review & Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .gp-wrap {
          min-height: calc(100vh - 56px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 2rem 1.25rem 4rem;
        }
        .gp-container {
          max-width: 680px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .gp-header { display: flex; flex-direction: column; gap: 0.4rem; }
        .gp-eyebrow { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #34d399; margin: 0; }
        .gp-title { font-size: clamp(1.6rem, 4vw, 2.2rem); font-weight: 900; color: #f1f5f9; margin: 0; letter-spacing: -0.03em; }
        .gp-sub { font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.6; }
        .gp-sub strong { color: #34d399; }
        .gp-questions { display: flex; flex-direction: column; gap: 1.5rem; }
        .gp-question { display: flex; flex-direction: column; gap: 0.6rem; }
        .gp-prompt { font-size: 0.92rem; color: #e2e8f0; margin: 0; line-height: 1.55; }
        .gp-q-num { font-weight: 800; color: #818cf8; margin-right: 0.3rem; }
        .gp-options { display: flex; flex-direction: column; gap: 0.45rem; }
        .gp-opt { display: flex; align-items: center; gap: 0.65rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 0.65rem; padding: 0.6rem 1rem; font-size: 0.85rem; color: #94a3b8; cursor: pointer; text-align: left; transition: all 0.15s; }
        .gp-opt:hover:not(:disabled) { border-color: rgba(255,255,255,0.18); color: #e2e8f0; }
        .gp-opt--selected { border-color: #818cf8; color: #c7d2fe; background: rgba(129,140,248,0.08); }
        .gp-opt--correct { border-color: #34d399; color: #6ee7b7; background: rgba(52,211,153,0.08); }
        .gp-opt--wrong { border-color: #f87171; color: #fca5a5; background: rgba(239,68,68,0.08); }
        .gp-opt-key { font-size: 0.68rem; font-weight: 800; color: #475569; background: rgba(255,255,255,0.07); border-radius: 4px; padding: 0.1rem 0.35rem; flex-shrink: 0; }
        .gp-submit-btn { padding: 0.75rem 1.75rem; background: linear-gradient(135deg, #34d399, #059669); border: none; border-radius: 0.7rem; color: #0a0a0a; font-size: 0.95rem; font-weight: 800; cursor: pointer; transition: all 0.15s; align-self: flex-start; }
        .gp-submit-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(52,211,153,0.25); }
        .gp-submit-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
        .gp-result { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem; border-radius: 1rem; }
        .gp-result--pass { background: rgba(52,211,153,0.06); border: 1.5px solid rgba(52,211,153,0.25); }
        .gp-result--fail { background: rgba(239,68,68,0.04); border: 1.5px solid rgba(239,68,68,0.15); }
        .gp-result-score-wrap { display: flex; align-items: center; gap: 1rem; }
        .gp-result-icon { font-size: 3rem; }
        .gp-result-score { font-size: 2.5rem; font-weight: 900; color: #f1f5f9; margin: 0; line-height: 1; }
        .gp-result-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin: 0.2rem 0 0; }
        .gp-result--pass .gp-result-label { color: #34d399; }
        .gp-result--fail .gp-result-label { color: #f87171; }
        .gp-pass-content { display: flex; flex-direction: column; gap: 1.25rem; }
        .gp-rewards { display: flex; flex-direction: column; gap: 0.75rem; }
        .gp-reward-item { display: flex; align-items: center; gap: 0.85rem; background: rgba(255,255,255,0.03); border-radius: 0.6rem; padding: 0.75rem; border: 1px solid rgba(255,255,255,0.06); }
        .gp-reward-icon { font-size: 1.6rem; flex-shrink: 0; }
        .gp-reward-title { font-size: 0.88rem; font-weight: 700; color: #e2e8f0; margin: 0; }
        .gp-reward-sub { font-size: 0.73rem; color: #64748b; margin: 0.15rem 0 0; }
        .gp-graduate-btn { padding: 0.8rem 1.75rem; background: linear-gradient(135deg, #34d399, #059669); border: none; border-radius: 0.7rem; color: #0a0a0a; font-size: 1rem; font-weight: 800; cursor: pointer; transition: all 0.15s; align-self: flex-start; }
        .gp-graduate-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(52,211,153,0.3); }
        .gp-graduate-btn:disabled { opacity: 0.6; cursor: wait; }
        .gp-fail-content { display: flex; flex-direction: column; gap: 0.75rem; }
        .gp-fail-msg { font-size: 0.9rem; color: #94a3b8; line-height: 1.6; margin: 0; }
        .gp-retry-btn { align-self: flex-start; padding: 0.55rem 1.2rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 0.5rem; color: #94a3b8; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .gp-retry-btn:hover { color: #e2e8f0; border-color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
