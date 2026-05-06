"use client";

import { useEffect, useRef, useState } from "react";
import SofiaGuide from "./SofiaGuide";
import PhoneticCard from "./PhoneticCard";
import AudioEngine from "./AudioEngine";
import WordCard from "./WordCard";
import { completeLesson, saveAssessmentScore, PASS_THRESHOLD, rewardLessonMastery } from "../../lib/foundationProgress";
import { createSofiaUtterance, warmSofiaVoices } from "../../lib/sofiaVoice";
import { logFoundationEvent } from "../../lib/foundationTelemetryClient";
import { toAudioSrc } from "../../lib/audioPath";
import { playAudioUrl } from "../../lib/playAudio";

// ── Types ──────────────────────────────────────────────────────────────────

interface PhoneticSound {
  label: string;
  phonetic_sw: string;
  examples: Array<{ word: string; sw: string; emoji: string; phonetic_sw?: string; audio_url?: string }>;
  audio_url: string;
}

interface VocabWord {
  word: string;
  sw: string;
  emoji: string;
  example: string;
  audio_url: string;
}

interface MCQuestion {
  prompt: string;
  prompt_sw: string;
  options: string[];
  options_sw?: string[];
  correct: number;
}

interface DialogueLine {
  speaker: string;
  en: string;
  sw: string;
  audio_url: string;
}

interface AlphabetRow {
  letter: string;
  letter_phonetic_sw: string;
  example_word_en: string;
  example_phonetic_sw: string;
  translation_sw: string;
  audio_letter_en: string;
  audio_example_en: string;
}

interface NumberItem {
  value: number;
  word_en: string;
  phonetic_sw: string;
  audio_en: string;
}

interface ColorItem {
  name_en: string;
  phonetic_sw: string;
  translation_sw: string;
  hex: string;
  audio_en: string;
}

interface LetterApplication {
  letter: string;
  phonetic_sw: string;
  example_word: string;
  example_phonetic_sw: string;
  translation_sw: string;
  audio_letter_en: string;
  audio_example_en: string;
}

interface SoundWord {
  word: string;
  phonetic_sw: string;
  translation_sw: string;
  audio_en: string;
}

interface ShortVowelGroup {
  vowel: string;
  phonetic_sw: string;
  items: SoundWord[];
}

interface LongVowelPair {
  from: string;
  to: string;
  sound: string;
  from_phonetic_sw: string;
  to_phonetic_sw: string;
  translation_sw: string;
  audio_from_en: string;
  audio_to_en: string;
}

interface SoundCluster {
  label: string;
  phonetic_sw: string;
  items: SoundWord[];
}

interface MinimalPair {
  left: string;
  left_phonetic_sw: string;
  right: string;
  right_phonetic_sw: string;
  note_sw: string;
  audio_left_en: string;
  audio_right_en: string;
}

interface ListenChooseDrill {
  prompt_text_en: string;
  prompt_phonetic_sw: string;
  options: string[];
  correct: number;
}

interface FillBlankDrill {
  clue_sw: string;
  template: string;
  answer: string;
}

interface ComparisonPair {
  short_word: string;
  short_phonetic_sw: string;
  long_word: string;
  long_phonetic_sw: string;
  audio_short_en: string;
  audio_long_en: string;
}

interface LongVowelSetItem {
  vowel: string;
  sound: string;
  example_word: string;
  example_phonetic_sw: string;
  translation_sw: string;
  audio_en: string;
}

interface NounItem {
  word: string;
  phonetic_sw: string;
  translation_sw: string;
  emoji: string;
  audio_en: string;
}

interface NounTab {
  id: string;
  label_en: string;
  label_sw: string;
  items: NounItem[];
}

interface PluralPair {
  singular: string;
  singular_phonetic_sw: string;
  plural: string;
  plural_phonetic_sw: string;
  translation_sw: string;
  singular_count: number;
  plural_count: number;
  audio_singular_en: string;
  audio_plural_en: string;
}

interface MatchGameItem {
  word: string;
  target_emoji: string;
}

interface AdjectivePair {
  left_word: string;
  left_phonetic_sw: string;
  left_translation_sw: string;
  right_word: string;
  right_phonetic_sw: string;
  right_translation_sw: string;
  left_audio_en: string;
  right_audio_en: string;
}

interface SentenceOrderItem {
  sw: string;
  en: string;
  phonetic_sw: string;
  adjective: string;
  noun: string;
  audio_en: string;
}

interface TranslateExercise {
  sw: string;
  answer_en: string;
}

interface ListenMatchItem {
  audio_en: string;
  phrase_en: string;
  answer_emoji: string;
}

// ── New lesson type interfaces ─────────────────────────────────────────────

interface PrepItem {
  word: string;
  phonetic_sw: string;
  translation_sw: string;
  emoji: string;
  audio_en: string;
}

interface PrepSentence {
  en: string;
  phonetic_sw: string;
  sw: string;
  preposition: string;
  audio_en: string;
}

interface LivePlaygroundPosition {
  id: string;
  label_en: string;
  label_sw: string;
  sentence_en: string;
  audio_en: string;
}

interface LivePlayground {
  object: string;
  object_name_en: string;
  object_name_sw: string;
  positions: LivePlaygroundPosition[];
}

interface PrepFillBlank {
  sentence_sw: string;
  template_en: string;
  answer: string;
  options: string[];
}

interface DayItem {
  day: string;
  phonetic_sw: string;
  translation_sw: string;
  audio_en: string;
  slow_motion: boolean;
}

interface TimePartItem {
  part: string;
  phonetic_sw: string;
  translation_sw: string;
  emoji: string;
  audio_en: string;
}

interface DayOrderExercise {
  prompt_sw: string;
  prompt_en: string;
  scrambled: string[];
  correct_order: string[];
}

interface FamilyMember {
  word: string;
  phonetic_sw: string;
  translation_sw: string;
  emoji: string;
  tree_pos: string;
  audio_en: string;
}

interface PossessiveItem {
  word: string;
  phonetic_sw: string;
  translation_sw: string;
  gender: string;
  audio_en: string;
}

interface SentenceBuilderConfig {
  col1: string[];
  col2: string[];
  col3: string[];
}

interface PossessiveQuizItem {
  image_desc: string;
  image_emoji: string;
  correct: string;
  options: string[];
  feedback_sw: string;
}

interface RelationshipExercise {
  sw: string;
  answer_en: string;
}

interface RecordTarget {
  word: string;
  phonetic_sw: string;
  cue_sw: string;
}

interface MouthGuide {
  sound: string;
  tip_sw: string;
  tip_en: string;
  media_url?: string;
}

interface LessonData {
  id: string;
  type: string;
  title: string;
  title_sw?: string;
  moduleId?: number;         // injected by lesson page for telemetry
  instruction_sw?: string;   // Swahili instruction shown by default
  instruction_en?: string;   // English instruction (hidden; shown in EN mode)
  audio_en?: string;         // URL to the lesson's primary audio in English
  sofia_hint?: string;
  sofia_hint_sw?: string;
  professional_association?: string;
  professional_association_sw?: string;
  // alphabet_grid
  alphabet_rows?: AlphabetRow[];
  // phonetic_card
  letter?: string;
  sounds?: PhoneticSound[];
  // lesson_card / content
  content?: Array<{ label: string; label_sw: string; explanation: string; explanation_sw: string; examples: string[]; examples_sw: string[] }>;
  practice_sentences?: Array<{ en: string; sw: string }>;
  common_mistakes?: Array<{ wrong: string; right: string; explanation: string; explanation_sw: string }>;
  formula?: string;
  formula_sw?: string;
  examples?: Array<{ en: string; sw: string; breakdown: Record<string, string> }>;
  // vocabulary_grid
  words?: VocabWord[];
  // number_builder
  tens?: Array<{ value: number; word: string; sw: string }>;
  ones?: Array<{ value: number; word: string; sw: string }>;
  time_phrases?: Array<{ en: string; sw: string }>;
  // numbers_colors
  numbers?: NumberItem[];
  colors?: ColorItem[];
  notes_sw?: string[];
  notes_en?: string[];
  tip_sw?: string;
  tip_en?: string;
  // sounds_lab
  short_vowels?: ShortVowelGroup[];
  long_vowel_pairs?: LongVowelPair[];
  digraph_groups?: SoundCluster[];
  ending_blends?: SoundCluster[];
  minimal_pairs?: MinimalPair[];
  listen_choose?: ListenChooseDrill[];
  fill_blanks?: FillBlankDrill[];
  comparison_pairs?: ComparisonPair[];
  long_vowel_sets?: LongVowelSetItem[];
  letter_applications?: LetterApplication[];
  record_targets?: RecordTarget[];
  mouth_guides?: MouthGuide[];
  noun_tabs?: NounTab[];
  plural_pairs?: PluralPair[];
  match_game?: MatchGameItem[];
  sentence_examples?: Array<{ en: string; phonetic_sw: string; sw: string; audio_en?: string }>;
  adjective_pairs?: AdjectivePair[];
  sentence_order_items?: SentenceOrderItem[];
  more_examples?: Array<{ en: string; phonetic_sw: string; sw: string; audio_en?: string }>;
  translate_exercises?: TranslateExercise[];
  listen_match?: ListenMatchItem[];
  // prepositions_lab
  prepositions?: PrepItem[];
  prep_sentences?: PrepSentence[];
  live_playground?: LivePlayground;
  prep_fill_blanks?: PrepFillBlank[];
  sofia_in_on_tip?: string;
  // time_days_lab
  days?: DayItem[];
  time_parts?: TimePartItem[];
  time_note_sw?: string;
  day_order_exercise?: DayOrderExercise;
  clock_hours?: number[];
  // family_lab
  family_members?: FamilyMember[];
  possessives?: PossessiveItem[];
  sentence_builder?: SentenceBuilderConfig;
  possessive_quiz?: PossessiveQuizItem[];
  relationship_exercises?: RelationshipExercise[];
  // multiple_choice
  questions?: MCQuestion[];
  is_graduation_gate?: boolean;
  // dialogue
  dialogues?: Array<{ title: string; title_sw: string; lines: DialogueLine[] }>;
  // listening
  exercises?: Array<{ audio_url: string; transcript: string; transcript_sw: string; question: string; question_sw: string; options: string[]; correct: number }>;
  // speaking_prompt
  prompts?: Array<{ question: string; question_sw: string; sample_answer: string; sample_answer_sw: string }>;
  // ai_conversation
  context_sw?: string;
  context_en?: string;
  turns?: Array<{
    id: string;
    boss_message: string;
    boss_audio?: string;
    response_mode: "voice" | "type";
    expected_keywords?: string[];
    expected_answer?: string;
    expected_answer_alt?: string[];
    hint_sw: string;
    hint_en: string;
    success_response: string;
    success_audio?: string;
    skills_checked: string[];
  }>;
  // fill_blank (exit exam)
  blanks?: Array<{ sentence_sw: string; template: string; answer: string; hint_sw: string; emoji?: string }>;
  // certificate
  sofia_message?: string;
  sofia_message_sw?: string;
  skills_mastered?: Array<{ skill: string; skill_sw: string; emoji: string; color: string }>;
  next_step?: string;
  next_step_sw?: string;
  next_step_url?: string;
  confetti?: boolean;
}

interface LessonRendererProps {
  lesson: LessonData;
  moduleNum: number;
  onComplete?: (lessonId: string) => void;
  onGraduationGate?: (score: number) => void;
  showSwahili?: boolean;
}

// Default Swahili instructions per lesson type (overridden by lesson.instruction_sw from JSON)
const DEFAULT_INSTRUCTION_SW: Record<string, string> = {
  phonetic_card:    "Bonyeza sauti kusikia. Sema mifano kwa sauti kila wakati.",
  lesson_card:      "Soma kwa makini. Angalia mifano na makosa ya kawaida.",
  vocabulary_grid:  "Bonyeza kila neno kulisikia matamshi sahihi.",
  number_builder:   "Chagua makumi + moja kujenga nambari. Angalia jinsi inavyoundwa!",
  numbers_colors:   "Bonyeza kadi moja moja kusikia sauti, kisha songa mbele.",
  sounds_lab:       "Sikiliza sauti, linganisha maneno, na fanya mazoezi ya matamshi hatua kwa hatua.",
  noun_lab:         "Chagua tab, sikiliza majina ya vitu, kisha fanya mazoezi ya umoja na wingi.",
  adjective_lab:    "Jifunze sifa zinazopingana na mpangilio sahihi wa maneno kwenye Kiingereza.",
  prepositions_lab: "Jifunza maneno yanayoonyesha mahali vitu vilipo, kisha fanya mazoezi.",
  time_days_lab:    "Jifunza siku za wiki na muda. Tumia 'on' kwa siku na 'at' kwa wakati maalum.",
  family_lab:       "Jifunza majina ya familia na viwakilishi vya umiliki. Jenga sentensi na vipande vya maneno.",
  multiple_choice:  "Jibu maswali yote kisha bonyeza 'Wasilisha Majibu'.",
  dialogue:         "Soma mazungumzo kwa sauti. Bonyeza vitufe vya sauti kusikia matamshi.",
  listening:        "Sikiliza kwa makini kisha jibu maswali hapa chini.",
  speaking_prompt:  "Jibu maswali haya kwa Kiingereza. Tumia mifano kama msaada.",
  ai_conversation:  "Zungumza na bosi wako wa kwanza kwa ujasiri. Jibu kila swali kwa sauti au maandishi.",
  fill_blank:       "Kamilisha sentensi kwa kuandika neno sahihi katika nafasi iliyoachwa.",
  certificate:      "Umekamilisha Foundation Mode. Angalia ujuzi wako wote uliojifunza!",
};

const DEFAULT_INSTRUCTION_EN: Record<string, string> = {
  phonetic_card:    "Click a sound to hear it. Say the example words aloud.",
  lesson_card:      "Read carefully. Study the examples and common mistakes.",
  vocabulary_grid:  "Click each word to hear its correct pronunciation.",
  number_builder:   "Select TENS + ONES to build any number. See how they combine!",
  numbers_colors:   "Tap each number and color to hear pronunciation and memorize patterns.",
  sounds_lab:       "Practice each sound step-by-step with drills and pronunciation tools.",
  noun_lab:         "Use tabs, plural practice, and matching game to master common nouns.",
  adjective_lab:    "Practice adjective opposites and adjective+noun word order.",
  prepositions_lab: "Learn words that show WHERE things are, then practice with exercises.",
  time_days_lab:    "Learn days of the week and time. Use 'on' for days and 'at' for specific times.",
  family_lab:       "Learn family member names and possessives. Build sentences with word blocks.",
  multiple_choice:  "Answer all questions then click 'Submit Answers'.",
  dialogue:         "Read the dialogues aloud. Click audio buttons to hear pronunciation.",
  listening:        "Listen carefully then answer the questions below.",
  speaking_prompt:  "Answer these questions in English. Use the examples as a guide.",
  ai_conversation:  "Speak or type to respond to your boss. Use everything you have learned!",
  fill_blank:       "Type the missing word to complete each sentence. No hints this time!",
  certificate:      "You have completed Foundation Mode. Review all the skills you have mastered!",
};

// ── Main Renderer ──────────────────────────────────────────────────────────

export default function LessonRenderer({
  lesson,
  moduleNum,
  onComplete,
  onGraduationGate,
  showSwahili = false,
}: LessonRendererProps) {
  // Dropout telemetry — fires when user leaves the lesson without completing it
  const completedRef = useRef(false);
  const rewardedRef = useRef(false);
  const wrappedOnComplete = (id: string) => {
    completedRef.current = true;
    if (!rewardedRef.current) {
      rewardLessonMastery(lesson.type);
      rewardedRef.current = true;
    }
    onComplete?.(id);
  };
  // Inject moduleId into lesson for child components' telemetry
  const lessonWithModule = { ...lesson, moduleId: moduleNum };
  useEffect(() => {
    return () => {
      if (!completedRef.current) {
        logFoundationEvent({
          type: "dropout",
          moduleId: moduleNum,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          userId: null,
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lr-wrap">
      {/* Lesson title — Swahili-first */}
      <div className="lr-title-row">
        <h2 className="lr-title">
          {showSwahili && lesson.title_sw ? lesson.title_sw : lesson.title}
        </h2>
        {showSwahili && lesson.title_sw && (
          <p className="lr-title-en">{lesson.title}</p>
        )}
        {!showSwahili && lesson.title_sw && (
          <p className="lr-title-sw">{lesson.title_sw}</p>
        )}
      </div>

      {/* Instruction strip — Swahili-first directive label */}
      {(() => {
        const instrSw = lesson.instruction_sw ?? DEFAULT_INSTRUCTION_SW[lesson.type];
        const instrEn = lesson.instruction_en ?? DEFAULT_INSTRUCTION_EN[lesson.type];
        if (!instrSw && !instrEn) return null;
        return (
          <div className="lr-instruction">
            <span className="lr-instruction-icon">📋</span>
            <span className="lr-instruction-text">
              {showSwahili && instrSw ? instrSw : instrEn ?? instrSw}
            </span>
          </div>
        );
      })()}

      {/* Sofia hint */}
      {lesson.sofia_hint && (
        <SofiaGuide
          message={lesson.sofia_hint}
          messageSw={lesson.sofia_hint_sw}
          showTranslate={!!lesson.sofia_hint_sw}
        />
      )}

      {/* Content switch */}
      {lesson.type === "phonetic_card" && lesson.sounds && (
        <PhoneticCardSection
          lesson={lesson}
          moduleNum={moduleNum}
          showSwahili={showSwahili}
          onComplete={wrappedOnComplete}
        />
      )}

      {lesson.type === "alphabet_grid" && lesson.alphabet_rows && (
        <AlphabetGridSection lesson={lesson} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "lesson_card" && (
        <LessonCardSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "vocabulary_grid" && lesson.words && (
        <VocabularyGridSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "number_builder" && (
        <NumberBuilderSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "numbers_colors" && lesson.numbers && lesson.colors && (
        <NumbersColorsSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "sounds_lab" && (
        <SoundsLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "noun_lab" && (
        <NounLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "adjective_lab" && (
        <AdjectiveLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "prepositions_lab" && (
        <PrepositionsLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "time_days_lab" && (
        <TimeDaysLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "family_lab" && (
        <FamilyLabSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "multiple_choice" && lesson.questions && (
        <MultipleChoiceSection
          lesson={lesson}
          moduleNum={moduleNum}
          showSwahili={showSwahili}
          onComplete={wrappedOnComplete}
          onGraduationGate={onGraduationGate}
        />
      )}

      {lesson.type === "dialogue" && lesson.dialogues && (
        <DialogueSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "listening" && lesson.exercises && (
        <ListeningSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "speaking_prompt" && lesson.prompts && (
        <SpeakingSection lesson={lesson} showSwahili={showSwahili} onComplete={wrappedOnComplete} moduleNum={moduleNum} />
      )}

      {lesson.type === "ai_conversation" && lesson.turns && (
        <AiConversationSection lesson={lessonWithModule} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "fill_blank" && lesson.blanks && (
        <FillBlankExitSection lesson={lessonWithModule} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      {lesson.type === "certificate" && (
        <CertificateSection lesson={lessonWithModule} showSwahili={showSwahili} onComplete={wrappedOnComplete} />
      )}

      <style>{`
        .lr-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .lr-title-row { display: flex; flex-direction: column; gap: 0.25rem; }
        .lr-title { font-size: 1.35rem; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -0.02em; }
        .lr-title-sw { font-size: 0.82rem; color: #64748b; margin: 0; font-style: italic; }
        .lr-title-en { font-size: 0.78rem; color: #475569; margin: 0; }
        .lr-instruction {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(52,211,153,0.05);
          border: 1px solid rgba(52,211,153,0.12);
          border-radius: 0.5rem;
          padding: 0.45rem 0.85rem;
        }
        .lr-instruction-icon { font-size: 0.85rem; flex-shrink: 0; }
        .lr-instruction-text { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }
      `}</style>
    </div>
  );
}

// ── Numbers & Colors Section ──────────────────────────────────────────────

function NumbersColorsSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const numbers = lesson.numbers ?? [];
  const colors = lesson.colors ?? [];
  const [track, setTrack] = useState<"numbers" | "colors">("numbers");
  const [index, setIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const items = track === "numbers"
    ? numbers.map((n) => ({
      id: `num-${n.value}`,
      primary: String(n.value),
      secondary: n.word_en,
      tertiary: n.phonetic_sw,
      visual: null as string | null,
      audio: n.audio_en,
      spoken: n.word_en,
      translation: "",
    }))
    : colors.map((c) => ({
      id: `color-${c.name_en}`,
      primary: c.name_en,
      secondary: c.phonetic_sw,
      tertiary: c.translation_sw,
      visual: c.hex,
      audio: c.audio_en,
      spoken: c.name_en,
      translation: c.translation_sw,
    }));

  const activeItem = items[index] ?? null;

  useEffect(() => {
    const cache = cacheRef.current;
    const urls = [
      ...numbers.map((n) => n.audio_en),
      ...colors.map((c) => c.audio_en),
    ].filter(Boolean);

    for (const url of urls) {
      if (cache.has(url)) continue;
      const audio = new Audio(toAudioSrc(url) || "");
      audio.preload = "auto";
      audio.load();
      cache.set(url, audio);
    }

    return () => {
      for (const audio of cache.values()) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [numbers, colors]);

  function stopAll() {
    for (const audio of cacheRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speakFallback(text: string, id: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      setPlayingId(null);
      return;
    }
    warmSofiaVoices();
    const utterance = createSofiaUtterance(text, { lang: "en-US", rate: 0.92 });
    utterance.onstart = () => setPlayingId(id);
    utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
    utterance.onerror = () => setPlayingId((prev) => (prev === id ? null : prev));
    window.speechSynthesis.speak(utterance);
  }

  async function play(id: string, url: string, spoken: string) {
    stopAll();
    if (!url?.trim()) {
      speakFallback(spoken, id);
      return;
    }
    const audio = cacheRef.current.get(url) ?? new Audio(toAudioSrc(url) || "");
    cacheRef.current.set(url, audio);
    audio.onended = () => setPlayingId((prev) => (prev === id ? null : prev));
    audio.onerror = () => speakFallback(spoken, id);

    try {
      audio.currentTime = 0;
      setPlayingId(id);
      await audio.play();
    } catch {
      speakFallback(spoken, id);
    }
  }

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  function switchTrack(next: "numbers" | "colors") {
    setTrack(next);
    setIndex(0);
    setPlayingId(null);
  }

  function goPrev() {
    setIndex((prev) => Math.max(0, prev - 1));
  }

  function goNext() {
    setIndex((prev) => Math.min(items.length - 1, prev + 1));
  }

  return (
    <div className="nc-wrap">
      <div className="nc-track-toggle" role="tablist" aria-label="Numbers and colors track">
        <button className={`nc-track-btn ${track === "numbers" ? "nc-track-btn--active" : ""}`} onClick={() => switchTrack("numbers")} role="tab" aria-selected={track === "numbers"}>
          Namba
        </button>
        <button className={`nc-track-btn ${track === "colors" ? "nc-track-btn--active" : ""}`} onClick={() => switchTrack("colors")} role="tab" aria-selected={track === "colors"}>
          Rangi
        </button>
      </div>

      {activeItem && (
        <div className="nc-single-card">
          {activeItem.visual && (
            <span className="nc-single-swatch" style={{ background: activeItem.visual }} aria-hidden="true" />
          )}
          <span className="nc-single-primary">{activeItem.primary}</span>
          <span className="nc-single-secondary">{activeItem.secondary}</span>
          {activeItem.tertiary ? <span className="nc-single-tertiary">{activeItem.tertiary}</span> : null}
          {activeItem.translation ? <span className="nc-single-translation">{activeItem.translation}</span> : null}

          <button
            className={`nc-play ${playingId === activeItem.id ? "nc-play--active" : ""}`}
            onClick={() => play(activeItem.id, activeItem.audio, activeItem.spoken)}
          >
            {playingId === activeItem.id ? "⏸ Inacheza" : "🔊 Sikiliza"}
          </button>

          <div className="nc-single-nav">
            <button className="nc-nav-btn" onClick={goPrev} disabled={index === 0}>← Nyuma</button>
            <span className="nc-progress">{index + 1} / {items.length}</span>
            <button className="nc-nav-btn" onClick={goNext} disabled={index >= items.length - 1}>Mbele →</button>
          </div>
        </div>
      )}

      {(showSwahili ? lesson.notes_sw : lesson.notes_en)?.length ? (
        <div className="nc-notes">
          {(showSwahili ? lesson.notes_sw : lesson.notes_en)?.map((note, idx) => (
            <p key={idx} className="nc-note">• {note}</p>
          ))}
        </div>
      ) : null}

      <div className="nc-tip">
        {showSwahili ? lesson.tip_sw : lesson.tip_en}
      </div>

      <button className="lr-complete-btn" onClick={markDone}>✅ Nimekamilisha Namba na Rangi — Endelea →</button>

      <style>{`
        .nc-wrap { display: flex; flex-direction: column; gap: 1.2rem; }
        .nc-track-toggle { display: flex; gap: 0.45rem; }
        .nc-track-btn {
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(148, 163, 184, 0.08);
          color: #94a3b8;
          border-radius: 999px;
          padding: 0.35rem 0.8rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .nc-track-btn--active {
          border-color: rgba(52, 211, 153, 0.35);
          background: rgba(52, 211, 153, 0.14);
          color: #34d399;
        }
        .nc-single-card {
          border: 1px solid rgba(255,255,255,0.09);
          background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.01));
          border-radius: 0.9rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          align-items: flex-start;
        }
        .nc-single-swatch {
          width: 100%;
          height: 88px;
          border-radius: 0.55rem;
          border: 1px solid rgba(255,255,255,0.22);
          margin-bottom: 0.35rem;
        }
        .nc-single-primary { font-size: 1.65rem; font-weight: 900; color: #34d399; line-height: 1.1; }
        .nc-single-secondary { font-size: 1.05rem; font-weight: 800; color: #e2e8f0; }
        .nc-single-tertiary { font-size: 0.84rem; color: #94a3b8; }
        .nc-single-translation { font-size: 0.8rem; color: #64748b; font-style: italic; }
        .nc-play {
          margin-top: 0.35rem;
          border: 1px solid rgba(52,211,153,0.3);
          background: rgba(52,211,153,0.08);
          color: #34d399;
          border-radius: 0.5rem;
          padding: 0.38rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .nc-play--active { box-shadow: 0 0 0 1px rgba(52,211,153,0.24), 0 0 14px rgba(52,211,153,0.2); }
        .nc-single-nav {
          width: 100%;
          margin-top: 0.45rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .nc-nav-btn {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #cbd5e1;
          border-radius: 0.45rem;
          padding: 0.35rem 0.62rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .nc-nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .nc-progress { font-size: 0.74rem; color: #64748b; }
        .nc-notes {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 0.7rem;
          padding: 0.7rem 0.8rem;
        }
        .nc-note { margin: 0.2rem 0; font-size: 0.8rem; color: #94a3b8; }
        .nc-tip {
          font-size: 0.82rem;
          color: #34d399;
          background: rgba(52,211,153,0.08);
          border: 1px solid rgba(52,211,153,0.2);
          border-radius: 0.6rem;
          padding: 0.65rem 0.8rem;
        }
      `}</style>
    </div>
  );
}

// ── Sounds Lab Section ────────────────────────────────────────────────────

function SoundsLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const shortVowels = lesson.short_vowels ?? [];
  const longPairs = lesson.long_vowel_pairs ?? [];
  const digraphs = lesson.digraph_groups ?? [];
  const blends = lesson.ending_blends ?? [];
  const minimalPairs = lesson.minimal_pairs ?? [];
  const listenChoose = lesson.listen_choose ?? [];
  const fillBlanks = lesson.fill_blanks ?? [];
  const longVowelSets = lesson.long_vowel_sets ?? [];
  const letterApplications = lesson.letter_applications ?? [];
  const recordTargets = lesson.record_targets ?? [];
  const mouthGuides = lesson.mouth_guides ?? [];

  const [shortIdx, setShortIdx] = useState(0);
  const [digraphIdx, setDigraphIdx] = useState(0);
  const [blendIdx, setBlendIdx] = useState(0);
  const [pairIdx, setPairIdx] = useState(0);
  const [letterIdx, setLetterIdx] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, number>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<number, string>>({});
  const [recordingTargetIdx, setRecordingTargetIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognitionScore, setRecognitionScore] = useState<number | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef<number>(0);

  const currentShort = shortVowels[shortIdx] ?? null;
  const currentDigraph = digraphs[digraphIdx] ?? null;
  const currentBlend = blends[blendIdx] ?? null;
  const currentPair = minimalPairs[pairIdx] ?? null;
  const currentLetter = letterApplications[letterIdx] ?? null;
  const currentRecordTarget = recordTargets[recordingTargetIdx] ?? null;

  useEffect(() => {
    const urls = [
      ...shortVowels.flatMap((v) => v.items.map((i) => i.audio_en)),
      ...longPairs.flatMap((p) => [p.audio_from_en, p.audio_to_en]),
      ...digraphs.flatMap((d) => d.items.map((i) => i.audio_en)),
      ...blends.flatMap((b) => b.items.map((i) => i.audio_en)),
      ...minimalPairs.flatMap((m) => [m.audio_left_en, m.audio_right_en]),
      ...letterApplications.flatMap((l) => [l.audio_letter_en, l.audio_example_en]),
      ...longVowelSets.map((v) => v.audio_en),
    ].filter(Boolean);

    for (const url of urls) {
      if (cacheRef.current.has(url)) continue;
      const audio = new Audio(toAudioSrc(url) || "");
      audio.preload = "auto";
      audio.load();
      cacheRef.current.set(url, audio);
    }

    return () => {
      for (const audio of cacheRef.current.values()) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [shortVowels, longPairs, digraphs, blends, minimalPairs, letterApplications, longVowelSets, recordedUrl]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function stopAllAudio() {
    for (const audio of cacheRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speakFallback(text: string, id: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) {
      setPlayingId(null);
      return;
    }
    warmSofiaVoices();
    const utterance = createSofiaUtterance(text, { lang: "en-US", rate: 0.92 });
    utterance.onstart = () => setPlayingId(id);
    utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
    utterance.onerror = () => setPlayingId((prev) => (prev === id ? null : prev));
    window.speechSynthesis.speak(utterance);
  }

  async function playAudio(id: string, url: string, spoken: string) {
    stopAllAudio();
    if (!url?.trim()) {
      speakFallback(spoken, id);
      return;
    }
    const audio = cacheRef.current.get(url) ?? new Audio(toAudioSrc(url) || "");
    cacheRef.current.set(url, audio);
    audio.onended = () => setPlayingId((prev) => (prev === id ? null : prev));
    audio.onerror = () => speakFallback(spoken, id);

    try {
      audio.currentTime = 0;
      setPlayingId(id);
      await audio.play();
    } catch {
      speakFallback(spoken, id);
    }
  }

  function playPrompt(id: string, spoken: string) {
    stopAllAudio();
    speakFallback(spoken, id);
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    startRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(URL.createObjectURL(blob));
      setRecordingMs(Math.max(300, Date.now() - startRef.current));
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function recordingScore() {
    const sec = recordingMs / 1000;
    const base = Math.min(100, Math.max(42, Math.round(45 + sec * 18)));
    return base;
  }

  function similarityScore(spoken: string, target: string) {
    const a = spoken.toLowerCase().replace(/[^a-z]/g, "");
    const b = target.toLowerCase().replace(/[^a-z]/g, "");
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    let matches = 0;
    const limit = Math.min(a.length, b.length);
    for (let i = 0; i < limit; i += 1) {
      if (a[i] === b[i]) matches += 1;
    }
    return Math.max(0, Math.min(100, Math.round((matches / maxLen) * 100)));
  }

  function checkPronunciationWithTranscript(target: string) {
    if (typeof window === "undefined") return;
    const SpeechRecognitionCtor = (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      ?? (window as typeof window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setRecognizedText("SpeechRecognition not supported in this browser.");
      setRecognitionScore(null);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecognizing(true);
    recognition.onerror = () => {
      setIsRecognizing(false);
      setRecognizedText("Recognition failed. Please try again.");
      setRecognitionScore(null);
    };
    recognition.onend = () => setIsRecognizing(false);
    recognition.onresult = (event: any) => {
      const heard = event.results?.[0]?.[0]?.transcript ?? "";
      setRecognizedText(heard);
      setRecognitionScore(similarityScore(heard, target));
    };

    recognitionRef.current = recognition;
    setRecognizedText("");
    setRecognitionScore(null);
    recognition.start();
  }

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="sl-wrap">
      {currentShort && (
        <div className="sl-block">
          <p className="sl-block-title">Sehemu ya 1: Sauti Fupi</p>
          <div className="sl-focus-card">
            <p className="sl-focus-main">{currentShort.vowel}</p>
            <p className="sl-focus-sub">({currentShort.phonetic_sw})</p>
            <div className="sl-chips">
              {currentShort.items.map((item) => {
                const id = `short-${currentShort.vowel}-${item.word}`;
                const active = playingId === id;
                return (
                  <button key={id} className={`sl-chip ${active ? "sl-chip--active" : ""}`} onClick={() => playAudio(id, item.audio_en, item.word)}>
                    {item.word} ({item.phonetic_sw}) - {item.translation_sw}
                  </button>
                );
              })}
            </div>
            <div className="sl-nav">
              <button className="sl-nav-btn" onClick={() => setShortIdx((v) => Math.max(0, v - 1))} disabled={shortIdx === 0}>←</button>
              <span className="sl-nav-label">{shortIdx + 1} / {shortVowels.length}</span>
              <button className="sl-nav-btn" onClick={() => setShortIdx((v) => Math.min(shortVowels.length - 1, v + 1))} disabled={shortIdx >= shortVowels.length - 1}>→</button>
            </div>
          </div>
        </div>
      )}

      {currentLetter && (
        <div className="sl-block">
          <p className="sl-block-title">A-Z Application Lab</p>
          <div className="sl-focus-card">
            <p className="sl-focus-main">{currentLetter.letter}</p>
            <p className="sl-focus-sub">({currentLetter.phonetic_sw})</p>
            <p className="sl-template">{currentLetter.example_word} ({currentLetter.example_phonetic_sw})</p>
            <p className="sl-clue">{currentLetter.translation_sw}</p>
            <div className="sl-row-actions">
              <button className={`sl-mini-btn ${playingId === `letter-${currentLetter.letter}` ? "sl-mini-btn--active" : ""}`} onClick={() => void playAudio(`letter-${currentLetter.letter}`, currentLetter.audio_letter_en, currentLetter.letter)}>🔊 Letter</button>
              <button className={`sl-mini-btn ${playingId === `word-${currentLetter.letter}` ? "sl-mini-btn--active" : ""}`} onClick={() => void playAudio(`word-${currentLetter.letter}`, currentLetter.audio_example_en, currentLetter.example_word)}>🔊 Example</button>
            </div>
            <div className="sl-nav">
              <button className="sl-nav-btn" onClick={() => setLetterIdx((v) => Math.max(0, v - 1))} disabled={letterIdx === 0}>←</button>
              <span className="sl-nav-label">{letterIdx + 1} / {letterApplications.length}</span>
              <button className="sl-nav-btn" onClick={() => setLetterIdx((v) => Math.min(letterApplications.length - 1, v + 1))} disabled={letterIdx >= letterApplications.length - 1}>→</button>
            </div>
          </div>
        </div>
      )}

      {longPairs.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Sehemu ya 2: Sauti Ndefu na Silent E</p>
          <div className="sl-pairs">
            {longPairs.map((pair, idx) => {
              const leftId = `long-left-${idx}`;
              const rightId = `long-right-${idx}`;
              return (
                <div key={`${pair.from}-${pair.to}`} className="sl-pair-row">
                  <div className="sl-pair-main">
                    <span>{pair.from} ({pair.from_phonetic_sw})</span>
                    <span className="sl-pair-arrow">↔</span>
                    <span>{pair.to} ({pair.to_phonetic_sw})</span>
                  </div>
                  <p className="sl-pair-note">{pair.translation_sw}</p>
                  <div className="sl-row-actions">
                    <button className="sl-mini-btn" onClick={() => void playAudio(leftId, pair.audio_from_en, pair.from)}>🔊 {pair.from}</button>
                    <button className="sl-mini-btn" onClick={() => void playAudio(rightId, pair.audio_to_en, pair.to)}>🔊 {pair.to}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {longVowelSets.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Long Vowels (A, E, I, O, U, Y)</p>
          <div className="sl-chips">
            {longVowelSets.map((item) => {
              const id = `lv-${item.vowel}-${item.example_word}`;
              const active = playingId === id;
              return (
                <button key={id} className={`sl-chip ${active ? "sl-chip--active" : ""}`} onClick={() => void playAudio(id, item.audio_en, item.example_word)}>
                  {item.vowel} → {item.sound} | {item.example_word} ({item.example_phonetic_sw}) - {item.translation_sw}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {listenChoose.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Sehemu ya 3: Sikiliza na Chagua</p>
          <div className="sl-drills">
            {listenChoose.map((drill, idx) => {
              const chosen = choiceAnswers[idx];
              return (
                <div key={`${drill.prompt_text_en}-${idx}`} className="sl-drill-card">
                  <button className="sl-mini-btn" onClick={() => playPrompt(`drill-${idx}`, drill.prompt_text_en)}>
                    🔊 ({drill.prompt_phonetic_sw})
                  </button>
                  <div className="sl-drill-options">
                    {drill.options.map((opt, oi) => {
                      const isCorrect = chosen !== undefined && oi === drill.correct;
                      const isWrong = chosen === oi && oi !== drill.correct;
                      return (
                        <button key={opt} className={`sl-drill-opt ${isCorrect ? "sl-drill-opt--ok" : ""} ${isWrong ? "sl-drill-opt--bad" : ""}`} onClick={() => setChoiceAnswers((prev) => ({ ...prev, [idx]: oi }))}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fillBlanks.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Kamilisha Neno</p>
          <div className="sl-drills">
            {fillBlanks.map((drill, idx) => {
              const value = fillAnswers[idx] ?? "";
              const ok = value.trim().toUpperCase() === drill.answer.toUpperCase();
              return (
                <div key={`${drill.template}-${idx}`} className="sl-drill-card">
                  <p className="sl-clue">{drill.clue_sw}</p>
                  <p className="sl-template">{drill.template}</p>
                  <input
                    className="sl-input"
                    value={value}
                    onChange={(e) => setFillAnswers((prev) => ({ ...prev, [idx]: e.target.value }))}
                    maxLength={2}
                  />
                  <span className={`sl-result ${ok ? "sl-result--ok" : ""}`}>{ok ? "Sahihi" : "Endelea"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {currentDigraph && (
        <div className="sl-block">
          <p className="sl-block-title">Digraphs: {currentDigraph.label} ({currentDigraph.phonetic_sw})</p>
          <div className="sl-focus-card">
            <div className="sl-chips">
              {currentDigraph.items.map((item) => {
                const id = `digraph-${currentDigraph.label}-${item.word}`;
                const active = playingId === id;
                return (
                  <button key={id} className={`sl-chip ${active ? "sl-chip--active" : ""}`} onClick={() => playAudio(id, item.audio_en, item.word)}>
                    {item.word} ({item.phonetic_sw}) - {item.translation_sw}
                  </button>
                );
              })}
            </div>
            <div className="sl-nav">
              <button className="sl-nav-btn" onClick={() => setDigraphIdx((v) => Math.max(0, v - 1))} disabled={digraphIdx === 0}>←</button>
              <span className="sl-nav-label">{digraphIdx + 1} / {digraphs.length}</span>
              <button className="sl-nav-btn" onClick={() => setDigraphIdx((v) => Math.min(digraphs.length - 1, v + 1))} disabled={digraphIdx >= digraphs.length - 1}>→</button>
            </div>
          </div>
        </div>
      )}

      {currentBlend && (
        <div className="sl-block">
          <p className="sl-block-title">Ending Blends: {currentBlend.label} ({currentBlend.phonetic_sw})</p>
          <div className="sl-focus-card">
            <div className="sl-chips">
              {currentBlend.items.map((item) => {
                const id = `blend-${currentBlend.label}-${item.word}`;
                const active = playingId === id;
                return (
                  <button key={id} className={`sl-chip ${active ? "sl-chip--active" : ""}`} onClick={() => playAudio(id, item.audio_en, item.word)}>
                    {item.word} ({item.phonetic_sw}) - {item.translation_sw}
                  </button>
                );
              })}
            </div>
            <div className="sl-nav">
              <button className="sl-nav-btn" onClick={() => setBlendIdx((v) => Math.max(0, v - 1))} disabled={blendIdx === 0}>←</button>
              <span className="sl-nav-label">{blendIdx + 1} / {blends.length}</span>
              <button className="sl-nav-btn" onClick={() => setBlendIdx((v) => Math.min(blends.length - 1, v + 1))} disabled={blendIdx >= blends.length - 1}>→</button>
            </div>
          </div>
        </div>
      )}

      {currentPair && (
        <div className="sl-block">
          <p className="sl-block-title">Tofauti Muhimu (Minimal Pair)</p>
          <div className="sl-focus-card">
            <p className="sl-pair-main">
              <span>{currentPair.left} ({currentPair.left_phonetic_sw})</span>
              <span className="sl-pair-arrow">vs</span>
              <span>{currentPair.right} ({currentPair.right_phonetic_sw})</span>
            </p>
            <p className="sl-clue">{currentPair.note_sw}</p>
            <div className="sl-row-actions">
              <button className="sl-mini-btn" onClick={() => void playAudio(`pair-left-${pairIdx}`, currentPair.audio_left_en, currentPair.left)}>🔊 {currentPair.left}</button>
              <button className="sl-mini-btn" onClick={() => void playAudio(`pair-right-${pairIdx}`, currentPair.audio_right_en, currentPair.right)}>🔊 {currentPair.right}</button>
            </div>
            <div className="sl-nav">
              <button className="sl-nav-btn" onClick={() => setPairIdx((v) => Math.max(0, v - 1))} disabled={pairIdx === 0}>←</button>
              <span className="sl-nav-label">{pairIdx + 1} / {minimalPairs.length}</span>
              <button className="sl-nav-btn" onClick={() => setPairIdx((v) => Math.min(minimalPairs.length - 1, v + 1))} disabled={pairIdx >= minimalPairs.length - 1}>→</button>
            </div>
          </div>
        </div>
      )}

      {recordTargets.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Voice Recording Activity</p>
          {currentRecordTarget && (
            <div className="sl-focus-card">
              <p className="sl-focus-main">{currentRecordTarget.word}</p>
              <p className="sl-focus-sub">({currentRecordTarget.phonetic_sw})</p>
              <p className="sl-clue">{currentRecordTarget.cue_sw}</p>
              <div className="sl-row-actions">
                {!isRecording ? (
                  <button className="sl-mini-btn" onClick={() => void startRecording()}>⏺ Record</button>
                ) : (
                  <button className="sl-mini-btn sl-mini-btn--warn" onClick={stopRecording}>⏹ Stop</button>
                )}
                <button className="sl-mini-btn" onClick={() => void playPrompt(`target-${recordingTargetIdx}`, currentRecordTarget.word)}>🔊 Sofia</button>
                <button className="sl-mini-btn" onClick={() => checkPronunciationWithTranscript(currentRecordTarget.word)} disabled={isRecognizing}>
                  {isRecognizing ? "Listening..." : "Check Pronunciation"}
                </button>
              </div>
              {recordedUrl && (
                <div className="sl-record-box">
                  <audio controls src={recordedUrl} />
                  <p className="sl-record-score">AI similarity score (beta): {recordingScore()}%</p>
                </div>
              )}
              {recognizedText && (
                <div className="sl-record-box">
                  <p className="sl-record-score">Transcript: {recognizedText}</p>
                  {recognitionScore !== null ? <p className="sl-record-score">Pronunciation match: {recognitionScore}%</p> : null}
                </div>
              )}
              <div className="sl-nav">
                <button className="sl-nav-btn" onClick={() => setRecordingTargetIdx((v) => Math.max(0, v - 1))} disabled={recordingTargetIdx === 0}>←</button>
                <span className="sl-nav-label">{recordingTargetIdx + 1} / {recordTargets.length}</span>
                <button className="sl-nav-btn" onClick={() => setRecordingTargetIdx((v) => Math.min(recordTargets.length - 1, v + 1))} disabled={recordingTargetIdx >= recordTargets.length - 1}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {mouthGuides.length > 0 && (
        <div className="sl-block">
          <p className="sl-block-title">Visual Mouth Guide</p>
          <div className="sl-guides">
            {mouthGuides.map((g) => (
              <div key={g.sound} className="sl-guide-card">
                <p className="sl-guide-sound">{g.sound}</p>
                <div className="sl-mouth-visual" aria-hidden="true">
                  <span className="sl-mouth-teeth" />
                  <span className="sl-mouth-tongue" />
                </div>
                <p className="sl-clue">{showSwahili ? g.tip_sw : g.tip_en}</p>
                {g.media_url ? <img src={g.media_url} alt={`${g.sound} mouth guide`} className="sl-guide-media" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="lr-complete-btn" onClick={markDone}>✅ Nimekamilisha Somo la Sauti — Endelea →</button>

      <style>{`
        .sl-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .sl-block {
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 0.8rem;
          padding: 0.8rem;
        }
        .sl-block-title { margin: 0; font-size: 0.84rem; color: #cbd5e1; font-weight: 800; }
        .sl-focus-card {
          border: 1px solid rgba(52,211,153,0.2);
          background: rgba(52,211,153,0.06);
          border-radius: 0.72rem;
          padding: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        .sl-focus-main { margin: 0; font-size: 1.28rem; font-weight: 900; color: #34d399; }
        .sl-focus-sub { margin: 0; font-size: 0.78rem; color: #64748b; }
        .sl-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
        .sl-chip {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,23,42,0.38);
          color: #cbd5e1;
          border-radius: 999px;
          padding: 0.33rem 0.62rem;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .sl-chip--active { border-color: rgba(52,211,153,0.34); color: #34d399; }
        .sl-nav { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; margin-top: 0.15rem; }
        .sl-nav-btn {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #cbd5e1;
          border-radius: 0.45rem;
          padding: 0.25rem 0.62rem;
          font-size: 0.72rem;
          cursor: pointer;
        }
        .sl-nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .sl-nav-label { font-size: 0.72rem; color: #64748b; }
        .sl-pairs, .sl-drills, .sl-guides { display: flex; flex-direction: column; gap: 0.55rem; }
        .sl-pair-row {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          border-radius: 0.62rem;
          padding: 0.58rem 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.34rem;
        }
        .sl-pair-main { margin: 0; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #e2e8f0; }
        .sl-pair-arrow { color: #34d399; font-weight: 800; }
        .sl-pair-note { margin: 0; font-size: 0.74rem; color: #64748b; }
        .sl-mini-btn {
          border: 1px solid rgba(52,211,153,0.28);
          background: rgba(52,211,153,0.08);
          color: #34d399;
          border-radius: 0.42rem;
          padding: 0.3rem 0.62rem;
          font-size: 0.73rem;
          font-weight: 700;
          cursor: pointer;
          width: fit-content;
        }
        .sl-mini-btn--active { box-shadow: 0 0 0 1px rgba(52,211,153,0.25), 0 0 10px rgba(52,211,153,0.22); }
        .sl-mini-btn--warn { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.1); color: #fca5a5; }
        .sl-drill-card {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.62rem;
          padding: 0.62rem;
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
          background: rgba(255,255,255,0.015);
        }
        .sl-drill-options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .sl-drill-opt {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.03);
          color: #cbd5e1;
          border-radius: 0.4rem;
          font-size: 0.74rem;
          padding: 0.3rem 0.58rem;
          cursor: pointer;
        }
        .sl-drill-opt--ok { border-color: rgba(74, 222, 128, 0.35); color: #4ade80; }
        .sl-drill-opt--bad { border-color: rgba(248, 113, 113, 0.35); color: #fca5a5; }
        .sl-template { margin: 0; font-size: 0.92rem; color: #e2e8f0; letter-spacing: 0.03em; }
        .sl-input {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,23,42,0.4);
          color: #e2e8f0;
          border-radius: 0.4rem;
          padding: 0.33rem 0.5rem;
          width: 70px;
          text-transform: uppercase;
          font-size: 0.78rem;
        }
        .sl-result { font-size: 0.73rem; color: #64748b; }
        .sl-result--ok { color: #4ade80; font-weight: 700; }
        .sl-clue { margin: 0; font-size: 0.75rem; color: #94a3b8; }
        .sl-row-actions { display: flex; gap: 0.45rem; flex-wrap: wrap; }
        .sl-record-box {
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 0.6rem;
          padding: 0.5rem;
          background: rgba(255,255,255,0.02);
        }
        .sl-record-score { margin: 0.4rem 0 0; font-size: 0.75rem; color: #93c5fd; }
        .sl-guides { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.55rem; }
        .sl-guide-card {
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 0.7rem;
          padding: 0.6rem;
          background: rgba(255,255,255,0.02);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .sl-guide-sound { margin: 0; font-size: 0.82rem; font-weight: 800; color: #fcd34d; }
        .sl-mouth-visual {
          height: 58px;
          border-radius: 999px;
          background: linear-gradient(180deg, #7f1d1d, #450a0a);
          position: relative;
          overflow: hidden;
        }
        .sl-mouth-teeth {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 76%;
          height: 12px;
          background: #f8fafc;
          border-radius: 999px;
          opacity: 0.95;
        }
        .sl-mouth-tongue {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 48%;
          height: 22px;
          background: #f43f5e;
          border-radius: 80% 80% 40% 40%;
        }
        .sl-guide-media { width: 100%; border-radius: 0.45rem; border: 1px solid rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

// ── Phonetic Card Section ──────────────────────────────────────────────────

function PhoneticCardSection({ lesson, showSwahili, onComplete, moduleNum }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  const fallbackLetter =
    lesson.letter ??
    String(lesson.title || "").match(/-\s*([A-Z])$/)?.[1] ??
    "A";

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="lr-section">
      <PhoneticCard
        letter={fallbackLetter}
        sounds={lesson.sounds!}
        professionalAssociation={lesson.professional_association}
        professionalAssociationSw={lesson.professional_association_sw}
        showSwahili={showSwahili}
      />
      <button className="lr-complete-btn" onClick={markDone}>
        ✅ Mark as Learned — Next Lesson →
      </button>
      <style>{`
        .lr-section { display: flex; flex-direction: column; gap: 1rem; }
        .lr-complete-btn {
          align-self: flex-start;
          padding: 0.6rem 1.2rem;
          background: rgba(52,211,153,0.1);
          border: 1.5px solid rgba(52,211,153,0.3);
          border-radius: 0.6rem;
          color: #34d399;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Alphabet Grid Section (Lesson 1) ───────────────────────────────────────

function AlphabetGridSection({ lesson, onComplete }: { lesson: LessonData; onComplete?: (id: string) => void }) {
  const rows = lesson.alphabet_rows ?? [];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopRequestedRef = useRef(false);
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [isListenAllRunning, setIsListenAllRunning] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  async function playAudio(url: string, key: string): Promise<void> {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(toAudioSrc(url) || "");
    audioRef.current = audio;
    setActiveAudioKey(key);

    await new Promise<void>((resolve) => {
      const done = () => {
        setActiveAudioKey((prev) => (prev === key ? null : prev));
        resolve();
      };

      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleListenAll() {
    if (isListenAllRunning) {
      stopRequestedRef.current = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setActiveAudioKey(null);
      setIsListenAllRunning(false);
      return;
    }

    stopRequestedRef.current = false;
    setIsListenAllRunning(true);

    for (const row of rows) {
      if (stopRequestedRef.current) break;
      await playAudio(row.audio_letter_en, `letter:${row.letter}`);
      if (stopRequestedRef.current) break;
      await delay(1000);
    }

    stopRequestedRef.current = false;
    setIsListenAllRunning(false);
    setActiveAudioKey(null);
  }

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="ag-wrap">
      <div className="ag-toolbar">
        <button className={`ag-listen-all ${isListenAllRunning ? "ag-listen-all--active" : ""}`} onClick={handleListenAll}>
          {isListenAllRunning ? "⏹ Simamisha" : "▶ Sikiliza Zote"}
        </button>
        <span className="ag-toolbar-note">Inasoma herufi A hadi Z, kusubiri sekunde 1 kati ya kila herufi.</span>
      </div>

      <div className="ag-table-wrap">
        <table className="ag-table">
          <thead>
            <tr>
              <th>Herufi</th>
              <th>Tamshi</th>
              <th>Mfano wa Neno</th>
              <th>Tafsiri (Kiswahili)</th>
              <th>Sauti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const letterKey = `letter:${row.letter}`;
              const wordKey = `word:${row.letter}`;
              const letterActive = activeAudioKey === letterKey || activeAudioKey === wordKey;
              const wordActive = activeAudioKey === wordKey;

              return (
                <tr key={row.letter}>
                  <td>
                    <div className={`ag-letter ${letterActive ? "ag-letter--active" : ""}`}>{row.letter}</div>
                    <div className="ag-bridge">({row.letter_phonetic_sw})</div>
                  </td>
                  <td>
                    <span className="ag-phonetic">({row.letter_phonetic_sw})</span>
                  </td>
                  <td>
                    <button className={`ag-word-btn ${wordActive ? "ag-word-btn--active" : ""}`} onClick={() => void playAudio(row.audio_example_en, wordKey)}>
                      {row.example_word_en} ({row.example_phonetic_sw})
                    </button>
                  </td>
                  <td>{row.translation_sw}</td>
                  <td>
                    <div className="ag-audio-actions">
                      <button className="ag-audio-btn" onClick={() => void playAudio(row.audio_letter_en, letterKey)} aria-label={`Cheza sauti ya herufi ${row.letter}`}>
                        {letterActive ? "⏸" : "🔊"}
                      </button>
                      <button className="ag-audio-btn" onClick={() => void playAudio(row.audio_example_en, wordKey)} aria-label={`Cheza sauti ya neno ${row.example_word_en}`}>
                        {wordActive ? "⏸" : "🔊"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="lr-complete-btn" onClick={markDone}>✅ Nimemaliza Somo la Alfabeti — Endelea →</button>

      <style>{`
        .ag-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .ag-toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .ag-listen-all {
          border: 1px solid rgba(52,211,153,0.35);
          background: rgba(52,211,153,0.12);
          color: #34d399;
          border-radius: 0.5rem;
          padding: 0.45rem 0.9rem;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ag-listen-all--active {
          border-color: rgba(248,113,113,0.35);
          background: rgba(248,113,113,0.1);
          color: #fca5a5;
        }
        .ag-toolbar-note { font-size: 0.74rem; color: #64748b; }
        .ag-table-wrap {
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          background: rgba(255,255,255,0.02);
        }
        .ag-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }
        .ag-table th,
        .ag-table td {
          text-align: left;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 0.6rem 0.7rem;
          vertical-align: middle;
          font-size: 0.82rem;
          color: #cbd5e1;
        }
        .ag-table th {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #64748b;
          background: rgba(255,255,255,0.02);
        }
        .ag-letter {
          font-size: 1.15rem;
          font-weight: 900;
          color: #e2e8f0;
          line-height: 1;
          width: fit-content;
          padding: 0.05rem 0.35rem;
          border-radius: 0.3rem;
        }
        .ag-letter--active {
          color: #34d399;
          background: rgba(52,211,153,0.15);
          box-shadow: 0 0 0 1px rgba(52,211,153,0.25), 0 0 12px rgba(52,211,153,0.35);
        }
        .ag-bridge {
          font-size: 0.68rem;
          color: #64748b;
          margin-top: 0.2rem;
          font-style: italic;
        }
        .ag-phonetic {
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .ag-word-btn {
          border: none;
          background: transparent;
          color: #c7d2fe;
          padding: 0;
          cursor: pointer;
          font-size: 0.82rem;
          text-align: left;
        }
        .ag-word-btn:hover { text-decoration: underline; }
        .ag-word-btn--active {
          color: #34d399;
          text-decoration: underline;
          font-weight: 700;
        }
        .ag-audio-actions { display: flex; align-items: center; gap: 0.35rem; }
        .ag-audio-btn {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 999px;
          border: 1px solid rgba(52,211,153,0.35);
          background: rgba(52,211,153,0.08);
          color: #34d399;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          line-height: 1;
        }
        .ag-audio-btn:hover { background: rgba(52,211,153,0.15); }
        .lr-complete-btn {
          align-self: flex-start;
          padding: 0.6rem 1.2rem;
          background: rgba(52,211,153,0.1);
          border: 1.5px solid rgba(52,211,153,0.3);
          border-radius: 0.6rem;
          color: #34d399;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Lesson Card (Grammar) ──────────────────────────────────────────────────

function LessonCardSection({ lesson, showSwahili, onComplete, moduleNum }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  function markDone() { completeLesson(lesson.id); onComplete?.(lesson.id); }

  return (
    <div className="lc-wrap">
      {/* Content items */}
      {lesson.content?.map((c, i) => (
        <div key={i} className="lc-block">
          <div className="lc-label">{showSwahili ? c.label_sw : c.label}</div>
          <p className="lc-explanation">{showSwahili ? c.explanation_sw : c.explanation}</p>
          <AudioEngine spokenText={c.explanation} size="sm" />
          <div className="lc-examples">
            {c.examples.map((ex, j) => (
              <span key={j} className="lc-pill">{ex}{showSwahili && c.examples_sw?.[j] ? ` · ${c.examples_sw[j]}` : ""} <AudioEngine spokenText={ex} size="sm" /></span>
            ))}
          </div>
        </div>
      ))}

      {/* Common mistakes */}
      {lesson.common_mistakes?.map((m, i) => (
        <div key={i} className="lc-mistake">
          <div className="lc-mistake-wrong">❌ {m.wrong}</div>
          <div className="lc-mistake-right">✅ {m.right}</div>
          <AudioEngine spokenText={m.right} size="sm" />
          <p className="lc-mistake-exp">{showSwahili ? m.explanation_sw : m.explanation}</p>
        </div>
      ))}

      {/* Formula */}
      {lesson.formula && (
        <div className="lc-formula">
          <span className="lc-formula-label">Formula:</span>{" "}
          {showSwahili && lesson.formula_sw ? lesson.formula_sw : lesson.formula}
        </div>
      )}

      {/* Practice sentences / examples */}
      {(lesson.practice_sentences ?? lesson.examples)?.map((ex: { en: string; sw: string }, i: number) => (
        <div key={i} className="lc-sentence">
          <span className="lc-sentence-en">{ex.en}</span>
          <AudioEngine spokenText={ex.en} size="sm" />
          {showSwahili && <span className="lc-sentence-sw">{ex.sw}</span>}
        </div>
      ))}

      <button className="lr-complete-btn" onClick={markDone}>✅ Got it — Next Lesson →</button>

      <style>{`
        .lc-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .lc-block { background: rgba(255,255,255,0.03); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(255,255,255,0.06); }
        .lc-label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #34d399; margin-bottom: 0.35rem; }
        .lc-explanation { font-size: 0.9rem; color: #94a3b8; margin: 0 0 0.5rem; }
        .lc-examples { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .lc-pill { font-size: 0.8rem; color: #e2e8f0; background: rgba(255,255,255,0.06); border-radius: 999px; padding: 0.2rem 0.6rem; }
        .lc-mistake { background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.12); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .lc-mistake-wrong { font-size: 0.88rem; color: #f87171; }
        .lc-mistake-right { font-size: 0.88rem; color: #4ade80; }
        .lc-mistake-exp { font-size: 0.8rem; color: #64748b; margin: 0.25rem 0 0; }
        .lc-formula { font-size: 0.9rem; font-weight: 700; color: #818cf8; background: rgba(129,140,248,0.08); border-radius: 0.5rem; padding: 0.6rem 1rem; }
        .lc-formula-label { color: #64748b; font-weight: 400; }
        .lc-sentence { background: rgba(255,255,255,0.03); border-radius: 0.5rem; padding: 0.6rem 0.85rem; display: flex; flex-direction: column; gap: 0.15rem; }
        .lc-sentence-en { font-size: 0.88rem; color: #e2e8f0; }
        .lc-sentence-sw { font-size: 0.78rem; color: #64748b; font-style: italic; }
        .lr-complete-btn {
          align-self: flex-start;
          padding: 0.6rem 1.2rem;
          background: rgba(52,211,153,0.1);
          border: 1.5px solid rgba(52,211,153,0.3);
          border-radius: 0.6rem;
          color: #34d399;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Vocabulary Grid ────────────────────────────────────────────────────────

function VocabularyGridSection({ lesson, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  const words = lesson.words ?? [];
  const [isListenAllRunning, setIsListenAllRunning] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const stopRequestedRef = useRef(false);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    for (const word of words) {
      if (!word.audio_url || cacheRef.current.has(word.audio_url)) continue;
      const audio = new Audio(toAudioSrc(word.audio_url) || "");
      audio.preload = "auto";
      audio.load();
      cacheRef.current.set(word.audio_url, audio);
    }
  }, [words]);

  function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async function playWord(word: VocabWord): Promise<void> {
    if (!word.audio_url) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        warmSofiaVoices();
        const utterance = createSofiaUtterance(word.word, { lang: "en-US", rate: 0.92 });
        utterance.onstart = () => setPlayingWord(word.word);
        utterance.onend = () => setPlayingWord((prev) => (prev === word.word ? null : prev));
        utterance.onerror = () => setPlayingWord((prev) => (prev === word.word ? null : prev));
        window.speechSynthesis.speak(utterance);
      }
      return;
    }
    for (const audio of cacheRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    const audio = cacheRef.current.get(word.audio_url) ?? new Audio(toAudioSrc(word.audio_url) || "");
    cacheRef.current.set(word.audio_url, audio);
    setPlayingWord(word.word);
    await new Promise<void>((resolve) => {
      const done = () => {
        setPlayingWord((prev) => (prev === word.word ? null : prev));
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  async function handleListenAll() {
    if (isListenAllRunning) {
      stopRequestedRef.current = true;
      setIsListenAllRunning(false);
      setPlayingWord(null);
      return;
    }

    stopRequestedRef.current = false;
    setIsListenAllRunning(true);
    for (const word of words) {
      if (stopRequestedRef.current) break;
      await playWord(word);
      if (stopRequestedRef.current) break;
      await delay(1000);
    }
    setIsListenAllRunning(false);
    setPlayingWord(null);
  }

  function markDone() { completeLesson(lesson.id); onComplete?.(lesson.id); }

  return (
    <div className="vg-wrap">
      <div className="vg-toolbar">
        <button className={`vg-listen-all ${isListenAllRunning ? "vg-listen-all--active" : ""}`} onClick={() => void handleListenAll()}>
          {isListenAllRunning ? "⏹ Simamisha" : "▶ Sikiliza Zote"}
        </button>
      </div>
      {/* WordCard — phonetics always visible, Swahili always shown */}
      <div className="vg-grid">
        {words.map((w) => (
          <div key={w.word} className={`vg-item ${playingWord === w.word ? "vg-item--active" : ""}`}>
            <WordCard
              word={w.word}
              sw={w.sw}
              emoji={w.emoji}
              audioUrl={w.audio_url}
              variant="card"
            />
            {w.example && (
              <p className="vg-example">&ldquo;{w.example}&rdquo; <AudioEngine spokenText={w.example} size="sm" /></p>
            )}
          </div>
        ))}
      </div>
      <button className="lr-complete-btn" onClick={markDone}>✅ Imejifunza — Endelea →</button>
      <style>{`
        .vg-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .vg-toolbar { display: flex; justify-content: flex-start; }
        .vg-listen-all { border: 1px solid rgba(52,211,153,0.35); background: rgba(52,211,153,0.12); color: #34d399; border-radius: 0.5rem; padding: 0.35rem 0.8rem; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .vg-listen-all--active { border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.1); color: #fca5a5; }
        .vg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; }
        .vg-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .vg-item--active { outline: 1px solid rgba(52,211,153,0.4); border-radius: 0.8rem; box-shadow: 0 0 0 1px rgba(52,211,153,0.2), 0 0 12px rgba(52,211,153,0.18); }
        .vg-example { font-size: 0.68rem; color: #475569; margin: 0; line-height: 1.4; text-align: center; font-style: italic; padding: 0 0.25rem; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Number Builder ─────────────────────────────────────────────────────────

function NumberBuilderSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  const [tens, setTens] = useState<{ value: number; word: string; sw: string } | null>(null);
  const [ones, setOnes] = useState<{ value: number; word: string; sw: string } | null>(null);

  const result = tens && ones ? `${tens.word}-${ones.word}` : tens ? tens.word : null;

  function markDone() { completeLesson(lesson.id); onComplete?.(lesson.id); }

  return (
    <div className="nb-wrap">
      <div className="nb-builder">
        {/* Tens */}
        <div className="nb-col">
          <p className="nb-col-label">Tens (Makumi)</p>
          <div className="nb-chips">
            {lesson.tens?.map((t) => (
              <button key={t.value} className={`nb-chip ${tens?.value === t.value ? "nb-chip--active" : ""}`} onClick={() => setTens(t)}>
                {t.word}<br /><span className="nb-chip-sw">{showSwahili ? t.sw : t.value}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Plus sign */}
        <div className="nb-plus">+</div>

        {/* Ones */}
        <div className="nb-col">
          <p className="nb-col-label">Ones (Moja hadi Tisa)</p>
          <div className="nb-chips">
            {lesson.ones?.map((o) => (
              <button key={o.value} className={`nb-chip ${ones?.value === o.value ? "nb-chip--active" : ""}`} onClick={() => setOnes(o)}>
                {o.word}<br /><span className="nb-chip-sw">{showSwahili ? o.sw : o.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="nb-result" aria-live="polite">
          <span className="nb-result-num">{tens!.value + (ones?.value ?? 0)}</span>
          <span className="nb-result-word">{result}</span>
        </div>
      )}

      {/* Time phrases */}
      {lesson.time_phrases && (
        <div className="nb-phrases">
          <p className="nb-phrases-label">Time Phrases (Maneno ya Wakati)</p>
          {lesson.time_phrases.map((p) => (
            <div key={p.en} className="nb-phrase-row">
              <span className="nb-phrase-en">{p.en}</span>
              <AudioEngine spokenText={p.en} size="sm" />
              {showSwahili && <span className="nb-phrase-sw">{p.sw}</span>}
            </div>
          ))}
        </div>
      )}

      <button className="lr-complete-btn" onClick={markDone}>✅ Numbers Mastered →</button>

      <style>{`
        .nb-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
        .nb-builder { display: flex; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .nb-col { flex: 1; min-width: 160px; }
        .nb-col-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 0.5rem; }
        .nb-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .nb-chip { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.5rem; padding: 0.4rem 0.7rem; font-size: 0.8rem; color: #94a3b8; cursor: pointer; transition: all 0.15s; text-align: center; }
        .nb-chip:hover { border-color: rgba(52,211,153,0.3); color: #e2e8f0; }
        .nb-chip--active { border-color: #34d399; color: #34d399; background: rgba(52,211,153,0.08); }
        .nb-chip-sw { font-size: 0.65rem; color: #475569; }
        .nb-plus { font-size: 1.5rem; color: #334155; padding-top: 1.5rem; }
        .nb-result { display: flex; align-items: center; gap: 1rem; background: rgba(52,211,153,0.06); border: 1.5px solid rgba(52,211,153,0.2); border-radius: 0.75rem; padding: 1rem 1.25rem; }
        .nb-result-num { font-size: 2.5rem; font-weight: 900; color: #34d399; line-height: 1; }
        .nb-result-word { font-size: 1.1rem; font-weight: 700; color: #e2e8f0; }
        .nb-phrases { display: flex; flex-direction: column; gap: 0.4rem; }
        .nb-phrases-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 0.4rem; }
        .nb-phrase-row { display: flex; gap: 1rem; align-items: center; background: rgba(255,255,255,0.02); border-radius: 0.4rem; padding: 0.4rem 0.75rem; }
        .nb-phrase-en { font-size: 0.85rem; color: #e2e8f0; flex: 1; }
        .nb-phrase-sw { font-size: 0.78rem; color: #64748b; font-style: italic; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Noun Lab ─────────────────────────────────────────────────────────────

function NounLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const tabs = lesson.noun_tabs ?? [];
  const pluralPairs = lesson.plural_pairs ?? [];
  const matchItems = lesson.match_game ?? [];
  const sentences = lesson.sentence_examples ?? [];
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "home");
  const [pluralOn, setPluralOn] = useState(false);
  const [droppedWord, setDroppedWord] = useState<string>("");
  const [dropState, setDropState] = useState<"idle" | "ok" | "bad">("idle");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const currentTab = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    const urls = [
      ...tabs.flatMap((tab) => tab.items.map((item) => item.audio_en)),
      ...pluralPairs.flatMap((pair) => [pair.audio_plural_en, pair.audio_singular_en]),
      ...sentences.map((item) => item.audio_en ?? ""),
    ].filter(Boolean);
    for (const url of urls) {
      if (cacheRef.current.has(url)) continue;
      const audio = new Audio(toAudioSrc(url) || "");
      audio.preload = "auto";
      audio.load();
      cacheRef.current.set(url, audio);
    }
  }, [tabs, pluralPairs, sentences]);

  function stopAll() {
    for (const audio of cacheRef.current.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  async function play(id: string, audioUrl: string, spoken: string) {
    stopAll();
    if (!audioUrl) {
      const utterance = createSofiaUtterance(spoken, { lang: "en-US", rate: 0.92 });
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
      window.speechSynthesis.speak(utterance);
      return;
    }
    const audio = cacheRef.current.get(audioUrl) ?? new Audio(toAudioSrc(audioUrl) || "");
    cacheRef.current.set(audioUrl, audio);
    audio.onended = () => setPlayingId((prev) => (prev === id ? null : prev));
    audio.onerror = () => {
      const utterance = createSofiaUtterance(spoken, { lang: "en-US", rate: 0.92 });
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
      window.speechSynthesis.speak(utterance);
    };
    try {
      audio.currentTime = 0;
      setPlayingId(id);
      await audio.play();
    } catch {
      const utterance = createSofiaUtterance(spoken, { lang: "en-US", rate: 0.92 });
      utterance.onstart = () => setPlayingId(id);
      utterance.onend = () => setPlayingId((prev) => (prev === id ? null : prev));
      window.speechSynthesis.speak(utterance);
    }
  }

  function onDropWord(event: { preventDefault: () => void; dataTransfer: DataTransfer }, targetEmoji: string) {
    event.preventDefault();
    const word = event.dataTransfer.getData("text/plain");
    setDroppedWord(word);
    const matched = matchItems.find((item) => item.word === word);
    if (matched?.target_emoji === targetEmoji) {
      setDropState("ok");
    } else {
      setDropState("bad");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = createSofiaUtterance("Jaribu tena", { lang: "sw-TZ", rate: 0.95 });
        window.speechSynthesis.speak(utterance);
      }
    }
  }

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="nl-wrap">
      <div className="nl-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`nl-tab ${tab.id === activeTab ? "nl-tab--active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            {showSwahili ? tab.label_sw : tab.label_en}
          </button>
        ))}
      </div>

      <div className="nl-grid">
        {currentTab?.items.map((item) => {
          const id = `noun-${item.word}`;
          return (
            <div key={item.word} className={`nl-card ${playingId === id ? "nl-card--active" : ""}`}>
              <p className="nl-emoji">{item.emoji}</p>
              <p className="nl-word">{item.word}</p>
              <p className="nl-ph">({item.phonetic_sw})</p>
              <p className="nl-sw">{item.translation_sw}</p>
              <button className="nl-audio" onClick={() => void play(id, item.audio_en, item.word)}>🔊</button>
            </div>
          );
        })}
      </div>

      {pluralPairs.length > 0 && (
        <div className="nl-block">
          <div className="nl-switch-row">
            <p className="nl-title">Umoja na Wingi</p>
            <button className={`nl-switch ${pluralOn ? "nl-switch--on" : ""}`} onClick={() => setPluralOn((v) => !v)}>
              {pluralOn ? "Wengi ON" : "Wengi OFF"}
            </button>
          </div>
          {pluralPairs.map((pair, idx) => {
            const usePlural = pluralOn;
            const spoken = usePlural ? `${pair.plural}` : `${pair.singular}`;
            const audio = usePlural ? pair.audio_plural_en : pair.audio_singular_en;
            return (
              <div key={`${pair.singular}-${idx}`} className="nl-plural-row">
                <div className="nl-plural-visual">{Array.from({ length: usePlural ? pair.plural_count : pair.singular_count }).map((_, i) => <span key={i}>📘</span>)}</div>
                <p className="nl-plural-text">
                  {usePlural ? `${pair.plural_count} ${pair.plural} (${pair.plural_phonetic_sw})` : `${pair.singular_count} ${pair.singular} (${pair.singular_phonetic_sw})`}
                </p>
                <p className="nl-sw">{pair.translation_sw}</p>
                <button className="nl-audio" onClick={() => void play(`plural-${idx}`, audio, spoken)}>🔊</button>
              </div>
            );
          })}
        </div>
      )}

      {sentences.length > 0 && (
        <div className="nl-block">
          <p className="nl-title">Mazoezi ya Sentensi</p>
          {sentences.map((item, idx) => (
            <div key={idx} className="nl-sentence-row">
              <div>
                <p className="nl-word">{item.en}</p>
                <p className="nl-ph">({item.phonetic_sw})</p>
                <p className="nl-sw">{item.sw}</p>
              </div>
              <AudioEngine audioUrl={item.audio_en} spokenText={item.en} size="sm" />
            </div>
          ))}
        </div>
      )}

      {matchItems.length > 0 && (
        <div className="nl-block">
          <p className="nl-title">Visual Matching Game</p>
          <div className="nl-drag-bank">
            {matchItems.map((item) => (
              <div
                key={item.word}
                className="nl-drag-word"
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", item.word)}
              >
                {item.word}
              </div>
            ))}
          </div>
          <div className="nl-drop-zones">
            {Array.from(new Set(matchItems.map((item) => item.target_emoji))).map((emoji) => (
              <div
                key={emoji}
                className="nl-drop"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDropWord(event, emoji)}
              >
                <span className="nl-emoji">{emoji}</span>
              </div>
            ))}
          </div>
          {dropState === "ok" ? <p className="nl-ok">Sahihi: {droppedWord}</p> : null}
          {dropState === "bad" ? <p className="nl-bad">Jaribu tena</p> : null}
        </div>
      )}

      <button className="lr-complete-btn" onClick={markDone}>✅ Nimekamilisha Majina ya Vitu — Endelea →</button>

      <style>{`
        .nl-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .nl-tabs { display: flex; gap: 0.45rem; flex-wrap: wrap; }
        .nl-tab { border: 1px solid rgba(148,163,184,0.24); background: rgba(148,163,184,0.08); color: #94a3b8; border-radius: 999px; padding: 0.33rem 0.75rem; font-size: 0.76rem; cursor: pointer; }
        .nl-tab--active { border-color: rgba(52,211,153,0.35); color: #34d399; background: rgba(52,211,153,0.14); }
        .nl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.55rem; }
        .nl-card { border: 1px solid rgba(255,255,255,0.08); border-radius: 0.65rem; padding: 0.55rem; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.2rem; align-items: center; }
        .nl-card--active { border-color: rgba(52,211,153,0.36); box-shadow: 0 0 0 1px rgba(52,211,153,0.2), 0 0 10px rgba(52,211,153,0.2); }
        .nl-emoji { margin: 0; font-size: 1.2rem; }
        .nl-word { margin: 0; font-size: 0.84rem; color: #e2e8f0; font-weight: 700; }
        .nl-ph { margin: 0; font-size: 0.73rem; color: #93c5fd; }
        .nl-sw { margin: 0; font-size: 0.74rem; color: #94a3b8; }
        .nl-audio { border: 1px solid rgba(52,211,153,0.28); background: rgba(52,211,153,0.08); color: #34d399; border-radius: 0.4rem; padding: 0.2rem 0.5rem; font-size: 0.72rem; cursor: pointer; }
        .nl-block { border: 1px solid rgba(255,255,255,0.08); border-radius: 0.7rem; padding: 0.7rem; background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 0.5rem; }
        .nl-title { margin: 0; font-size: 0.8rem; font-weight: 800; color: #cbd5e1; }
        .nl-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .nl-switch { border: 1px solid rgba(148,163,184,0.24); background: rgba(148,163,184,0.08); color: #94a3b8; border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.74rem; cursor: pointer; }
        .nl-switch--on { border-color: rgba(52,211,153,0.35); color: #34d399; background: rgba(52,211,153,0.14); }
        .nl-plural-row { border: 1px solid rgba(255,255,255,0.06); border-radius: 0.55rem; padding: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }
        .nl-plural-visual { min-width: 72px; display: flex; gap: 0.2rem; }
        .nl-plural-text { margin: 0; font-size: 0.8rem; color: #e2e8f0; }
        .nl-sentence-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; border: 1px solid rgba(255,255,255,0.06); border-radius: 0.55rem; padding: 0.5rem; }
        .nl-drag-bank { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .nl-drag-word { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); border-radius: 0.45rem; padding: 0.3rem 0.55rem; font-size: 0.76rem; color: #e2e8f0; cursor: grab; }
        .nl-drop-zones { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .nl-drop { width: 72px; height: 72px; border: 1px dashed rgba(148,163,184,0.35); border-radius: 0.55rem; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.35); }
        .nl-ok { margin: 0; font-size: 0.74rem; color: #4ade80; }
        .nl-bad { margin: 0; font-size: 0.74rem; color: #fca5a5; }
      `}</style>
    </div>
  );
}

// ── Adjective Lab ─────────────────────────────────────────────────────────

function AdjectiveLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const pairs = lesson.adjective_pairs ?? [];
  const orderItems = lesson.sentence_order_items ?? [];
  const moreExamples = lesson.more_examples ?? [];
  const translates = lesson.translate_exercises ?? [];
  const listenMatch = lesson.listen_match ?? [];
  const [hotCold, setHotCold] = useState<"hot" | "cold">("hot");
  const [wordOrder, setWordOrder] = useState<string[]>(["house", "big"]);
  const [orderFeedback, setOrderFeedback] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<number | null>(null);

  function swapWord(idxA: number, idxB: number) {
    setWordOrder((prev) => {
      const next = [...prev];
      [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
      return next;
    });
  }

  function validateOrder() {
    if (wordOrder.join(" ") === "big house") {
      setOrderFeedback(showSwahili ? "Sahihi!" : "Correct!");
      return;
    }
    setOrderFeedback(showSwahili ? "Katika Kiingereza, maelezo huja kwanza!" : "In English, the description comes first!");
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = createSofiaUtterance("Katika Kiingereza, maelezo huja kwanza", { lang: "sw-TZ", rate: 0.95 });
      window.speechSynthesis.speak(utterance);
    }
  }

  async function playConcat(adjective: string, noun: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    await new Promise<void>((resolve) => {
      const u1 = createSofiaUtterance(adjective, { lang: "en-US", rate: 0.92 });
      u1.onend = () => resolve();
      window.speechSynthesis.speak(u1);
    });
    await new Promise<void>((resolve) => {
      const u2 = createSofiaUtterance(noun, { lang: "en-US", rate: 0.92 });
      u2.onend = () => resolve();
      window.speechSynthesis.speak(u2);
    });
  }

  function markDone() {
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="al-wrap">
      {pairs.length > 0 && (
        <div className="al-block">
          <p className="al-title">Maneno ya Sifa (Opposites)</p>
          {pairs.map((pair) => (
            <div key={`${pair.left_word}-${pair.right_word}`} className="al-row">
              <div>
                <p className="al-main">{pair.left_word} ({pair.left_phonetic_sw}) - {pair.left_translation_sw}</p>
                <AudioEngine audioUrl={pair.left_audio_en} spokenText={pair.left_word} size="sm" />
              </div>
              <span className="al-arrow">↔</span>
              <div>
                <p className="al-main">{pair.right_word} ({pair.right_phonetic_sw}) - {pair.right_translation_sw}</p>
                <AudioEngine audioUrl={pair.right_audio_en} spokenText={pair.right_word} size="sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="al-block">
        <p className="al-title">Opposite Toggle</p>
        <div className="al-toggle-row">
          <div className={`al-cup ${hotCold === "hot" ? "al-cup--hot" : "al-cup--cold"}`}>
            {hotCold === "hot" ? <span className="al-steam">♨</span> : <span className="al-ice">🧊</span>}
          </div>
          <button className="al-btn" onClick={() => setHotCold("hot")}>Hot</button>
          <button className="al-btn" onClick={() => setHotCold("cold")}>Cold</button>
        </div>
      </div>

      {orderItems.length > 0 && (
        <div className="al-block">
          <p className="al-title">Word Order Validator</p>
          <p className="al-sw">{orderItems[0].sw}</p>
          <div className="al-word-order">
            {wordOrder.map((word, idx) => (
              <button key={word} className="al-word-chip" onClick={() => swapWord(idx, idx === 0 ? 1 : 0)}>{word}</button>
            ))}
          </div>
          <div className="al-row-actions">
            <button className="al-btn" onClick={validateOrder}>Check Order</button>
            <button className="al-btn" onClick={() => void playConcat(wordOrder[0], wordOrder[1])}>Play Together 🔊</button>
          </div>
          {orderFeedback ? <p className="al-feedback">{orderFeedback}</p> : null}
        </div>
      )}

      {moreExamples.length > 0 && (
        <div className="al-block">
          <p className="al-title">Mifano ya Zaidi</p>
          {moreExamples.map((item, idx) => {
            const parts = item.en.split(" ");
            return (
              <div key={idx} className="al-example-row">
                <p className="al-main">
                  <span className="al-adj">{parts[0] ?? ""}</span>{" "}
                  <span className="al-noun">{parts.slice(1).join(" ")}</span>
                  {` (${item.phonetic_sw})`}
                </p>
                <p className="al-sw">{item.sw}</p>
                <AudioEngine audioUrl={item.audio_en} spokenText={item.en} size="sm" />
              </div>
            );
          })}
        </div>
      )}

      {translates.length > 0 && (
        <div className="al-block">
          <p className="al-title">Tafsiri kwa Kiingereza</p>
          {translates.map((item, idx) => (
            <button key={idx} className={`al-translate ${selectedExercise === idx ? "al-translate--on" : ""}`} onClick={() => setSelectedExercise(idx)}>
              {item.sw}
              {selectedExercise === idx ? ` → ${item.answer_en}` : ""}
            </button>
          ))}
        </div>
      )}

      {listenMatch.length > 0 && (
        <div className="al-block">
          <p className="al-title">Sikiliza na Uunganishe</p>
          {listenMatch.map((item, idx) => (
            <div key={idx} className="al-row">
              <AudioEngine audioUrl={item.audio_en} spokenText={item.phrase_en} size="sm" label="Play" />
              <p className="al-main">{item.phrase_en}</p>
              <span className="al-emoji-pill">{item.answer_emoji}</span>
            </div>
          ))}
        </div>
      )}

      <button className="lr-complete-btn" onClick={markDone}>✅ Nimekamilisha Somo la Adjectives — Endelea →</button>

      <style>{`
        .al-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .al-block { border: 1px solid rgba(255,255,255,0.08); border-radius: 0.7rem; background: rgba(255,255,255,0.02); padding: 0.7rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .al-title { margin: 0; font-size: 0.82rem; color: #e2e8f0; font-weight: 800; }
        .al-row { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; border: 1px solid rgba(255,255,255,0.06); border-radius: 0.55rem; padding: 0.5rem; }
        .al-main { margin: 0; font-size: 0.8rem; color: #e2e8f0; }
        .al-sw { margin: 0; font-size: 0.75rem; color: #94a3b8; }
        .al-arrow { color: #34d399; font-weight: 800; }
        .al-toggle-row { display: flex; align-items: center; gap: 0.45rem; }
        .al-cup { width: 64px; height: 64px; border-radius: 0.6rem; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); }
        .al-cup--hot { box-shadow: inset 0 0 24px rgba(249,115,22,0.25); }
        .al-cup--cold { box-shadow: inset 0 0 24px rgba(59,130,246,0.22); }
        .al-steam { font-size: 1.2rem; color: #fb923c; }
        .al-ice { font-size: 1.2rem; }
        .al-btn { border: 1px solid rgba(52,211,153,0.3); background: rgba(52,211,153,0.08); color: #34d399; border-radius: 0.45rem; padding: 0.3rem 0.6rem; font-size: 0.73rem; cursor: pointer; }
        .al-word-order { display: flex; gap: 0.45rem; }
        .al-word-chip { border: 1px solid rgba(129,140,248,0.35); background: rgba(129,140,248,0.12); color: #c7d2fe; border-radius: 0.45rem; padding: 0.35rem 0.65rem; font-size: 0.76rem; cursor: pointer; }
        .al-row-actions { display: flex; gap: 0.45rem; }
        .al-feedback { margin: 0; font-size: 0.74rem; color: #fcd34d; }
        .al-example-row { border: 1px solid rgba(255,255,255,0.06); border-radius: 0.55rem; padding: 0.5rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .al-adj { color: #60a5fa; font-weight: 800; }
        .al-noun { color: #e2e8f0; font-weight: 700; }
        .al-translate { text-align: left; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: #cbd5e1; border-radius: 0.45rem; padding: 0.35rem 0.6rem; font-size: 0.76rem; cursor: pointer; }
        .al-translate--on { border-color: rgba(74,222,128,0.35); color: #86efac; }
        .al-emoji-pill { font-size: 1rem; background: rgba(255,255,255,0.06); border-radius: 999px; padding: 0.15rem 0.45rem; }
      `}</style>
    </div>
  );
}

// ── Multiple Choice (Assessment) ───────────────────────────────────────────

function MultipleChoiceSection({ lesson, moduleNum, showSwahili, onComplete, onGraduationGate }: { lesson: LessonData; moduleNum: number; showSwahili: boolean; onComplete?: (id: string) => void; onGraduationGate?: (score: number) => void }) {
  const questions = lesson.questions ?? [];
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? Math.round((answers.filter((a, i) => a === questions[i].correct).length / questions.length) * 100)
    : 0;

  const passed = score >= PASS_THRESHOLD;

  function submit() {
    if (answers.some((a) => a === null)) return;
    setSubmitted(true);
    saveAssessmentScore(moduleNum, score);
    if (!lesson.is_graduation_gate) {
      completeLesson(lesson.id);
      onComplete?.(lesson.id);
    } else if (lesson.is_graduation_gate) {
      onGraduationGate?.(score);
    }
  }

  function retry() {
    setAnswers(Array(questions.length).fill(null));
    setSubmitted(false);
  }

  return (
    <div className="mc-wrap">
      {questions.map((q, qi) => (
        <div key={qi} className="mc-question">
          <p className="mc-prompt">
            <span className="mc-num">Q{qi + 1}.</span> {showSwahili ? q.prompt_sw : q.prompt}
          </p>
          <AudioEngine spokenText={q.prompt} size="sm" />
          <div className="mc-options">
            {(showSwahili && q.options_sw ? q.options_sw : q.options).map((opt, oi) => {
              const chosen = answers[qi] === oi;
              let stateClass = "";
              if (submitted) {
                if (oi === q.correct) stateClass = "mc-opt--correct";
                else if (chosen) stateClass = "mc-opt--wrong";
              } else if (chosen) stateClass = "mc-opt--selected";

              return (
                <button
                  key={oi}
                  className={`mc-opt ${stateClass}`}
                  onClick={() => {
                    if (submitted) return;
                    const next = [...answers];
                    next[qi] = oi;
                    setAnswers(next);
                  }}
                  disabled={submitted}
                >
                  <span className="mc-opt-letter">{String.fromCharCode(65 + oi)}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted && (
        <button
          className="mc-submit-btn"
          onClick={submit}
          disabled={answers.some((a) => a === null)}
        >
          Submit Answers →
        </button>
      )}

      {submitted && (
        <div className={`mc-result ${passed ? "mc-result--pass" : "mc-result--fail"}`}>
          <span className="mc-result-icon">{passed ? "🏆" : "📚"}</span>
          <div>
            <p className="mc-result-score">Score: {score}%</p>
            <p className="mc-result-msg">
              {passed
                ? lesson.is_graduation_gate
                  ? "Outstanding! You are ready to Graduate."
                  : "Excellent! Module unlocked."
                : `You need ${PASS_THRESHOLD}% to pass. Review the lessons and try again!`}
            </p>
          </div>
          {!passed && (
            <button className="mc-retry-btn" onClick={retry}>Try Again</button>
          )}
        </div>
      )}

      <style>{`
        .mc-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .mc-question { display: flex; flex-direction: column; gap: 0.6rem; }
        .mc-prompt { font-size: 0.92rem; color: #e2e8f0; margin: 0; line-height: 1.5; }
        .mc-num { font-weight: 800; color: #818cf8; margin-right: 0.3rem; }
        .mc-options { display: flex; flex-direction: column; gap: 0.4rem; }
        .mc-opt { display: flex; align-items: center; gap: 0.6rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 0.6rem; padding: 0.55rem 0.9rem; font-size: 0.85rem; color: #94a3b8; cursor: pointer; text-align: left; transition: all 0.15s; }
        .mc-opt:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); color: #e2e8f0; }
        .mc-opt--selected { border-color: #818cf8; color: #c7d2fe; background: rgba(129,140,248,0.08); }
        .mc-opt--correct { border-color: #34d399; color: #6ee7b7; background: rgba(52,211,153,0.08); }
        .mc-opt--wrong { border-color: #f87171; color: #fca5a5; background: rgba(239,68,68,0.08); }
        .mc-opt-letter { font-size: 0.7rem; font-weight: 800; color: #475569; background: rgba(255,255,255,0.06); border-radius: 4px; padding: 0.1rem 0.35rem; flex-shrink: 0; }
        .mc-submit-btn { align-self: flex-start; padding: 0.65rem 1.4rem; background: #818cf8; border: none; border-radius: 0.6rem; color: #fff; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .mc-submit-btn:hover:not(:disabled) { background: #6366f1; }
        .mc-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .mc-result { display: flex; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: 0.9rem; }
        .mc-result--pass { background: rgba(52,211,153,0.08); border: 1.5px solid rgba(52,211,153,0.25); }
        .mc-result--fail { background: rgba(239,68,68,0.06); border: 1.5px solid rgba(239,68,68,0.2); }
        .mc-result-icon { font-size: 1.75rem; flex-shrink: 0; }
        .mc-result-score { font-size: 1rem; font-weight: 800; color: #e2e8f0; margin: 0 0 0.2rem; }
        .mc-result-msg { font-size: 0.82rem; color: #94a3b8; margin: 0; }
        .mc-retry-btn { margin-left: auto; padding: 0.4rem 0.9rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 0.5rem; color: #94a3b8; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
}

// ── Dialogue Section ───────────────────────────────────────────────────────

function DialogueSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  function markDone() { completeLesson(lesson.id); onComplete?.(lesson.id); }

  return (
    <div className="dl-wrap">
      {lesson.dialogues?.map((d, di) => (
        <div key={di} className="dl-dialogue">
          <p className="dl-dialogue-title">{showSwahili ? d.title_sw : d.title}</p>
          {d.lines.map((line, li) => {
            const isUser = line.speaker === "You";
            return (
              <div key={li} className={`dl-line ${isUser ? "dl-line--user" : "dl-line--sofia"}`}>
                <span className="dl-speaker">{line.speaker}</span>
                <div className="dl-bubble">
                  {/* Swahili-first: SW is primary, EN secondary */}
              <p className="dl-text">{showSwahili ? line.sw : line.en}</p>
                  {showSwahili && <p className="dl-text-en">{line.en}</p>}
                  <AudioEngine audioUrl={line.audio_url} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <button className="lr-complete-btn" onClick={markDone}>✅ Practice Complete →</button>
      <style>{`
        .dl-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .dl-dialogue { display: flex; flex-direction: column; gap: 0.75rem; }
        .dl-dialogue-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0; }
        .dl-line { display: flex; gap: 0.6rem; align-items: flex-start; }
        .dl-line--user { flex-direction: row-reverse; }
        .dl-speaker { font-size: 0.65rem; font-weight: 700; color: #475569; padding-top: 0.5rem; flex-shrink: 0; }
        .dl-bubble { background: rgba(255,255,255,0.04); border-radius: 0.75rem; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; max-width: 80%; }
        .dl-line--user .dl-bubble { background: rgba(129,140,248,0.08); border: 1px solid rgba(129,140,248,0.15); }
        .dl-line--sofia .dl-bubble { background: rgba(52,211,153,0.06); border: 1px solid rgba(52,211,153,0.15); }
        .dl-text { font-size: 0.88rem; color: #e2e8f0; margin: 0; }
        .dl-text-en { font-size: 0.75rem; color: #475569; margin: 0; font-style: italic; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── Listening Section ──────────────────────────────────────────────────────

function ListeningSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  const exercises = lesson.exercises ?? [];
  const [answers, setAnswers] = useState<(number | null)[]>(Array(exercises.length).fill(null));
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    setSubmitted(true);
    completeLesson(lesson.id);
    onComplete?.(lesson.id);
  }

  return (
    <div className="ls-wrap">
      {exercises.map((ex, i) => (
        <div key={i} className="ls-exercise">
          <AudioEngine audioUrl={ex.audio_url} label="Listen to clip" size="md" />
          {showSwahili && submitted && (
            <p className="ls-transcript-sw">{ex.transcript_sw}</p>
          )}
          {submitted && (
            <p className="ls-transcript">Transcript: &ldquo;{ex.transcript}&rdquo;</p>
          )}
          <p className="ls-question">{showSwahili ? ex.question_sw : ex.question}</p>
          <div className="ls-options">
            {ex.options.map((opt, oi) => {
              const chosen = answers[i] === oi;
              let cls = "";
              if (submitted) cls = oi === ex.correct ? "ls-opt--correct" : chosen ? "ls-opt--wrong" : "";
              else if (chosen) cls = "ls-opt--selected";
              return (
                <button key={oi} className={`ls-opt ${cls}`} onClick={() => { if (submitted) return; const n = [...answers]; n[i] = oi; setAnswers(n); }} disabled={submitted}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted && (
        <button className="mc-submit-btn" onClick={submit} disabled={answers.some(a => a === null)}>Submit →</button>
      )}
      {submitted && (
        <div className="ls-done">✅ Listening practice complete!</div>
      )}
      <style>{`
        .ls-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .ls-exercise { display: flex; flex-direction: column; gap: 0.6rem; background: rgba(255,255,255,0.02); border-radius: 0.75rem; padding: 1rem; border: 1px solid rgba(255,255,255,0.06); }
        .ls-transcript { font-size: 0.8rem; color: #475569; font-style: italic; margin: 0; }
        .ls-transcript-sw { font-size: 0.78rem; color: #334155; font-style: italic; margin: 0; }
        .ls-question { font-size: 0.9rem; font-weight: 600; color: #e2e8f0; margin: 0; }
        .ls-options { display: flex; flex-direction: column; gap: 0.4rem; }
        .ls-opt { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 0.5rem; padding: 0.45rem 0.85rem; font-size: 0.83rem; color: #94a3b8; cursor: pointer; text-align: left; transition: all 0.15s; }
        .ls-opt:hover:not(:disabled) { color: #e2e8f0; }
        .ls-opt--selected { border-color: #818cf8; color: #c7d2fe; }
        .ls-opt--correct { border-color: #34d399; color: #6ee7b7; }
        .ls-opt--wrong { border-color: #f87171; color: #fca5a5; }
        .mc-submit-btn { align-self: flex-start; padding: 0.65rem 1.4rem; background: #818cf8; border: none; border-radius: 0.6rem; color: #fff; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
        .mc-submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .ls-done { font-size: 0.9rem; color: #34d399; font-weight: 600; }
      `}</style>
    </div>
  );
}

// ── Speaking Prompts ───────────────────────────────────────────────────────

function SpeakingSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void; moduleNum: number }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  function markDone() { completeLesson(lesson.id); onComplete?.(lesson.id); }

  return (
    <div className="sp-wrap">
      {lesson.prompts?.map((p, i) => (
        <div key={i} className="sp-prompt">
          <p className="sp-question">🎤 {showSwahili ? p.question_sw : p.question}</p>
          <AudioEngine spokenText={p.question} size="sm" />
          {!revealed[i] ? (
            <button className="sp-reveal-btn" onClick={() => setRevealed(v => ({ ...v, [i]: true }))}>
              Show sample answer
            </button>
          ) : (
            <div className="sp-sample">
              <p className="sp-sample-label">Sample Answer:</p>
              <p className="sp-sample-en">{p.sample_answer}</p>
              <AudioEngine spokenText={p.sample_answer} size="sm" />
              {showSwahili && <p className="sp-sample-sw">{p.sample_answer_sw}</p>}
            </div>
          )}
        </div>
      ))}
      <button className="lr-complete-btn" onClick={markDone}>✅ Speaking Practice Done →</button>
      <style>{`
        .sp-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .sp-prompt { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
        .sp-question { font-size: 0.92rem; font-weight: 600; color: #e2e8f0; margin: 0; }
        .sp-reveal-btn { align-self: flex-start; font-size: 0.8rem; font-weight: 600; color: #818cf8; background: rgba(129,140,248,0.08); border: 1px solid rgba(129,140,248,0.2); border-radius: 0.4rem; padding: 0.3rem 0.7rem; cursor: pointer; }
        .sp-sample { display: flex; flex-direction: column; gap: 0.25rem; }
        .sp-sample-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0; }
        .sp-sample-en { font-size: 0.88rem; color: #34d399; margin: 0; }
        .sp-sample-sw { font-size: 0.78rem; color: #64748b; font-style: italic; margin: 0; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── PrepositionsLabSection ────────────────────────────────────────────────

function PrepositionsLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const preps = lesson.prepositions ?? [];
  const sentences = lesson.prep_sentences ?? [];
  const playground = lesson.live_playground;
  const fillBlanks = lesson.prep_fill_blanks ?? [];
  const translates = lesson.translate_exercises ?? [];

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activePos, setActivePos] = useState<string | null>(null);
  const [fillAnswers, setFillAnswers] = useState<string[]>(fillBlanks.map(() => ""));
  const [fillChecked, setFillChecked] = useState(false);
  const [transAnswers, setTransAnswers] = useState<string[]>(translates.map(() => ""));
  const [transChecked, setTransChecked] = useState(false);
  const [sofiaVisible, setSofiaVisible] = useState(false);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const urls = [
      ...preps.map(p => p.audio_en),
      ...sentences.map(s => s.audio_en),
      ...(playground?.positions.map(p => p.audio_en) ?? []),
    ].filter(Boolean);
    for (const url of urls) {
      if (!cacheRef.current.has(url)) {
        const a = new Audio(toAudioSrc(url) || ""); a.preload = "auto"; a.load();
        cacheRef.current.set(url, a);
      }
    }
  }, [preps, sentences, playground]);

  function stopAll() {
    cacheRef.current.forEach(a => { a.pause(); a.currentTime = 0; });
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakFallback(text: string, id: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setPlayingId(null); return; }
    warmSofiaVoices();
    const u = createSofiaUtterance(text);
    u.onstart = () => setPlayingId(id);
    u.onend = () => setPlayingId(p => p === id ? null : p);
    window.speechSynthesis.speak(u);
  }

  async function play(id: string, url: string, spoken: string) {
    stopAll();
    if (!url?.trim()) {
      speakFallback(spoken, id);
      return;
    }
    const audio = cacheRef.current.get(url) ?? new Audio(toAudioSrc(url) || "");
    cacheRef.current.set(url, audio);
    audio.onended = () => setPlayingId(p => p === id ? null : p);
    audio.onerror = () => speakFallback(spoken, id);
    try { audio.currentTime = 0; setPlayingId(id); await audio.play(); } catch { speakFallback(spoken, id); }
  }

  async function playPosition(pos: LivePlaygroundPosition) {
    setActivePos(pos.id);
    await play(`pos-${pos.id}`, pos.audio_en, pos.sentence_en);
  }

  function highlightPrep(sentence: string, prep: string) {
    const idx = sentence.toLowerCase().indexOf(` ${prep.toLowerCase()} `);
    if (idx === -1) return <span>{sentence}</span>;
    return (
      <>
        <span>{sentence.slice(0, idx + 1)}</span>
        <span className="pl-prep-highlight">{sentence.slice(idx + 1, idx + 1 + prep.length)}</span>
        <span>{sentence.slice(idx + 1 + prep.length)}</span>
      </>
    );
  }

  function checkFill() {
    setFillChecked(true);
    // Check if any In/On confusion
    const wrong = fillAnswers.some((ans, i) => {
      const correct = fillBlanks[i]?.answer;
      return ans && ans !== correct && (ans === "In" || ans === "On") && (correct === "In" || correct === "On");
    });
    if (wrong) setSofiaVisible(true);
  }

  return (
    <div className="pl-wrap">
      {/* Section 1: Preposition cards */}
      <div className="pl-section-title">📍 Maneno ya Mahali (Common Prepositions)</div>
      <div className="pl-prep-grid">
        {preps.map((p) => {
          const id = `prep-${p.word}`;
          const isPlaying = playingId === id;
          return (
            <button key={p.word} className={`pl-prep-card ${isPlaying ? "pl-prep-card--playing" : ""}`}
              onClick={() => play(id, p.audio_en, p.word)}>
              <span className="pl-prep-emoji">{p.emoji}</span>
              <span className="pl-prep-word">{p.word}</span>
              <span className="pl-prep-phonetic">({p.phonetic_sw})</span>
              <span className="pl-prep-trans">{p.translation_sw}</span>
              <span className="pl-play-icon">{isPlaying ? "🔊" : "▶"}</span>
            </button>
          );
        })}
      </div>

      {/* Section 2: Sentence examples with highlighted preposition */}
      <div className="pl-section-title">📝 Mifano ya Sentensi</div>
      <div className="pl-sentences">
        {sentences.map((s, i) => {
          const id = `sent-${i}`;
          const isPlaying = playingId === id;
          return (
            <div key={i} className="pl-sentence-row">
              <button className={`pl-audio-btn ${isPlaying ? "pl-audio-btn--playing" : ""}`}
                onClick={() => play(id, s.audio_en, s.en)} aria-label={`Play: ${s.en}`}>
                {isPlaying ? "🔊" : "▶"}
              </button>
              <div className="pl-sentence-body">
                <p className="pl-sent-en">{highlightPrep(s.en, s.preposition)}</p>
                <p className="pl-sent-phonetic">({s.phonetic_sw})</p>
                {showSwahili && <p className="pl-sent-sw">{s.sw}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 3: Live Object Playground */}
      {playground && (
        <>
          <div className="pl-section-title">🎮 Mchezo wa Kujifunza Mahali</div>
          <div className="pl-playground">
            {/* Table SVG */}
            <div className="pl-table-scene">
              <div className={`pl-apple ${activePos === "on" ? "pl-apple--on" : activePos === "under" ? "pl-apple--under" : activePos === "next" ? "pl-apple--next" : "pl-apple--idle"}`}>
                {playground.object}
              </div>
              <div className="pl-table-surface" />
              <div className="pl-table-legs">
                <div className="pl-table-leg" /><div className="pl-table-leg" />
              </div>
            </div>
            <div className="pl-pos-btns">
              {playground.positions.map(pos => (
                <button key={pos.id}
                  className={`pl-pos-btn ${activePos === pos.id ? "pl-pos-btn--active" : ""}`}
                  onClick={() => playPosition(pos)}>
                  {showSwahili ? pos.label_sw : pos.label_en}
                </button>
              ))}
            </div>
            {activePos && (
              <p className="pl-playground-sentence">
                {playground.positions.find(p => p.id === activePos)?.sentence_en}
              </p>
            )}
          </div>
        </>
      )}

      {/* Section 4: Fill in the blanks */}
      <div className="pl-section-title">✏️ Jaza Nafasi (Fill in the Blank)</div>
      <div className="pl-fill-list">
        {fillBlanks.map((fb, i) => {
          const isCorrect = fillAnswers[i] === fb.answer;
          return (
            <div key={i} className={`pl-fill-item ${fillChecked ? (isCorrect ? "pl-fill--correct" : "pl-fill--wrong") : ""}`}>
              {showSwahili && <p className="pl-fill-sw">{fb.sentence_sw}</p>}
              <p className="pl-fill-template">{fb.template_en.replace("___", `[${fillAnswers[i] || "???"}]`)}</p>
              <div className="pl-fill-opts">
                {fb.options.map(opt => (
                  <button key={opt}
                    className={`pl-fill-opt ${fillAnswers[i] === opt ? "pl-fill-opt--chosen" : ""}`}
                    onClick={() => {
                      if (fillChecked) return;
                      setFillAnswers(prev => { const n = [...prev]; n[i] = opt; return n; });
                    }}
                    disabled={fillChecked}>
                    {opt}
                  </button>
                ))}
              </div>
              {fillChecked && <span className="pl-fill-result">{isCorrect ? "✅ Correct!" : `❌ Answer: ${fb.answer}`}</span>}
            </div>
          );
        })}
        {!fillChecked && (
          <button className="pl-check-btn" onClick={checkFill} disabled={fillAnswers.some(a => !a)}>
            Check Answers
          </button>
        )}
      </div>

      {/* Sofia In/On tip */}
      {sofiaVisible && lesson.sofia_in_on_tip && (
        <div className="pl-sofia-tip">
          <span className="pl-sofia-icon">🤖 Sofia:</span>
          <span>{lesson.sofia_in_on_tip}</span>
        </div>
      )}

      {/* Section 5: Translate */}
      <div className="pl-section-title">🔄 Tafsiri kwa Kiingereza (Translate)</div>
      <div className="pl-trans-list">
        {translates.map((ex, i) => (
          <div key={i} className="pl-trans-item">
            <p className="pl-trans-sw">{ex.sw}</p>
            <input className="pl-trans-input" type="text" placeholder="Type English translation…"
              value={transAnswers[i]}
              onChange={e => { const n = [...transAnswers]; n[i] = e.target.value; setTransAnswers(n); }}
              disabled={transChecked} />
            {transChecked && (
              <p className={`pl-trans-result ${transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "pl-trans--ok" : "pl-trans--hint"}`}>
                {transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "✅" : `💡 ${ex.answer_en}`}
              </p>
            )}
          </div>
        ))}
        {!transChecked && (
          <button className="pl-check-btn" onClick={() => setTransChecked(true)} disabled={transAnswers.some(a => !a.trim())}>
            Check Translations
          </button>
        )}
      </div>

      <button className="lr-complete-btn" onClick={() => { completeLesson(lesson.id); onComplete?.(lesson.id); }}>
        ✅ Lesson 9 Complete →
      </button>

      <style>{`
        .pl-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .pl-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #f59e0b; margin-bottom: -0.5rem; }
        .pl-prep-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; }
        .pl-prep-card { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 0.85rem 0.6rem; cursor: pointer; transition: all 0.15s; }
        .pl-prep-card:hover { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.05); }
        .pl-prep-card--playing { border-color: #f59e0b; box-shadow: 0 0 16px rgba(245,158,11,0.25); }
        .pl-prep-emoji { font-size: 1.6rem; }
        .pl-prep-word { font-size: 1rem; font-weight: 800; color: #f1f5f9; }
        .pl-prep-phonetic { font-size: 0.7rem; color: #64748b; }
        .pl-prep-trans { font-size: 0.78rem; color: #94a3b8; }
        .pl-play-icon { font-size: 0.75rem; color: #f59e0b; margin-top: 0.2rem; }
        .pl-sentences { display: flex; flex-direction: column; gap: 0.6rem; }
        .pl-sentence-row { display: flex; align-items: flex-start; gap: 0.75rem; background: rgba(255,255,255,0.02); border-radius: 0.6rem; padding: 0.65rem 0.75rem; border: 1px solid rgba(255,255,255,0.06); }
        .pl-audio-btn { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); color: #f59e0b; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .pl-audio-btn--playing { background: rgba(245,158,11,0.2); box-shadow: 0 0 12px rgba(245,158,11,0.3); }
        .pl-sentence-body { display: flex; flex-direction: column; gap: 0.15rem; }
        .pl-sent-en { font-size: 0.92rem; color: #e2e8f0; margin: 0; }
        .pl-prep-highlight { color: #f97316; font-weight: 800; }
        .pl-sent-phonetic { font-size: 0.72rem; color: #64748b; margin: 0; }
        .pl-sent-sw { font-size: 0.78rem; color: #94a3b8; margin: 0; font-style: italic; }
        .pl-playground { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .pl-table-scene { position: relative; width: 200px; height: 120px; }
        .pl-apple { font-size: 2rem; position: absolute; transition: all 0.4s ease; }
        .pl-apple--idle { bottom: 50px; left: 50%; transform: translateX(-50%); }
        .pl-apple--on { bottom: 72px; left: 50%; transform: translateX(-50%); }
        .pl-apple--under { bottom: 0px; left: 50%; transform: translateX(-50%); }
        .pl-apple--next { bottom: 50px; left: 100%; transform: translateX(-20%); }
        .pl-table-surface { position: absolute; bottom: 50px; left: 0; right: 0; height: 12px; background: #78716c; border-radius: 4px; }
        .pl-table-legs { position: absolute; bottom: 0; left: 20px; right: 20px; height: 50px; display: flex; justify-content: space-between; }
        .pl-table-leg { width: 10px; background: #57534e; border-radius: 2px; }
        .pl-pos-btns { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
        .pl-pos-btn { padding: 0.4rem 0.85rem; border-radius: 999px; border: 1.5px solid rgba(245,158,11,0.25); background: rgba(245,158,11,0.06); color: #d97706; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .pl-pos-btn--active { background: rgba(245,158,11,0.18); border-color: #f59e0b; color: #f59e0b; }
        .pl-playground-sentence { font-size: 0.88rem; color: #e2e8f0; margin: 0; font-style: italic; }
        .pl-fill-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .pl-fill-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 0.7rem; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
        .pl-fill--correct { border-color: rgba(52,211,153,0.4); }
        .pl-fill--wrong { border-color: rgba(248,113,113,0.4); }
        .pl-fill-sw { font-size: 0.78rem; color: #64748b; margin: 0; font-style: italic; }
        .pl-fill-template { font-size: 0.9rem; color: #e2e8f0; margin: 0; }
        .pl-fill-opts { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .pl-fill-opt { padding: 0.3rem 0.75rem; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #94a3b8; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .pl-fill-opt--chosen { border-color: #818cf8; background: rgba(129,140,248,0.1); color: #c7d2fe; }
        .pl-fill-result { font-size: 0.78rem; }
        .pl-check-btn { align-self: flex-start; padding: 0.45rem 1rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.25); border-radius: 0.5rem; color: #34d399; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .pl-check-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pl-sofia-tip { display: flex; gap: 0.6rem; align-items: flex-start; background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.2); border-radius: 0.6rem; padding: 0.7rem 0.85rem; font-size: 0.82rem; color: #fdba74; }
        .pl-sofia-icon { font-weight: 700; flex-shrink: 0; }
        .pl-trans-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .pl-trans-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .pl-trans-sw { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        .pl-trans-input { background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.45rem; padding: 0.45rem 0.7rem; color: #e2e8f0; font-size: 0.85rem; outline: none; }
        .pl-trans-input:focus { border-color: rgba(245,158,11,0.4); }
        .pl-trans-result { font-size: 0.78rem; margin: 0; }
        .pl-trans--ok { color: #34d399; }
        .pl-trans--hint { color: #94a3b8; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── TimeDaysLabSection ────────────────────────────────────────────────────

function TimeDaysLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const days = lesson.days ?? [];
  const timeParts = lesson.time_parts ?? [];
  const sentences = lesson.sentence_examples ?? [];
  const dayOrder = lesson.day_order_exercise;
  const translates = lesson.translate_exercises ?? [];

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [orderedDays, setOrderedDays] = useState<string[]>(() => dayOrder ? [...dayOrder.scrambled] : []);
  const [orderChecked, setOrderChecked] = useState(false);
  const [transAnswers, setTransAnswers] = useState<string[]>(translates.map(() => ""));
  const [transChecked, setTransChecked] = useState(false);
  const [clockHour, setClockHour] = useState(9);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Conditional greeting based on current time
  const hour = new Date().getHours();
  const greeting = hour >= 6 && hour < 12 ? "Good morning! 🌅" : hour >= 12 && hour < 18 ? "Good afternoon! ☀️" : "Good evening! 🌆";
  const greetingSw = hour >= 6 && hour < 12 ? "Habari za asubuhi!" : hour >= 12 && hour < 18 ? "Habari za mchana!" : "Habari za jioni!";

  useEffect(() => {
    const urls = [...days.map(d => d.audio_en), ...timeParts.map(t => t.audio_en), ...sentences.map(s => s.audio_en ?? "")].filter(Boolean);
    for (const url of urls) {
      if (!cacheRef.current.has(url)) {
        const a = new Audio(toAudioSrc(url) || ""); a.preload = "auto"; a.load();
        cacheRef.current.set(url, a);
      }
    }
  }, [days, timeParts, sentences]);

  function stopAll() {
    cacheRef.current.forEach(a => { a.pause(); a.currentTime = 0; });
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakFallback(text: string, id: string, rate = 0.92) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setPlayingId(null); return; }
    warmSofiaVoices();
    const u = createSofiaUtterance(text, { rate });
    u.onstart = () => setPlayingId(id);
    u.onend = () => setPlayingId(p => p === id ? null : p);
    window.speechSynthesis.speak(u);
  }

  async function play(id: string, url: string, spoken: string, rate = 0.92) {
    stopAll();
    if (!url?.trim()) {
      speakFallback(spoken, id, rate);
      return;
    }
    const audio = cacheRef.current.get(url) ?? new Audio(toAudioSrc(url) || "");
    cacheRef.current.set(url, audio);
    audio.onended = () => setPlayingId(p => p === id ? null : p);
    audio.onerror = () => speakFallback(spoken, id, rate);
    try { audio.currentTime = 0; setPlayingId(id); await audio.play(); } catch { speakFallback(spoken, id, rate); }
  }

  // Clock SVG angle calculations
  const hourAngle = ((clockHour % 12) / 12) * 360;
  const clockNums = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Day ordering
  function moveDay(from: number, to: number) {
    if (orderChecked) return;
    setOrderedDays(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  const orderCorrect = dayOrder ? orderedDays.join(",") === dayOrder.correct_order.join(",") : true;

  return (
    <div className="td-wrap">
      {/* Greeting */}
      <div className="td-greeting">
        <span className="td-greeting-icon">🤖 Sofia:</span>
        <span className="td-greeting-text">{showSwahili ? greetingSw : greeting}</span>
      </div>

      {/* Days of the week */}
      <div className="td-section-title">📅 Siku za Wiki (Days of the Week)</div>
      <div className="td-days-grid">
        {days.map((d) => {
          const id = `day-${d.day}`;
          const isPlaying = playingId === id;
          return (
            <div key={d.day} className={`td-day-card ${isPlaying ? "td-day-card--playing" : ""}`}>
              <span className="td-day-en">{d.day}</span>
              <span className="td-day-phonetic">({d.phonetic_sw})</span>
              <span className="td-day-sw">{d.translation_sw}</span>
              <div className="td-day-btns">
                <button className={`td-audio-btn ${isPlaying ? "td-audio-btn--active" : ""}`}
                  onClick={() => play(id, d.audio_en, d.day)} aria-label={`Play ${d.day}`}>
                  {isPlaying ? "🔊" : "▶"}
                </button>
                {d.slow_motion && (
                  <button className="td-slow-btn"
                    onClick={() => play(`slow-${d.day}`, d.audio_en, d.day, 0.55)} title="Slow motion audio">
                    🐢
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time note */}
      {lesson.time_note_sw && (
        <div className="td-note">{showSwahili ? lesson.time_note_sw : "Note: English time counts from 1:00 AM onward. Different from Swahili time."}</div>
      )}

      {/* Time parts */}
      <div className="td-section-title">⏰ Wakati wa Siku (Parts of the Day)</div>
      <div className="td-time-grid">
        {timeParts.map((t) => {
          const id = `time-${t.part}`;
          const isPlaying = playingId === id;
          return (
            <button key={t.part} className={`td-time-card ${isPlaying ? "td-time-card--playing" : ""}`}
              onClick={() => play(id, t.audio_en, t.part)}>
              <span className="td-time-emoji">{t.emoji}</span>
              <span className="td-time-en">{t.part}</span>
              <span className="td-time-phonetic">({t.phonetic_sw})</span>
              <span className="td-time-sw">{t.translation_sw}</span>
            </button>
          );
        })}
      </div>

      {/* Clock widget */}
      <div className="td-section-title">🕐 Saa ya Mfumo (Clock)</div>
      <div className="td-clock-widget">
        <svg className="td-clock-face" viewBox="0 0 120 120" width="140" height="140">
          <circle cx="60" cy="60" r="58" fill="#1e293b" stroke="#334155" strokeWidth="2" />
          {clockNums.map((n, i) => {
            const angle = ((i) / 12) * 2 * Math.PI - Math.PI / 2;
            const x = 60 + 46 * Math.cos(angle);
            const y = 60 + 46 * Math.sin(angle);
            return <text key={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="9" fill="#94a3b8">{n}</text>;
          })}
          <line x1="60" y1="60"
            x2={60 + 32 * Math.cos((hourAngle - 90) * Math.PI / 180)}
            y2={60 + 32 * Math.sin((hourAngle - 90) * Math.PI / 180)}
            stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="60" r="3" fill="#f1f5f9" />
        </svg>
        <div className="td-clock-controls">
          <label className="td-clock-label">Select hour:</label>
          <select className="td-clock-select" value={clockHour}
            onChange={e => { setClockHour(Number(e.target.value)); speakFallback(`It is ${e.target.value} o'clock`, "clock"); }}>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}:00</option>)}
          </select>
          <p className="td-clock-phrase">It is {clockHour} o&apos;clock.</p>
        </div>
      </div>

      {/* Sentence examples */}
      <div className="td-section-title">📝 Mifano ya Sentensi</div>
      <div className="td-sentences">
        {sentences.map((s, i) => {
          const id = `sent-${i}`;
          const isPlaying = playingId === id;
          return (
            <div key={i} className="td-sentence-row">
              <button className={`td-audio-btn ${isPlaying ? "td-audio-btn--active" : ""}`}
                onClick={() => play(id, s.audio_en ?? "", s.en)}>
                {isPlaying ? "🔊" : "▶"}
              </button>
              <div>
                <p className="td-sent-en">{s.en}</p>
                <p className="td-sent-phonetic">({s.phonetic_sw})</p>
                {showSwahili && <p className="td-sent-sw">{s.sw}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day order exercise */}
      {dayOrder && (
        <>
          <div className="td-section-title">🔢 Panga Siku kwa Mpangilio (Order the Days)</div>
          <p className="td-exercise-prompt">{showSwahili ? dayOrder.prompt_sw : dayOrder.prompt_en}</p>
          <div className="td-order-list">
            {orderedDays.map((d, i) => (
              <div key={`${d}-${i}`} className="td-order-item">
                <span className="td-order-num">{i + 1}.</span>
                <span className="td-order-day">{d}</span>
                <div className="td-order-actions">
                  {i > 0 && <button className="td-order-btn" onClick={() => moveDay(i, i - 1)} disabled={orderChecked}>↑</button>}
                  {i < orderedDays.length - 1 && <button className="td-order-btn" onClick={() => moveDay(i, i + 1)} disabled={orderChecked}>↓</button>}
                </div>
              </div>
            ))}
          </div>
          {!orderChecked && (
            <button className="td-check-btn" onClick={() => setOrderChecked(true)}>Check Order</button>
          )}
          {orderChecked && (
            <p className={`td-order-result ${orderCorrect ? "td-result--ok" : "td-result--hint"}`}>
              {orderCorrect ? `✅ Correct! ${dayOrder.correct_order.join(" → ")}` : `💡 Correct order: ${dayOrder.correct_order.join(" → ")}`}
            </p>
          )}
        </>
      )}

      {/* Translate exercises */}
      <div className="td-section-title">🔄 Tafsiri kwa Kiingereza</div>
      <div className="td-trans-list">
        {translates.map((ex, i) => (
          <div key={i} className="td-trans-item">
            <p className="td-trans-sw">{ex.sw}</p>
            <input className="td-trans-input" type="text" placeholder="Type English translation…"
              value={transAnswers[i]}
              onChange={e => { const n = [...transAnswers]; n[i] = e.target.value; setTransAnswers(n); }}
              disabled={transChecked} />
            {transChecked && (
              <p className={`td-trans-result ${transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "td-result--ok" : "td-result--hint"}`}>
                {transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "✅" : `💡 ${ex.answer_en}`}
              </p>
            )}
          </div>
        ))}
        {!transChecked && (
          <button className="td-check-btn" onClick={() => setTransChecked(true)} disabled={transAnswers.some(a => !a.trim())}>
            Check Translations
          </button>
        )}
      </div>

      <button className="lr-complete-btn" onClick={() => { completeLesson(lesson.id); onComplete?.(lesson.id); }}>
        ✅ Lesson 10 Complete →
      </button>

      <style>{`
        .td-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .td-greeting { display: flex; align-items: center; gap: 0.6rem; background: rgba(52,211,153,0.05); border: 1px solid rgba(52,211,153,0.15); border-radius: 0.6rem; padding: 0.6rem 0.85rem; font-size: 0.88rem; color: #6ee7b7; }
        .td-greeting-icon { font-weight: 700; flex-shrink: 0; }
        .td-greeting-text { }
        .td-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #818cf8; margin-bottom: -0.5rem; }
        .td-days-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.6rem; }
        .td-day-card { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.75rem; padding: 0.75rem 0.6rem; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
        .td-day-card--playing { border-color: #818cf8; box-shadow: 0 0 14px rgba(129,140,248,0.2); }
        .td-day-en { font-size: 0.92rem; font-weight: 800; color: #f1f5f9; }
        .td-day-phonetic { font-size: 0.68rem; color: #64748b; }
        .td-day-sw { font-size: 0.75rem; color: #94a3b8; }
        .td-day-btns { display: flex; gap: 0.35rem; margin-top: 0.3rem; }
        .td-audio-btn { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid rgba(129,140,248,0.3); background: rgba(129,140,248,0.06); color: #818cf8; font-size: 0.72rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .td-audio-btn--active { background: rgba(129,140,248,0.18); box-shadow: 0 0 10px rgba(129,140,248,0.25); }
        .td-slow-btn { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.06); font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .td-note { font-size: 0.78rem; color: #64748b; background: rgba(255,255,255,0.02); border-left: 3px solid #818cf8; border-radius: 0 0.4rem 0.4rem 0; padding: 0.5rem 0.75rem; line-height: 1.5; }
        .td-time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.6rem; }
        .td-time-card { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.75rem; padding: 0.75rem 0.5rem; cursor: pointer; transition: all 0.15s; }
        .td-time-card:hover { border-color: rgba(129,140,248,0.35); }
        .td-time-card--playing { border-color: #818cf8; box-shadow: 0 0 14px rgba(129,140,248,0.2); }
        .td-time-emoji { font-size: 1.5rem; }
        .td-time-en { font-size: 0.85rem; font-weight: 700; color: #f1f5f9; }
        .td-time-phonetic { font-size: 0.65rem; color: #64748b; }
        .td-time-sw { font-size: 0.72rem; color: #94a3b8; }
        .td-clock-widget { display: flex; align-items: center; gap: 1.5rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 1rem; padding: 1.25rem; flex-wrap: wrap; }
        .td-clock-face { flex-shrink: 0; }
        .td-clock-controls { display: flex; flex-direction: column; gap: 0.5rem; }
        .td-clock-label { font-size: 0.75rem; color: #64748b; }
        .td-clock-select { background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.4rem; padding: 0.3rem 0.5rem; color: #e2e8f0; font-size: 0.85rem; }
        .td-clock-phrase { font-size: 0.9rem; color: #34d399; margin: 0; font-weight: 700; }
        .td-sentences { display: flex; flex-direction: column; gap: 0.5rem; }
        .td-sentence-row { display: flex; align-items: flex-start; gap: 0.6rem; background: rgba(255,255,255,0.02); border-radius: 0.5rem; padding: 0.55rem 0.7rem; border: 1px solid rgba(255,255,255,0.05); }
        .td-sent-en { font-size: 0.9rem; color: #e2e8f0; margin: 0; }
        .td-sent-phonetic { font-size: 0.7rem; color: #64748b; margin: 0; }
        .td-sent-sw { font-size: 0.75rem; color: #94a3b8; margin: 0; font-style: italic; }
        .td-exercise-prompt { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        .td-order-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .td-order-item { display: flex; align-items: center; gap: 0.6rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 0.5rem; padding: 0.5rem 0.75rem; }
        .td-order-num { font-size: 0.75rem; color: #64748b; width: 18px; flex-shrink: 0; }
        .td-order-day { font-size: 0.88rem; font-weight: 700; color: #f1f5f9; flex: 1; }
        .td-order-actions { display: flex; gap: 0.25rem; }
        .td-order-btn { width: 24px; height: 24px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #94a3b8; font-size: 0.7rem; cursor: pointer; }
        .td-check-btn { align-self: flex-start; padding: 0.4rem 0.9rem; background: rgba(129,140,248,0.1); border: 1.5px solid rgba(129,140,248,0.25); border-radius: 0.5rem; color: #818cf8; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .td-check-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .td-order-result { font-size: 0.82rem; margin: 0; }
        .td-result--ok { color: #34d399; }
        .td-result--hint { color: #94a3b8; }
        .td-trans-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .td-trans-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .td-trans-sw { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        .td-trans-input { background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.45rem; padding: 0.45rem 0.7rem; color: #e2e8f0; font-size: 0.85rem; outline: none; }
        .td-trans-input:focus { border-color: rgba(129,140,248,0.4); }
        .td-trans-result { font-size: 0.78rem; margin: 0; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── FamilyLabSection ──────────────────────────────────────────────────────

function FamilyLabSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const members = lesson.family_members ?? [];
  const possessives = lesson.possessives ?? [];
  const sentences = lesson.sentence_examples ?? [];
  const builder = lesson.sentence_builder;
  const quiz = lesson.possessive_quiz ?? [];
  const relExercises = lesson.relationship_exercises ?? [];
  const translates = lesson.translate_exercises ?? [];

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showEn, setShowEn] = useState(false);
  const [builderSel, setBuilderSel] = useState<{ c1: string; c2: string; c3: string }>({ c1: "", c2: "", c3: "" });
  const [builtSentence, setBuiltSentence] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>(quiz.map(() => ""));
  const [quizChecked, setQuizChecked] = useState(false);
  const [relAnswers, setRelAnswers] = useState<string[]>(relExercises.map(() => ""));
  const [relChecked, setRelChecked] = useState(false);
  const [transAnswers, setTransAnswers] = useState<string[]>(translates.map(() => ""));
  const [transChecked, setTransChecked] = useState(false);
  const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    const urls = [...members.map(m => m.audio_en), ...possessives.map(p => p.audio_en), ...sentences.map(s => s.audio_en ?? "")].filter(Boolean);
    for (const url of urls) {
      if (!cacheRef.current.has(url)) {
        const a = new Audio(toAudioSrc(url) || ""); a.preload = "auto"; a.load();
        cacheRef.current.set(url, a);
      }
    }
  }, [members, possessives, sentences]);

  function stopAll() {
    cacheRef.current.forEach(a => { a.pause(); a.currentTime = 0; });
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speakFallback(text: string, id: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setPlayingId(null); return; }
    warmSofiaVoices();
    const u = createSofiaUtterance(text);
    u.onstart = () => setPlayingId(id);
    u.onend = () => setPlayingId(p => p === id ? null : p);
    window.speechSynthesis.speak(u);
  }

  async function play(id: string, url: string, spoken: string) {
    stopAll();
    if (!url?.trim()) {
      speakFallback(spoken, id);
      return;
    }
    const audio = cacheRef.current.get(url) ?? new Audio(toAudioSrc(url) || "");
    cacheRef.current.set(url, audio);
    audio.onended = () => setPlayingId(p => p === id ? null : p);
    audio.onerror = () => speakFallback(spoken, id);
    try { audio.currentTime = 0; setPlayingId(id); await audio.play(); } catch { speakFallback(spoken, id); }
  }

  function buildSentence() {
    if (builderSel.c1 && builderSel.c2 && builderSel.c3) {
      const s = `${builderSel.c1} ${builderSel.c2} ${builderSel.c3}`;
      setBuiltSentence(s);
      speakFallback(s, "builder");
    }
  }

  // Group members by tree_pos for family tree visual
  const grandparents = members.filter(m => m.tree_pos === "grandparent");
  const parents = members.filter(m => m.tree_pos === "parent");
  const siblings = members.filter(m => m.tree_pos === "sibling");
  const children = members.filter(m => m.tree_pos === "child");

  return (
    <div className="fl-wrap">
      {/* Family tree */}
      <div className="fl-section-title">🌳 Mti wa Familia (Family Tree)</div>
      <div className="fl-tree">
        {[{ label: "Babu/Bibi (Grandparents)", items: grandparents }, { label: "Baba/Mama (Parents)", items: parents }, { label: "Ndugu (Siblings)", items: siblings }, { label: "Watoto (Children)", items: children }]
          .filter(g => g.items.length > 0)
          .map(group => (
            <div key={group.label} className="fl-tree-row">
              <span className="fl-tree-label">{group.label}</span>
              <div className="fl-tree-members">
                {group.items.map(m => {
                  const id = `member-${m.word}`;
                  const isPlaying = playingId === id;
                  return (
                    <button key={m.word} className={`fl-member-card ${isPlaying ? "fl-member-card--playing" : ""}`}
                      onClick={() => play(id, m.audio_en, m.word)}>
                      <span className="fl-member-emoji">{m.emoji}</span>
                      <span className="fl-member-word">{showEn ? m.word : m.translation_sw}</span>
                      <span className="fl-member-alt">{showEn ? m.translation_sw : m.word}</span>
                      <span className="fl-member-phonetic">({m.phonetic_sw})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        <button className="fl-lang-toggle" onClick={() => setShowEn(v => !v)}>
          {showEn ? "🇹🇿 Switch to Swahili" : "🇬🇧 Switch to English"}
        </button>
      </div>

      {/* Possessives */}
      <div className="fl-section-title">📌 Viwakilishi vya Umiliki (Possessives)</div>
      <div className="fl-poss-grid">
        {possessives.map(p => {
          const id = `poss-${p.word}`;
          const isPlaying = playingId === id;
          return (
            <button key={p.word} className={`fl-poss-card ${isPlaying ? "fl-poss-card--playing" : ""}`}
              onClick={() => play(id, p.audio_en, p.word)}>
              <span className="fl-poss-word">{p.word}</span>
              <span className="fl-poss-phonetic">({p.phonetic_sw})</span>
              <span className="fl-poss-trans">{p.translation_sw}</span>
            </button>
          );
        })}
      </div>

      {/* Sentence examples */}
      <div className="fl-section-title">📝 Mifano ya Sentensi</div>
      <div className="fl-sentences">
        {sentences.map((s, i) => {
          const id = `sent-${i}`;
          const isPlaying = playingId === id;
          return (
            <div key={i} className="fl-sentence-row">
              <button className={`fl-audio-btn ${isPlaying ? "fl-audio-btn--active" : ""}`}
                onClick={() => play(id, s.audio_en ?? "", s.en)}>
                {isPlaying ? "🔊" : "▶"}
              </button>
              <div>
                <p className="fl-sent-en">{s.en}</p>
                <p className="fl-sent-phonetic">({s.phonetic_sw})</p>
                {showSwahili && <p className="fl-sent-sw">{s.sw}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sentence builder */}
      {builder && (
        <>
          <div className="fl-section-title">🔧 Jenga Sentensi (Sentence Builder)</div>
          <div className="fl-builder">
            {[{ key: "c1" as const, options: builder.col1, label: "Possessive" }, { key: "c2" as const, options: builder.col2, label: "Family member" }, { key: "c3" as const, options: builder.col3, label: "Verb phrase" }].map(col => (
              <div key={col.key} className="fl-builder-col">
                <span className="fl-builder-col-label">{col.label}</span>
                <div className="fl-builder-tiles">
                  {col.options.map(opt => (
                    <button key={opt}
                      className={`fl-builder-tile ${builderSel[col.key] === opt ? "fl-builder-tile--active" : ""}`}
                      onClick={() => setBuilderSel(prev => ({ ...prev, [col.key]: opt }))}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {builderSel.c1 && builderSel.c2 && builderSel.c3 ? (
            <div className="fl-built-sentence">
              <p className="fl-built-text">&ldquo;{builderSel.c1} {builderSel.c2} {builderSel.c3}&rdquo;</p>
              <button className="fl-speak-btn" onClick={buildSentence}>🔊 Hear it</button>
            </div>
          ) : (
            <p className="fl-builder-hint">Select one word from each column to build a sentence.</p>
          )}
        </>
      )}

      {/* Possessive quiz (His/Her) */}
      {quiz.length > 0 && (
        <>
          <div className="fl-section-title">🧩 Mchezo wa Viwakilishi (Possessive Quiz)</div>
          <div className="fl-quiz-list">
            {quiz.map((q, i) => {
              const chosen = quizAnswers[i];
              const isCorrect = chosen === q.correct;
              return (
                <div key={i} className={`fl-quiz-item ${quizChecked ? (isCorrect ? "fl-quiz--correct" : "fl-quiz--wrong") : ""}`}>
                  <div className="fl-quiz-image">{q.image_emoji}</div>
                  <p className="fl-quiz-desc">{q.image_desc}</p>
                  <div className="fl-quiz-opts">
                    {q.options.map(opt => (
                      <button key={opt}
                        className={`fl-quiz-opt ${chosen === opt ? "fl-quiz-opt--chosen" : ""}`}
                        onClick={() => { if (!quizChecked) { const n = [...quizAnswers]; n[i] = opt; setQuizAnswers(n); } }}
                        disabled={quizChecked}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {quizChecked && !isCorrect && (
                    <p className="fl-quiz-feedback">💡 {q.feedback_sw}</p>
                  )}
                </div>
              );
            })}
            {!quizChecked && (
              <button className="fl-check-btn" onClick={() => setQuizChecked(true)} disabled={quizAnswers.some(a => !a)}>
                Check Answers
              </button>
            )}
          </div>
        </>
      )}

      {/* Relationship exercises */}
      {relExercises.length > 0 && (
        <>
          <div className="fl-section-title">🔗 Kamilisha Uhusiano (Complete the Relationship)</div>
          <div className="fl-rel-list">
            {relExercises.map((ex, i) => (
              <div key={i} className="fl-rel-item">
                <p className="fl-rel-prompt">{ex.sw}</p>
                <div className="fl-rel-answer-row">
                  <span className="fl-rel-arrow">➡️</span>
                  <input className="fl-rel-input" type="text"
                    placeholder="Answer in English…"
                    value={relAnswers[i]}
                    onChange={e => { const n = [...relAnswers]; n[i] = e.target.value; setRelAnswers(n); }}
                    disabled={relChecked} />
                </div>
                {relChecked && (
                  <p className={`fl-rel-result ${relAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "fl-result--ok" : "fl-result--hint"}`}>
                    {relAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "✅" : `💡 ${ex.answer_en}`}
                  </p>
                )}
              </div>
            ))}
            {!relChecked && (
              <button className="fl-check-btn" onClick={() => setRelChecked(true)} disabled={relAnswers.some(a => !a.trim())}>
                Check Answers
              </button>
            )}
          </div>
        </>
      )}

      {/* Translate */}
      <div className="fl-section-title">🔄 Tafsiri kwa Kiingereza</div>
      <div className="fl-trans-list">
        {translates.map((ex, i) => (
          <div key={i} className="fl-trans-item">
            <p className="fl-trans-sw">{ex.sw}</p>
            <input className="fl-trans-input" type="text" placeholder="Type English translation…"
              value={transAnswers[i]}
              onChange={e => { const n = [...transAnswers]; n[i] = e.target.value; setTransAnswers(n); }}
              disabled={transChecked} />
            {transChecked && (
              <p className={`fl-trans-result ${transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "fl-result--ok" : "fl-result--hint"}`}>
                {transAnswers[i].trim().toLowerCase() === ex.answer_en.toLowerCase() ? "✅" : `💡 ${ex.answer_en}`}
              </p>
            )}
          </div>
        ))}
        {!transChecked && (
          <button className="fl-check-btn" onClick={() => setTransChecked(true)} disabled={transAnswers.some(a => !a.trim())}>
            Check Translations
          </button>
        )}
      </div>

      <button className="lr-complete-btn" onClick={() => { completeLesson(lesson.id); onComplete?.(lesson.id); }}>
        ✅ Lesson 11 Complete →
      </button>

      <style>{`
        .fl-wrap { display: flex; flex-direction: column; gap: 1.5rem; }
        .fl-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #f472b6; margin-bottom: -0.5rem; }
        .fl-tree { display: flex; flex-direction: column; gap: 1rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 0.85rem; padding: 1.25rem; }
        .fl-tree-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .fl-tree-label { font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
        .fl-tree-members { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .fl-member-card { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.65rem; padding: 0.6rem 0.75rem; cursor: pointer; transition: all 0.15s; min-width: 80px; }
        .fl-member-card:hover { border-color: rgba(244,114,182,0.35); }
        .fl-member-card--playing { border-color: #f472b6; box-shadow: 0 0 12px rgba(244,114,182,0.2); }
        .fl-member-emoji { font-size: 1.5rem; }
        .fl-member-word { font-size: 0.82rem; font-weight: 700; color: #f1f5f9; }
        .fl-member-alt { font-size: 0.72rem; color: #94a3b8; }
        .fl-member-phonetic { font-size: 0.65rem; color: #64748b; }
        .fl-lang-toggle { align-self: flex-start; margin-top: 0.25rem; font-size: 0.75rem; font-weight: 700; padding: 0.3rem 0.75rem; border-radius: 999px; border: 1.5px solid rgba(244,114,182,0.25); background: rgba(244,114,182,0.06); color: #f472b6; cursor: pointer; }
        .fl-poss-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
        .fl-poss-card { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.6rem; padding: 0.55rem 0.85rem; cursor: pointer; transition: all 0.15s; }
        .fl-poss-card:hover { border-color: rgba(244,114,182,0.35); }
        .fl-poss-card--playing { border-color: #f472b6; box-shadow: 0 0 10px rgba(244,114,182,0.2); }
        .fl-poss-word { font-size: 0.95rem; font-weight: 800; color: #f1f5f9; }
        .fl-poss-phonetic { font-size: 0.68rem; color: #64748b; }
        .fl-poss-trans { font-size: 0.75rem; color: #94a3b8; }
        .fl-sentences { display: flex; flex-direction: column; gap: 0.5rem; }
        .fl-sentence-row { display: flex; align-items: flex-start; gap: 0.6rem; background: rgba(255,255,255,0.02); border-radius: 0.5rem; padding: 0.55rem 0.7rem; border: 1px solid rgba(255,255,255,0.05); }
        .fl-audio-btn { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid rgba(244,114,182,0.3); background: rgba(244,114,182,0.06); color: #f472b6; font-size: 0.72rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .fl-audio-btn--active { background: rgba(244,114,182,0.18); box-shadow: 0 0 10px rgba(244,114,182,0.2); }
        .fl-sent-en { font-size: 0.9rem; color: #e2e8f0; margin: 0; }
        .fl-sent-phonetic { font-size: 0.7rem; color: #64748b; margin: 0; }
        .fl-sent-sw { font-size: 0.75rem; color: #94a3b8; margin: 0; font-style: italic; }
        .fl-builder { display: flex; gap: 1rem; flex-wrap: wrap; }
        .fl-builder-col { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 120px; }
        .fl-builder-col-label { font-size: 0.68rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
        .fl-builder-tiles { display: flex; flex-direction: column; gap: 0.3rem; }
        .fl-builder-tile { padding: 0.35rem 0.6rem; border-radius: 0.4rem; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #94a3b8; font-size: 0.82rem; font-weight: 600; cursor: pointer; text-align: left; transition: all 0.15s; }
        .fl-builder-tile--active { border-color: #f472b6; background: rgba(244,114,182,0.1); color: #f9a8d4; }
        .fl-built-sentence { display: flex; align-items: center; gap: 0.75rem; background: rgba(244,114,182,0.06); border: 1.5px solid rgba(244,114,182,0.2); border-radius: 0.65rem; padding: 0.75rem 1rem; }
        .fl-built-text { font-size: 0.95rem; color: #f9a8d4; margin: 0; font-style: italic; flex: 1; }
        .fl-speak-btn { font-size: 0.8rem; font-weight: 700; padding: 0.3rem 0.65rem; border-radius: 0.4rem; border: 1.5px solid rgba(244,114,182,0.3); background: rgba(244,114,182,0.1); color: #f472b6; cursor: pointer; flex-shrink: 0; }
        .fl-builder-hint { font-size: 0.78rem; color: #475569; margin: 0; }
        .fl-quiz-list { display: flex; flex-direction: column; gap: 0.85rem; }
        .fl-quiz-item { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 0.75rem; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.45rem; }
        .fl-quiz--correct { border-color: rgba(52,211,153,0.35); }
        .fl-quiz--wrong { border-color: rgba(248,113,113,0.35); }
        .fl-quiz-image { font-size: 2.5rem; }
        .fl-quiz-desc { font-size: 0.82rem; color: #94a3b8; margin: 0; }
        .fl-quiz-opts { display: flex; gap: 0.5rem; }
        .fl-quiz-opt { padding: 0.35rem 0.85rem; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #94a3b8; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .fl-quiz-opt--chosen { border-color: #818cf8; background: rgba(129,140,248,0.1); color: #c7d2fe; }
        .fl-quiz-feedback { font-size: 0.78rem; color: #fca5a5; margin: 0; }
        .fl-check-btn { align-self: flex-start; padding: 0.4rem 0.9rem; background: rgba(244,114,182,0.08); border: 1.5px solid rgba(244,114,182,0.25); border-radius: 0.5rem; color: #f472b6; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
        .fl-check-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .fl-rel-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .fl-rel-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .fl-rel-prompt { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        .fl-rel-answer-row { display: flex; align-items: center; gap: 0.5rem; }
        .fl-rel-arrow { font-size: 1rem; flex-shrink: 0; }
        .fl-rel-input { flex: 1; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.45rem; padding: 0.4rem 0.7rem; color: #e2e8f0; font-size: 0.85rem; outline: none; }
        .fl-rel-input:focus { border-color: rgba(244,114,182,0.4); }
        .fl-rel-result { font-size: 0.78rem; margin: 0; }
        .fl-result--ok { color: #34d399; }
        .fl-result--hint { color: #94a3b8; }
        .fl-trans-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .fl-trans-item { display: flex; flex-direction: column; gap: 0.3rem; }
        .fl-trans-sw { font-size: 0.85rem; color: #94a3b8; margin: 0; }
        .fl-trans-input { background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.45rem; padding: 0.45rem 0.7rem; color: #e2e8f0; font-size: 0.85rem; outline: none; }
        .fl-trans-input:focus { border-color: rgba(244,114,182,0.4); }
        .fl-trans-result { font-size: 0.78rem; margin: 0; }
        .lr-complete-btn { align-self: flex-start; padding: 0.6rem 1.2rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .lr-complete-btn:hover { background: rgba(52,211,153,0.2); }
      `}</style>
    </div>
  );
}

// ── AI Conversation Section ───────────────────────────────────────────────

interface AiTurn {
  id: string;
  boss_message: string;
  boss_audio?: string;
  response_mode: "voice" | "type";
  expected_keywords?: string[];
  expected_answer?: string;
  expected_answer_alt?: string[];
  hint_sw: string;
  hint_en: string;
  success_response: string;
  success_audio?: string;
  skills_checked: string[];
}

function AiConversationSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const turns = (lesson.turns ?? []) as AiTurn[];
  const [currentTurn, setCurrentTurn] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [turnStatus, setTurnStatus] = useState<"waiting" | "success" | "hint">("waiting");
  const [completedTurns, setCompletedTurns] = useState<string[]>([]);
  const [chatLog, setChatLog] = useState<Array<{ from: "boss" | "user"; text: string; status?: "ok" | "hint" }>>([]);
  const [listening, setListening] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const turn = turns[currentTurn];

  // Auto-add boss message to chat when turn changes
  useEffect(() => {
    if (!turn) return;
    setChatLog((prev) => {
      const alreadyHas = prev.some((m) => m.from === "boss" && m.text === turn.boss_message);
      if (alreadyHas) return prev;
      return [...prev, { from: "boss", text: turn.boss_message }];
    });
    setTurnStatus("waiting");
    setTypedAnswer("");
    setAttempts(0);
    setShowHint(false);
  }, [currentTurn, turn]);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  function checkTypedAnswer(answer: string): boolean {
    if (!turn) return false;
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    const norm = normalise(answer);
    if (normalise(turn.expected_answer ?? "") === norm) return true;
    return (turn.expected_answer_alt ?? []).some((a) => normalise(a) === norm);
  }

  function checkVoiceAnswer(transcript: string): boolean {
    if (!turn) return false;
    const lower = transcript.toLowerCase();
    const keywords = turn.expected_keywords ?? [];
    if (!keywords.length) return true;
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  function handleTypedSubmit() {
    if (!turn) return;
    const ok = checkTypedAnswer(typedAnswer);
    setChatLog((prev) => [...prev, { from: "user", text: typedAnswer, status: ok ? "ok" : "hint" }]);
    if (ok) {
      speak(turn.success_response);
      setChatLog((prev) => [...prev, { from: "boss", text: turn.success_response }]);
      setTurnStatus("success");
      advanceTurn(turn.id);
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 2) setShowHint(true);
      speak("Try again! " + (showSwahili ? turn.hint_sw : turn.hint_en));
      logFoundationEvent({ type: "error", moduleId: lesson.moduleId ?? 12, lessonId: lesson.id, lessonTitle: lesson.title, typed: typedAnswer, expected: turn.expected_answer ?? "" });
    }
    setTypedAnswer("");
  }

  function handleVoiceClick() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Your browser does not support voice recognition. Please type your answer instead.");
      return;
    }
    const SRClass = (window as unknown as Record<string, new () => { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }>)["SpeechRecognition"] ?? (window as unknown as Record<string, new () => { lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }>)["webkitSpeechRecognition"];
    const sr = new SRClass();
    sr.lang = "en-US";
    sr.interimResults = false;
    sr.maxAlternatives = 3;
    setListening(true);
    sr.start();
    sr.onresult = (e) => {
      const transcript = Array.from(e.results[0]).map((r) => r.transcript).join(" ");
      setListening(false);
      const ok = checkVoiceAnswer(transcript);
      const attemptNum = attempts + 1;
      logFoundationEvent({ type: "voice_attempt", moduleId: lesson.moduleId ?? 12, lessonId: lesson.id, lessonTitle: lesson.title, attemptNumber: attemptNum, success: ok });
      setChatLog((prev) => [...prev, { from: "user", text: `🎙️ "${transcript}"`, status: ok ? "ok" : "hint" }]);
      if (ok) {
        speak(turn!.success_response);
        setChatLog((prev) => [...prev, { from: "boss", text: turn!.success_response }]);
        setTurnStatus("success");
        advanceTurn(turn!.id);
      } else {
        const next = attemptNum;
        setAttempts(next);
        if (next >= 2) setShowHint(true);
        speak(showSwahili ? turn!.hint_sw : turn!.hint_en);
      }
    };
    sr.onerror = () => setListening(false);
    sr.onend = () => setListening(false);
  }

  function advanceTurn(id: string) {
    setCompletedTurns((prev) => [...prev, id]);
    setTimeout(() => {
      if (currentTurn < turns.length - 1) {
        setCurrentTurn((t) => t + 1);
      } else {
        setAllDone(true);
        onComplete?.(lesson.id);
      }
    }, 1800);
  }

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  return (
    <div className="aic-wrap">
      {/* Context banner */}
      {(lesson.context_sw || lesson.context_en) && (
        <div className="aic-context">
          <span className="aic-context-icon">🏢</span>
          <span className="aic-context-text">
            {showSwahili && lesson.context_sw ? lesson.context_sw : lesson.context_en}
          </span>
        </div>
      )}

      {/* Progress indicators */}
      <div className="aic-progress">
        {turns.map((t, i) => (
          <div
            key={t.id}
            className={`aic-progress-dot ${completedTurns.includes(t.id) ? "aic-progress-dot--done" : i === currentTurn ? "aic-progress-dot--active" : ""}`}
          />
        ))}
        <span className="aic-progress-label">{Math.min(currentTurn + 1, turns.length)} / {turns.length}</span>
      </div>

      {/* Chat window */}
      <div className="aic-chat">
        {chatLog.map((msg, i) => (
          <div key={i} className={`aic-bubble-wrap aic-bubble-wrap--${msg.from}`}>
            {msg.from === "boss" && <span className="aic-avatar">👔</span>}
            <div className={`aic-bubble aic-bubble--${msg.from} ${msg.status === "ok" ? "aic-bubble--ok" : msg.status === "hint" ? "aic-bubble--hint" : ""}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Sofia hint */}
      {showHint && turn && (
        <div className="aic-hint">
          <span className="aic-hint-icon">🧑‍🏫</span>
          <span className="aic-hint-text">{showSwahili ? turn.hint_sw : turn.hint_en}</span>
        </div>
      )}

      {/* Skills chip */}
      {turn && (
        <div className="aic-skills">
          {turn.skills_checked.map((s) => (
            <span key={s} className="aic-skill-chip">{s}</span>
          ))}
        </div>
      )}

      {/* Input area */}
      {!allDone && turn && turnStatus === "waiting" && (
        <div className="aic-input-area">
          {turn.response_mode === "type" ? (
            <div className="aic-type-row">
              <input
                className="aic-type-input"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && typedAnswer.trim() && handleTypedSubmit()}
                placeholder="Type your answer…"
                autoFocus
              />
              <button className="aic-send-btn" onClick={handleTypedSubmit} disabled={!typedAnswer.trim()}>
                Send →
              </button>
            </div>
          ) : (
            <button className={`aic-mic-btn ${listening ? "aic-mic-btn--active" : ""}`} onClick={handleVoiceClick} disabled={listening}>
              {listening ? "🔴 Listening…" : "🎙️ Speak Now"}
            </button>
          )}
        </div>
      )}

      {/* Completion banner */}
      {allDone && (
        <div className="aic-complete">
          <span className="aic-complete-icon">🎉</span>
          <div>
            <p className="aic-complete-title">Conversation Complete!</p>
            <p className="aic-complete-sw">Umefanikiwa! Umezungumza na bosi wako wa kwanza.</p>
          </div>
        </div>
      )}

      <style>{`
        .aic-wrap { display: flex; flex-direction: column; gap: 1rem; }
        .aic-context { display: flex; align-items: center; gap: 0.5rem; background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.2); border-radius: 0.5rem; padding: 0.5rem 0.85rem; }
        .aic-context-icon { font-size: 1rem; }
        .aic-context-text { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }
        .aic-progress { display: flex; align-items: center; gap: 0.4rem; }
        .aic-progress-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1.5px solid rgba(255,255,255,0.15); transition: all 0.2s; }
        .aic-progress-dot--done { background: #34d399; border-color: #34d399; }
        .aic-progress-dot--active { background: #818cf8; border-color: #818cf8; transform: scale(1.25); }
        .aic-progress-label { font-size: 0.75rem; color: #64748b; margin-left: 0.3rem; }
        .aic-chat { display: flex; flex-direction: column; gap: 0.65rem; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 0.75rem; padding: 0.85rem; min-height: 180px; max-height: 340px; overflow-y: auto; }
        .aic-bubble-wrap { display: flex; align-items: flex-end; gap: 0.4rem; }
        .aic-bubble-wrap--user { flex-direction: row-reverse; }
        .aic-avatar { font-size: 1.3rem; flex-shrink: 0; }
        .aic-bubble { padding: 0.5rem 0.85rem; border-radius: 1rem; font-size: 0.85rem; max-width: 78%; line-height: 1.45; }
        .aic-bubble--boss { background: rgba(129,140,248,0.12); border: 1px solid rgba(129,140,248,0.2); color: #e2e8f0; border-bottom-left-radius: 0.2rem; }
        .aic-bubble--user { background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); color: #e2e8f0; border-bottom-right-radius: 0.2rem; }
        .aic-bubble--ok { border-color: rgba(52,211,153,0.5) !important; }
        .aic-bubble--hint { border-color: rgba(245,158,11,0.4) !important; }
        .aic-hint { display: flex; align-items: flex-start; gap: 0.5rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: 0.5rem; padding: 0.5rem 0.85rem; }
        .aic-hint-icon { font-size: 1rem; flex-shrink: 0; }
        .aic-hint-text { font-size: 0.8rem; color: #fbbf24; line-height: 1.4; }
        .aic-skills { display: flex; flex-wrap: wrap; gap: 0.35rem; }
        .aic-skill-chip { font-size: 0.7rem; padding: 0.15rem 0.5rem; background: rgba(129,140,248,0.1); border: 1px solid rgba(129,140,248,0.2); border-radius: 1rem; color: #a5b4fc; }
        .aic-input-area { display: flex; flex-direction: column; gap: 0.5rem; }
        .aic-type-row { display: flex; gap: 0.5rem; }
        .aic-type-input { flex: 1; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 0.6rem; padding: 0.55rem 0.85rem; color: #e2e8f0; font-size: 0.88rem; outline: none; transition: border-color 0.15s; }
        .aic-type-input:focus { border-color: rgba(52,211,153,0.4); }
        .aic-send-btn { padding: 0.55rem 1rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .aic-send-btn:hover:not(:disabled) { background: rgba(52,211,153,0.2); }
        .aic-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .aic-mic-btn { padding: 0.75rem 1.5rem; background: rgba(129,140,248,0.1); border: 2px solid rgba(129,140,248,0.3); border-radius: 2rem; color: #a5b4fc; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.15s; align-self: center; }
        .aic-mic-btn--active { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.4); color: #f87171; animation: aic-pulse 1s infinite; }
        @keyframes aic-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .aic-complete { display: flex; align-items: center; gap: 0.75rem; background: rgba(52,211,153,0.08); border: 1.5px solid rgba(52,211,153,0.25); border-radius: 0.75rem; padding: 0.85rem 1.1rem; }
        .aic-complete-icon { font-size: 1.75rem; flex-shrink: 0; }
        .aic-complete-title { font-size: 1rem; font-weight: 700; color: #34d399; margin: 0 0 0.15rem; }
        .aic-complete-sw { font-size: 0.8rem; color: #64748b; margin: 0; }
      `}</style>
    </div>
  );
}

// ── Fill Blank Exit Section ───────────────────────────────────────────────

interface BlankItem {
  sentence_sw: string;
  template: string;
  answer: string;
  hint_sw: string;
  emoji?: string;
}

function FillBlankExitSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const blanks = (lesson.blanks ?? []) as BlankItem[];
  const [answers, setAnswers] = useState<string[]>(blanks.map(() => ""));
  const [results, setResults] = useState<Array<"idle" | "correct" | "wrong">>(blanks.map(() => "idle"));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  function handleChange(i: number, val: string) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? val : a)));
  }

  function handleSubmit() {
    const newResults = blanks.map((b, i) =>
      answers[i].trim().toLowerCase() === b.answer.toLowerCase() ? "correct" : "wrong"
    ) as Array<"idle" | "correct" | "wrong">;
    setResults(newResults);
    setSubmitted(true);
    const correct = newResults.filter((r) => r === "correct").length;
    setScore(Math.round((correct / blanks.length) * 100));
    // Log each wrong blank
    newResults.forEach((res, i) => {
      if (res === "wrong") {
        logFoundationEvent({ type: "error", moduleId: lesson.moduleId ?? 12, lessonId: lesson.id, lessonTitle: lesson.title, typed: answers[i], expected: blanks[i].answer });
      }
    });
  }

  function handleRetry() {
    setAnswers(blanks.map(() => ""));
    setResults(blanks.map(() => "idle"));
    setSubmitted(false);
    setScore(0);
  }

  const allCorrect = submitted && results.every((r) => r === "correct");

  useEffect(() => {
    if (allCorrect) {
      const t = setTimeout(() => onComplete?.(lesson.id), 1000);
      return () => clearTimeout(t);
    }
  }, [allCorrect, onComplete, lesson.id]);

  return (
    <div className="fbe-wrap">
      <div className="fbe-list">
        {blanks.map((b, i) => {
          const parts = b.template.split("________");
          const status = results[i];
          return (
            <div key={i} className={`fbe-item ${status === "correct" ? "fbe-item--ok" : status === "wrong" ? "fbe-item--err" : ""}`}>
              <div className="fbe-context">{b.emoji && <span className="fbe-emoji">{b.emoji}</span>} <span className="fbe-sw">{b.sentence_sw}</span></div>
              <div className="fbe-sentence">
                <span className="fbe-text">{parts[0]}</span>
                <input
                  className={`fbe-input ${status === "correct" ? "fbe-input--ok" : status === "wrong" ? "fbe-input--err" : ""}`}
                  value={answers[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  disabled={submitted}
                  placeholder="___"
                  aria-label={`Blank ${i + 1}`}
                />
                <span className="fbe-text">{parts[1]}</span>
              </div>
              {status === "correct" && <p className="fbe-result fbe-result--ok">✓ Correct!</p>}
              {status === "wrong" && (
                <p className="fbe-result fbe-result--err">✗ Answer: <strong>{b.answer}</strong> — {showSwahili ? b.hint_sw : `Hint: ${b.hint_sw}`}</p>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <button
          className="fbe-submit-btn"
          onClick={handleSubmit}
          disabled={answers.some((a) => !a.trim())}
        >
          Submit Answers
        </button>
      ) : (
        <div className="fbe-score-wrap">
          <div className="fbe-score">
            <span className="fbe-score-num">{score}%</span>
            <span className="fbe-score-label">{score === 100 ? "Perfect! 🎉" : score >= 50 ? "Good effort! Keep going." : "Review and try again."}</span>
          </div>
          {!allCorrect && (
            <button className="fbe-retry-btn" onClick={handleRetry}>Try Again</button>
          )}
        </div>
      )}

      <style>{`
        .fbe-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
        .fbe-list { display: flex; flex-direction: column; gap: 1rem; }
        .fbe-item { display: flex; flex-direction: column; gap: 0.35rem; padding: 0.8rem 1rem; background: rgba(255,255,255,0.025); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.65rem; transition: border-color 0.2s; }
        .fbe-item--ok { border-color: rgba(52,211,153,0.35); background: rgba(52,211,153,0.04); }
        .fbe-item--err { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.03); }
        .fbe-context { display: flex; align-items: center; gap: 0.4rem; }
        .fbe-emoji { font-size: 1rem; }
        .fbe-sw { font-size: 0.75rem; color: #64748b; font-style: italic; }
        .fbe-sentence { display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem; }
        .fbe-text { font-size: 0.92rem; color: #e2e8f0; }
        .fbe-input { width: 110px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.12); border-radius: 0.4rem; padding: 0.3rem 0.55rem; color: #e2e8f0; font-size: 0.9rem; outline: none; text-align: center; transition: border-color 0.15s; }
        .fbe-input:focus { border-color: rgba(52,211,153,0.4); }
        .fbe-input--ok { border-color: rgba(52,211,153,0.5) !important; color: #34d399; }
        .fbe-input--err { border-color: rgba(248,113,113,0.5) !important; color: #f87171; }
        .fbe-result { font-size: 0.78rem; margin: 0; }
        .fbe-result--ok { color: #34d399; }
        .fbe-result--err { color: #f87171; }
        .fbe-submit-btn { align-self: flex-start; padding: 0.6rem 1.4rem; background: rgba(52,211,153,0.1); border: 1.5px solid rgba(52,211,153,0.3); border-radius: 0.6rem; color: #34d399; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
        .fbe-submit-btn:hover:not(:disabled) { background: rgba(52,211,153,0.2); }
        .fbe-submit-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .fbe-score-wrap { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .fbe-score { display: flex; align-items: baseline; gap: 0.5rem; }
        .fbe-score-num { font-size: 1.6rem; font-weight: 800; color: #34d399; }
        .fbe-score-label { font-size: 0.85rem; color: #94a3b8; }
        .fbe-retry-btn { padding: 0.5rem 1.1rem; background: rgba(248,113,113,0.08); border: 1.5px solid rgba(248,113,113,0.25); border-radius: 0.6rem; color: #f87171; font-size: 0.85rem; font-weight: 700; cursor: pointer; }
      `}</style>
    </div>
  );
}

// ── Certificate Section ───────────────────────────────────────────────────

interface SkillEntry {
  skill: string;
  skill_sw: string;
  emoji: string;
  color: string;
}

function CertificateSection({ lesson, showSwahili, onComplete }: { lesson: LessonData; showSwahili: boolean; onComplete?: (id: string) => void }) {
  const skills = (lesson.skills_mastered ?? []) as SkillEntry[];
  const [confettiActive, setConfettiActive] = useState(false);
  const [claimed, setClaimed] = useState(false);

  function handleClaim() {
    setConfettiActive(true);
    setClaimed(true);
    onComplete?.(lesson.id);
    // Navigate after delay if next_step_url provided
    if (lesson.next_step_url) {
      setTimeout(() => {
        window.location.href = lesson.next_step_url!;
      }, 3500);
    }
  }

  return (
    <div className="cert-wrap">
      {/* Confetti overlay */}
      {confettiActive && (
        <div className="cert-confetti" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="cert-confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1.5}s`,
                background: ["#34d399", "#818cf8", "#f59e0b", "#f97316", "#ec4899", "#06b6d4"][i % 6],
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="cert-header">
        <div className="cert-badge">🎓</div>
        <h2 className="cert-title">{showSwahili ? lesson.title_sw ?? lesson.title : lesson.title}</h2>
        <p className="cert-sofia">{showSwahili ? lesson.sofia_message_sw ?? lesson.sofia_message : lesson.sofia_message}</p>
      </div>

      {/* Skills report */}
      {skills.length > 0 && (
        <div className="cert-skills-section">
          <p className="cert-skills-heading">Skills Mastered / Ujuzi Uliopatikana</p>
          <div className="cert-skills-grid">
            {skills.map((s) => (
              <div key={s.skill} className="cert-skill-card" style={{ borderColor: `${s.color}40` }}>
                <span className="cert-skill-emoji">{s.emoji}</span>
                <div>
                  <p className="cert-skill-name" style={{ color: s.color }}>{s.skill}</p>
                  <p className="cert-skill-sw">{s.skill_sw}</p>
                </div>
                <span className="cert-skill-check">✓</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next step CTA */}
      <div className="cert-next">
        {!claimed ? (
          <button className="cert-claim-btn" onClick={handleClaim}>
            🎉 Claim Certificate & Continue
          </button>
        ) : (
          <div className="cert-claimed">
            <span className="cert-claimed-icon">✅</span>
            <div>
              <p className="cert-claimed-title">Foundation Complete!</p>
              <p className="cert-claimed-sub">Redirecting to {lesson.next_step ?? "Hirely Coach"}…</p>
            </div>
          </div>
        )}
        {lesson.next_step && !claimed && (
          <p className="cert-next-hint">Next: <strong>{showSwahili ? lesson.next_step_sw ?? lesson.next_step : lesson.next_step}</strong></p>
        )}
      </div>

      <style>{`
        .cert-wrap { display: flex; flex-direction: column; gap: 1.5rem; position: relative; overflow: hidden; }
        .cert-confetti { position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden; }
        .cert-confetti-piece { position: absolute; top: -10px; width: 8px; height: 14px; border-radius: 2px; opacity: 0.85; animation: cert-fall 2.8s ease-in forwards; }
        @keyframes cert-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(720deg); opacity: 0; } }
        .cert-header { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; text-align: center; padding: 1.5rem; background: linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(129,140,248,0.06) 100%); border: 1.5px solid rgba(52,211,153,0.15); border-radius: 1rem; }
        .cert-badge { font-size: 3rem; }
        .cert-title { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; margin: 0; letter-spacing: -0.02em; }
        .cert-sofia { font-size: 0.85rem; color: #94a3b8; margin: 0; max-width: 440px; line-height: 1.5; }
        .cert-skills-section { display: flex; flex-direction: column; gap: 0.65rem; }
        .cert-skills-heading { font-size: 0.8rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin: 0; font-weight: 600; }
        .cert-skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.6rem; }
        .cert-skill-card { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.85rem; background: rgba(255,255,255,0.025); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 0.65rem; }
        .cert-skill-emoji { font-size: 1.2rem; flex-shrink: 0; }
        .cert-skill-name { font-size: 0.82rem; font-weight: 700; margin: 0; }
        .cert-skill-sw { font-size: 0.72rem; color: #64748b; margin: 0; font-style: italic; }
        .cert-skill-check { margin-left: auto; color: #34d399; font-size: 0.9rem; font-weight: 700; flex-shrink: 0; }
        .cert-next { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start; }
        .cert-claim-btn { padding: 0.75rem 1.75rem; background: linear-gradient(135deg, #34d399 0%, #818cf8 100%); border: none; border-radius: 0.75rem; color: #0f172a; font-size: 1rem; font-weight: 800; cursor: pointer; transition: opacity 0.15s; }
        .cert-claim-btn:hover { opacity: 0.9; }
        .cert-next-hint { font-size: 0.8rem; color: #64748b; margin: 0; }
        .cert-claimed { display: flex; align-items: center; gap: 0.75rem; background: rgba(52,211,153,0.08); border: 1.5px solid rgba(52,211,153,0.25); border-radius: 0.75rem; padding: 0.85rem 1.1rem; }
        .cert-claimed-icon { font-size: 1.5rem; flex-shrink: 0; }
        .cert-claimed-title { font-size: 1rem; font-weight: 700; color: #34d399; margin: 0 0 0.1rem; }
        .cert-claimed-sub { font-size: 0.8rem; color: #64748b; margin: 0; }
      `}</style>
    </div>
  );
}
