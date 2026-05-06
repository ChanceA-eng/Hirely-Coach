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
  },
} as const;

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const moduleNum = parseInt(String(params?.module ?? "1"), 10);
  const lessonId = String(params?.lesson ?? "1-1");

  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [languagePref, setLanguagePref] = useState<"en" | "sw">(getFoundationLanguagePref());
  const [showSw, setShowSw] = useState(getFoundationLanguagePref() === "sw");

  const copy = LESSON_UI[languagePref];

  useEffect(() => {
    const syncLanguage = () => {
      const next = getFoundationLanguagePref();
      setLanguagePref(next);
      setShowSw(next === "sw");
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
      `}</style>
    </div>
  );
}
