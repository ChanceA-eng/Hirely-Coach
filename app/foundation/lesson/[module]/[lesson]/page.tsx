"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FoundationCommandCenter from "../../../../components/foundation/FoundationCommandCenter";
import LessonRenderer from "../../../../components/foundation/LessonRenderer";
import SofiaGuide from "../../../../components/foundation/SofiaGuide";
import {
  FOUNDATION_PROFILE_EVENT,
  getFoundationLanguagePref,
  isAllModulesComplete,
} from "../../../../lib/foundationProgress";

const FOUNDATION_MODULES = [
  { num: 1, title: "Alfabeti za Mafanikio", firstLesson: "1-1" },
  { num: 2, title: "Nambari na Rangi", firstLesson: "2-1" },
  { num: 3, title: "Maabara ya Ustadi wa Sauti", firstLesson: "3-1" },
  { num: 4, title: "Vitenzi na Viwakilishi", firstLesson: "4-1" },
  { num: 5, title: "Chakula na Ununuzi", firstLesson: "5-1" },
  { num: 6, title: "Maneno ya Kitaalamu", firstLesson: "6-1" },
  { num: 7, title: "Ujasiri wa Mazungumzo", firstLesson: "7-1" },
  { num: 8, title: "Hali ya Hewa na Hisia", firstLesson: "8-1" },
  { num: 9, title: "Maelekezo na Mtaani", firstLesson: "9-1" },
  { num: 10, title: "Kujitambulisha", firstLesson: "10-1" },
  { num: 11, title: "Misingi ya mahojiano", firstLesson: "11-1" },
  { num: 12, title: "Mtihani wa Kutoka", firstLesson: "12-1" },
] as const;

// Lazy-load lesson data based on module number
async function loadModule(moduleNum: number) {
  const modules: Record<number, () => Promise<{ default: unknown }>> = {
    1: () => import("../../../../data/lessons/module-1-phonics.json"),
    2: () => import("../../../../data/lessons/module-2-grammar.json"),
    3: () => import("../../../../data/lessons/module-3-vocabulary.json"),
    4: () => import("../../../../data/lessons/module-4-pronouns-verbs.json"),
    5: () => import("../../../../data/lessons/module-5-food-shopping.json"),
    6: () => import("../../../../data/lessons/module-6-vocabulary.json"),
    7: () => import("../../../../data/lessons/module-7-conversation.json"),
    8: () => import("../../../../data/lessons/module-8-weather-feelings.json"),
    9: () => import("../../../../data/lessons/module-9-directions-community.json"),
    10: () => import("../../../../data/lessons/module-10-introducing-yourself.json"),
    11: () => import("../../../../data/lessons/module-11-interview.json"),
    12: () => import("../../../../data/lessons/module-12-exit-exam.json"),
  };
  const loader = modules[moduleNum];
  if (!loader) return null;
  const mod = await loader();
  return mod.default as ModuleData;
}

interface LessonData {
  id: string;
  type: string;
  title: string;
  is_graduation_gate?: boolean;
  [key: string]: unknown;
}

interface ModuleData {
  module: number;
  title: string;
  title_sw: string;
  sofia_intro: string;
  sofia_intro_sw: string;
  lessons: LessonData[];
}

const LESSON_UI = {
  en: {
    loading: "Loading lesson...",
    lessonNotFound: "Lesson not found.",
    backToPathMap: "Back to Path Map",
    myPath: "My Path",
    moduleLabel: "Module",
    lessonMeta: "Lesson",
    of: "of",
    showEnglish: "Show in English",
    swahili: "Swahili",
    previous: "Previous",
    skip: "Skip",
    graduate: "Graduate",
    surveyTitle: "30-Second Survey",
    surveyIntro: "Before your success animation, tell us how this module felt.",
    surveyQ1: "1) On a scale of 1-5, how clear were the Swahili instructions?",
    surveyQ2: "2) Did the pronunciation guide help you speak the words out loud?",
    surveyQ3: "3) Was there anything confusing on this page?",
    surveyPlaceholder: "Tell us what felt confusing or type 'No'.",
    surveyYes: "Yes",
    surveyNo: "No",
    submitSurvey: "Submit Survey",
    saving: "Saving...",
    surveyRequired: "Please complete all 3 questions before continuing.",
    surveyFailed: "Could not save your survey right now. Please try again.",
    moduleComplete: "Module Complete",
    moduleUnlocked: "Great work. You unlocked the next module.",
    moduleReadyNow: "is ready now.",
    startNow: "Start",
    now: "Now",
    close: "Close",
    closeCompletionModal: "Close completion modal",
  },
  sw: {
    loading: "Inapakia somo...",
    lessonNotFound: "Somo halijapatikana.",
    backToPathMap: "Rudi Ramani ya Njia",
    myPath: "Njia Yangu",
    moduleLabel: "Moduli",
    lessonMeta: "Somo",
    of: "kati ya",
    showEnglish: "Onyesha kwa Kiingereza",
    swahili: "Kiswahili",
    previous: "Lililopita",
    skip: "Ruka",
    graduate: "Hitimu",
    surveyTitle: "Maoni ya Sekunde 30",
    surveyIntro: "Kabla ya kuona ushindi wako, tuambie kipengele hiki kimekuaje.",
    surveyQ1: "1) Kwa kiwango cha 1-5, maelekezo ya Kiswahili yalikuwa wazi kiasi gani?",
    surveyQ2: "2) Mwongozo wa matamshi ulikusaidia kusema maneno kwa sauti?",
    surveyQ3: "3) Kulikuwa na sehemu yoyote iliyokuwa ngumu kuelewa kwenye ukurasa huu?",
    surveyPlaceholder: "Andika kilichokuchanganya au andika 'Hapana'.",
    surveyYes: "Ndio",
    surveyNo: "Hapana",
    submitSurvey: "Tuma Dodoso",
    saving: "Inahifadhi...",
    surveyRequired: "Tafadhali jibu maswali yote 3 kabla ya kuendelea.",
    surveyFailed: "Haikuwezekana kuhifadhi dodoso sasa hivi. Jaribu tena.",
    moduleComplete: "Kipengele Kimekamilika",
    moduleUnlocked: "Hongera. Umefungua kipengele kinachofuata.",
    moduleReadyNow: "kiko tayari sasa.",
    startNow: "Anza",
    now: "Sasa",
    close: "Funga",
    closeCompletionModal: "Funga dirisha la kukamilisha",
  },
} as const;

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  const samsung = ua.match(/SM-[A-Z0-9]+/i);
  if (samsung?.[0]) return `Samsung ${samsung[0].toUpperCase()}`;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  return "Unknown Device";
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const moduleNum = parseInt(String(params?.module ?? "1"), 10);
  const lessonId = String(params?.lesson ?? "1-1");

  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [languagePref, setLanguagePref] = useState<"en" | "sw">("en");
  const [showSw, setShowSw] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [moduleSurveyOpen, setModuleSurveyOpen] = useState(false);
  const [completedModuleForSurvey, setCompletedModuleForSurvey] = useState<number | null>(null);
  const [surveyClarity, setSurveyClarity] = useState<number>(0);
  const [surveyPronunciationHelped, setSurveyPronunciationHelped] = useState<"yes" | "no" | "">("");
  const [surveyConfusing, setSurveyConfusing] = useState("");
  const [surveySaving, setSurveySaving] = useState(false);
  const [surveyError, setSurveyError] = useState("");

  const copy = LESSON_UI[languagePref];

  useEffect(() => {
    const syncLanguage = () => {
      const next = getFoundationLanguagePref();
      setLanguagePref(next);
    };

    window.addEventListener(FOUNDATION_PROFILE_EVENT, syncLanguage);
    return () => {
      window.removeEventListener(FOUNDATION_PROFILE_EVENT, syncLanguage);
    };
  }, []);

  useEffect(() => {
    loadModule(moduleNum).then(setModuleData);
  }, [moduleNum]);

  if (!moduleData) {
    return (
      <div className="lp-loading" aria-label={copy.loading}>
        <div className="lp-spinner" />
        <p>{copy.loading}</p>
      </div>
    );
  }

  const lessons = moduleData.lessons;
  const currentIdx = lessons.findIndex((l) => l.id === lessonId);
  const lesson = lessons[currentIdx];

  if (!lesson) {
    return (
      <div className="lp-wrap">
        <p style={{ color: "#f87171" }}>{copy.lessonNotFound}</p>
        <Link href="/foundation" style={{ color: "#34d399" }}>← {copy.backToPathMap}</Link>
      </div>
    );
  }

  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;

  function handleComplete() {
    if (nextLesson) {
      router.push(`/foundation/lesson/${moduleNum}/${nextLesson.id}`);
    } else {
      // End of module — go back to path map
      router.push("/foundation");
    }
  }

  function handleModulePassed(completedModuleNum: number) {
    setCompletedModuleForSurvey(completedModuleNum);
    setSurveyClarity(0);
    setSurveyPronunciationHelped("");
    setSurveyConfusing("");
    setSurveyError("");
    setModuleSurveyOpen(true);
  }

  const nextModule = FOUNDATION_MODULES.find((entry) => entry.num === moduleNum + 1) ?? null;

  async function submitModuleSurvey() {
    if (!completedModuleForSurvey) return;
    if (!surveyClarity || !surveyPronunciationHelped || surveyConfusing.trim().length < 2) {
      setSurveyError(copy.surveyRequired);
      return;
    }

    setSurveySaving(true);
    setSurveyError("");
    try {
      const response = await fetch("/api/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "module_milestone",
          category: "translation_quality",
          sentiment_score: surveyClarity,
          user_comment: surveyConfusing.trim(),
          module_number: completedModuleForSurvey,
          swahili_instruction_clarity: surveyClarity,
          pronunciation_guide_helpful: surveyPronunciationHelped === "yes",
          confusing_notes: surveyConfusing.trim(),
          url: window.location.href,
          user_agent: navigator.userAgent,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          device_type: detectDeviceType(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit module feedback");
      }

      setModuleSurveyOpen(false);
      if (nextModule) {
        setCompletionModalOpen(true);
      } else {
        router.push("/foundation");
      }
    } catch {
      setSurveyError(copy.surveyFailed);
    } finally {
      setSurveySaving(false);
    }
  }

  function handleGraduationGate(score: number) {
    if (score >= 80) {
      router.push("/foundation/graduate");
    } else {
      // Stay on page to retry (handled inside MultipleChoiceSection)
    }
  }

  const allModulesComplete = isAllModulesComplete();

  return (
    <div className="lp-wrap">
      <FoundationCommandCenter />

      {/* Breadcrumb */}
      <div className="lp-breadcrumb">
        <Link href="/foundation" className="lp-crumb">← {copy.myPath}</Link>
        <span className="lp-crumb-sep">/</span>
        <span className="lp-crumb-active">
          {copy.moduleLabel} {moduleNum}: {showSw ? moduleData.title_sw : moduleData.title}
        </span>
      </div>

      {/* Swahili toggle */}
      <div className="lp-toolbar">
        <div className="lp-lesson-meta">
          {copy.lessonMeta} {currentIdx + 1} {copy.of} {lessons.length}
        </div>
        <button
          className={`lp-sw-toggle ${showSw ? "lp-sw-toggle--on" : ""}`}
          onClick={() => setShowSw((v) => !v)}
        >
          {showSw ? copy.showEnglish : copy.swahili}
        </button>
      </div>

      {/* Module intro sofia (shown on first lesson only) */}
      {currentIdx === 0 && (
        <SofiaGuide
          message={moduleData.sofia_intro}
          messageSw={moduleData.sofia_intro_sw}
          variant="intro"
          showTranslate
        />
      )}

      {/* Lesson content */}
      <LessonRenderer
        lesson={lesson as Parameters<typeof LessonRenderer>[0]["lesson"]}
        moduleNum={moduleNum}
        onComplete={handleComplete}
        onModulePassed={handleModulePassed}
        onGraduationGate={handleGraduationGate}
        showSwahili={showSw}
      />

      {/* Navigation */}
      <div className="lp-nav">
        {prevLesson ? (
          <Link href={`/foundation/lesson/${moduleNum}/${prevLesson.id}`} className="lp-nav-btn lp-nav-btn--prev">
            ← {copy.previous}
          </Link>
        ) : (
          <Link href="/foundation" className="lp-nav-btn lp-nav-btn--prev">← {copy.backToPathMap}</Link>
        )}

        {nextLesson && !lesson.is_graduation_gate && (
          <Link href={`/foundation/lesson/${moduleNum}/${nextLesson.id}`} className="lp-nav-btn lp-nav-btn--next">
            {copy.skip} →
          </Link>
        )}

        {allModulesComplete && !lesson.is_graduation_gate && (
          <Link href="/foundation/graduate" className="lp-nav-btn lp-nav-btn--grad">
            🎓 {copy.graduate} →
          </Link>
        )}
      </div>

      {moduleSurveyOpen && (
        <div className="lp-survey-shell" role="dialog" aria-modal="true" aria-labelledby="module-survey-title">
          <div className="lp-survey-card">
            <p className="lp-completion-eyebrow">{copy.surveyTitle}</p>
            <h2 id="module-survey-title" className="lp-completion-title">{copy.surveyIntro}</h2>

            <div className="lp-survey-block">
              <p className="lp-survey-label">{copy.surveyQ1}</p>
              <div className="lp-survey-scale" role="radiogroup" aria-label="Swahili instruction clarity">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`lp-survey-chip ${surveyClarity === score ? "lp-survey-chip--on" : ""}`}
                    onClick={() => setSurveyClarity(score)}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="lp-survey-block">
              <p className="lp-survey-label">{copy.surveyQ2}</p>
              <div className="lp-survey-scale">
                <button
                  type="button"
                  className={`lp-survey-chip ${surveyPronunciationHelped === "yes" ? "lp-survey-chip--on" : ""}`}
                  onClick={() => setSurveyPronunciationHelped("yes")}
                >
                  {copy.surveyYes}
                </button>
                <button
                  type="button"
                  className={`lp-survey-chip ${surveyPronunciationHelped === "no" ? "lp-survey-chip--on" : ""}`}
                  onClick={() => setSurveyPronunciationHelped("no")}
                >
                  {copy.surveyNo}
                </button>
              </div>
            </div>

            <div className="lp-survey-block">
              <label className="lp-survey-label" htmlFor="module-survey-confusing">
                {copy.surveyQ3}
              </label>
              <textarea
                id="module-survey-confusing"
                className="lp-survey-textarea"
                placeholder={copy.surveyPlaceholder}
                value={surveyConfusing}
                onChange={(event) => setSurveyConfusing(event.target.value)}
              />
            </div>

            {surveyError && <p className="lp-survey-error">{surveyError}</p>}

            <button type="button" className="lp-nav-btn lp-nav-btn--grad" onClick={() => void submitModuleSurvey()} disabled={surveySaving}>
              {surveySaving ? copy.saving : copy.submitSurvey}
            </button>
          </div>
        </div>
      )}

      {completionModalOpen && nextModule && (
        <div className="lp-completion-shell" role="dialog" aria-modal="true" aria-labelledby="module-complete-title">
          <button
            type="button"
            className="lp-completion-backdrop"
            aria-label={copy.closeCompletionModal}
            onClick={() => setCompletionModalOpen(false)}
          />
          <div className="lp-completion-card">
            <button
              type="button"
              className="lp-completion-close"
              aria-label={copy.closeCompletionModal}
              onClick={() => setCompletionModalOpen(false)}
            >
              ×
            </button>
            <p className="lp-completion-eyebrow">{copy.moduleComplete}</p>
            <h2 id="module-complete-title" className="lp-completion-title">{copy.moduleUnlocked}</h2>
            <p className="lp-completion-copy">
              {copy.moduleLabel} {moduleNum + 1}, <strong>{nextModule.title}</strong>, {copy.moduleReadyNow}
            </p>
            <div className="lp-completion-actions">
              <Link href={`/foundation/lesson/${nextModule.num}/${nextModule.firstLesson}`} className="lp-nav-btn lp-nav-btn--grad">
                {copy.startNow} {nextModule.title} {copy.now}
              </Link>
              <button type="button" className="lp-nav-btn lp-nav-btn--prev" onClick={() => setCompletionModalOpen(false)}>
                {copy.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lp-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          gap: 1rem;
          color: #64748b;
          font-size: 0.9rem;
        }
        .lp-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(52,211,153,0.15);
          border-top-color: #34d399;
          border-radius: 50%;
          animation: lp-spin 0.7s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        .lp-wrap {
          max-width: 720px;
          margin: 0 auto;
          padding: 1.5rem 1.25rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .lp-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .lp-crumb {
          font-size: 0.78rem;
          color: #64748b;
          text-decoration: none;
          transition: color 0.15s;
        }
        .lp-crumb:hover { color: #94a3b8; }
        .lp-crumb-sep { font-size: 0.78rem; color: #334155; }
        .lp-crumb-active { font-size: 0.78rem; color: #94a3b8; }
        .lp-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }
        .lp-lesson-meta {
          font-size: 0.72rem;
          color: #475569;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }
        .lp-sw-toggle {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lp-sw-toggle--on {
          border-color: rgba(52,211,153,0.3);
          background: rgba(52,211,153,0.08);
          color: #34d399;
        }
        .lp-nav {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-nav-btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.82rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s;
        }
        .lp-nav-btn--prev {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b;
        }
        .lp-nav-btn--prev:hover { color: #94a3b8; }
        .lp-nav-btn--next {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b;
          margin-left: auto;
        }
        .lp-nav-btn--grad {
          background: rgba(52,211,153,0.1);
          border: 1.5px solid rgba(52,211,153,0.3);
          color: #34d399;
          margin-left: auto;
        }
        .lp-nav-btn--grad:hover { background: rgba(52,211,153,0.2); }
        .lp-completion-shell {
          position: fixed;
          inset: 0;
          z-index: 90;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .lp-completion-backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(2, 6, 23, 0.72);
        }
        .lp-completion-card {
          position: relative;
          width: min(100%, 28rem);
          border-radius: 1.25rem;
          border: 1px solid rgba(52,211,153,0.18);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98));
          box-shadow: 0 28px 80px rgba(2, 6, 23, 0.55);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }
        .lp-completion-close {
          position: absolute;
          top: 0.85rem;
          right: 0.85rem;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
          font-size: 1.15rem;
          cursor: pointer;
        }
        .lp-completion-eyebrow {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.11em;
          color: #34d399;
        }
        .lp-completion-title {
          margin: 0;
          font-size: clamp(1.3rem, 4vw, 1.8rem);
          line-height: 1.1;
          color: #f8fafc;
        }
        .lp-completion-copy {
          margin: 0;
          color: #cbd5e1;
        }
        .lp-completion-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .lp-survey-shell {
          position: fixed;
          inset: 0;
          z-index: 95;
          background: rgba(2, 6, 23, 0.86);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .lp-survey-card {
          width: min(100%, 32rem);
          border-radius: 1rem;
          border: 1px solid rgba(52,211,153,0.22);
          background: rgba(2, 6, 23, 0.98);
          box-shadow: 0 24px 60px rgba(2, 6, 23, 0.55);
          padding: 1rem;
          display: grid;
          gap: 0.8rem;
        }
        .lp-survey-block {
          display: grid;
          gap: 0.4rem;
        }
        .lp-survey-label {
          margin: 0;
          color: #d1d5db;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .lp-survey-scale {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .lp-survey-chip {
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.35);
          background: rgba(15, 23, 42, 0.82);
          color: #cbd5e1;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 0.35rem 0.75rem;
          cursor: pointer;
        }
        .lp-survey-chip--on {
          border-color: rgba(52,211,153,0.6);
          color: #d1fae5;
          background: rgba(16,185,129,0.15);
        }
        .lp-survey-textarea {
          width: 100%;
          min-height: 5.5rem;
          border-radius: 0.65rem;
          border: 1px solid rgba(148,163,184,0.35);
          background: rgba(15, 23, 42, 0.86);
          color: #e2e8f0;
          font-size: 0.8rem;
          padding: 0.6rem;
          resize: vertical;
        }
        .lp-survey-error {
          margin: 0;
          color: #fca5a5;
          font-size: 0.76rem;
        }
        @media (max-width: 768px) {
          .lp-wrap {
            padding: 1rem 1rem 7rem;
            gap: 1rem;
          }
          .lp-toolbar {
            align-items: stretch;
            flex-direction: column;
          }
          .lp-nav-btn {
            width: 100%;
            text-align: center;
            padding: 0.8rem 1rem;
          }
          .lp-nav-btn--next,
          .lp-nav-btn--grad {
            margin-left: 0;
          }
          .lp-completion-card {
            padding: 1.25rem;
          }
          .lp-completion-actions > * {
            width: 100%;
          }
          .lp-survey-card {
            padding: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
}
