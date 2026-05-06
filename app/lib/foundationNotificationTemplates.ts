/**
 * Foundation Notification Templates (Swahili-first)
 *
 * Rules:
 * - max 3 notifications per week
 * - max 1 notification per day
 * - only 3 categories: habit_reminder, progress_highlight, re_engagement
 * - messages: 8-14 words, warm/encouraging tone
 * - optional English word embedded to reinforce learning
 */

export type FoundationNotificationCategory =
  | "habit_reminder"
  | "progress_highlight"
  | "re_engagement";

export type FoundationNotificationTrigger =
  | "daily_streak_check"       // sent when user hasn't opened app today
  | "lesson_milestone"         // 3 lessons in a row
  | "week_consistency"         // 1 full week of activity
  | "module_complete"          // finished a module
  | "vocabulary_milestone"     // added 10+ new words this week
  | "half_course"              // reached 50% of course
  | "inactivity_3d"            // 3 days without a session
  | "inactivity_5d"            // 5+ days without a session
  | "return_after_long_break"; // returned after 7+ days away

export interface FoundationNotificationTemplate {
  id: string;
  category: FoundationNotificationCategory;
  trigger: FoundationNotificationTrigger;
  /** Swahili title shown in notification header */
  titleSw: string;
  /** Swahili body (8-14 words). May include one English word in quotes. */
  bodySw: string;
  /** Optional English title for EN language pref users */
  titleEn?: string;
  /** Optional English body for EN language pref users */
  bodyEn?: string;
  /** Where tapping the notification takes the user */
  href: string;
  /** User segments this message is suitable for */
  targetSegments: Array<"active" | "casual" | "struggling" | "returning" | "all">;
}

export const FOUNDATION_NOTIFICATION_TEMPLATES: FoundationNotificationTemplate[] = [
  // ── HABIT REMINDERS ─────────────────────────────────────────────────────
  {
    id: "habit_daily_gentle",
    category: "habit_reminder",
    trigger: "daily_streak_check",
    titleSw: "Wakati wa kujifunza!",
    bodySw: "Dakika 5 za kujifunza leo — unaweza.",
    titleEn: "Time to learn!",
    bodyEn: "Just 5 minutes of learning today — you can do it.",
    href: "/foundation/home",
    targetSegments: ["casual", "struggling", "all"],
  },
  {
    id: "habit_continue_yesterday",
    category: "habit_reminder",
    trigger: "daily_streak_check",
    titleSw: "Endelea na safari yako",
    bodySw: "Uko tayari kuendelea na somo lako la jana?",
    titleEn: "Continue your journey",
    bodyEn: "Ready to continue from where you left off yesterday?",
    href: "/foundation/home",
    targetSegments: ["casual", "active"],
  },
  {
    id: "habit_word_of_day",
    category: "habit_reminder",
    trigger: "daily_streak_check",
    titleSw: "Neno la leo: \"improve\"",
    bodySw: "Word of the day: improve — kuboresha. Jifunze zaidi leo.",
    titleEn: "Word of the day",
    bodyEn: "Word of the day: improve — kuboresha. Learn more today.",
    href: "/foundation/home",
    targetSegments: ["all"],
  },

  // ── PROGRESS HIGHLIGHTS ─────────────────────────────────────────────────
  {
    id: "progress_vocab_10",
    category: "progress_highlight",
    trigger: "vocabulary_milestone",
    titleSw: "Hongera! Maneno mapya 10",
    bodySw: "Umeongeza maneno mapya 10 wiki hii. Endelea hivyo!",
    titleEn: "Vocabulary milestone!",
    bodyEn: "You've added 10 new words this week. Keep it up!",
    href: "/foundation/home",
    targetSegments: ["all"],
  },
  {
    id: "progress_vocab_20",
    category: "progress_highlight",
    trigger: "vocabulary_milestone",
    titleSw: "Hongera! Maneno mapya 20",
    bodySw: "Umeongeza maneno mapya 20 wiki hii — unajifunza kwa kasi!",
    titleEn: "Amazing progress!",
    bodyEn: "You've added 20 new words this week — you're learning fast!",
    href: "/foundation/home",
    targetSegments: ["active"],
  },
  {
    id: "progress_half_course",
    category: "progress_highlight",
    trigger: "half_course",
    titleSw: "Nusu ya safari umefika!",
    bodySw: "Umefika nusu ya kozi ya Beginner. Hatua kubwa!",
    titleEn: "Halfway there!",
    bodyEn: "You've reached the halfway point of the Beginner course. Big step!",
    href: "/foundation/home",
    targetSegments: ["all"],
  },
  {
    id: "progress_module_complete",
    category: "progress_highlight",
    trigger: "module_complete",
    titleSw: "Moduli imekamilika!",
    bodySw: "Hongera! Umemaliza moduli moja. Moduli inayofuata inakusubiri.",
    titleEn: "Module complete!",
    bodyEn: "Congratulations! You finished a module. The next one awaits.",
    href: "/foundation/home",
    targetSegments: ["all"],
  },
  {
    id: "progress_3_lessons_streak",
    category: "progress_highlight",
    trigger: "lesson_milestone",
    titleSw: "Masomo 3 mfululizo!",
    bodySw: "Umefanya masomo 3 mfululizo. Unafanya vizuri sana!",
    titleEn: "3 lessons in a row!",
    bodyEn: "You completed 3 lessons in a row. You're doing great!",
    href: "/foundation/home",
    targetSegments: ["active", "casual"],
  },
  {
    id: "progress_week_consistency",
    category: "progress_highlight",
    trigger: "week_consistency",
    titleSw: "Wiki nzima ya kujifunza!",
    bodySw: "Umejifunza kila siku wiki hii. Mafanikio makubwa yanakungoja!",
    titleEn: "Full week of learning!",
    bodyEn: "You've learned every day this week. Big achievements await!",
    href: "/foundation/home",
    targetSegments: ["active"],
  },
  {
    id: "progress_near_finish",
    category: "progress_highlight",
    trigger: "lesson_milestone",
    titleSw: "Karibu kumaliza!",
    bodySw: "Uko karibu kumaliza somo la past tense. Endelea!",
    titleEn: "Almost done!",
    bodyEn: "You're close to finishing the past tense lesson. Keep going!",
    href: "/foundation/home",
    targetSegments: ["all"],
  },

  // ── RE-ENGAGEMENT NUDGES ────────────────────────────────────────────────
  {
    id: "reengagement_3d_soft",
    category: "re_engagement",
    trigger: "inactivity_3d",
    titleSw: "Tunakukumbuka!",
    bodySw: "Tumekukosa! Unataka kuendelea na somo la verbs?",
    titleEn: "We missed you!",
    bodyEn: "We missed you! Want to continue your verbs lesson?",
    href: "/foundation/home",
    targetSegments: ["casual", "struggling"],
  },
  {
    id: "reengagement_5d_gentle",
    category: "re_engagement",
    trigger: "inactivity_5d",
    titleSw: "Rudi uendelee na safari",
    bodySw: "Tumekukosa! Rudi uendelee na safari yako ya Kiingereza.",
    titleEn: "Come back to your journey",
    bodyEn: "We've missed you! Return and continue your English journey.",
    href: "/foundation/home",
    targetSegments: ["struggling", "casual"],
  },
  {
    id: "reengagement_small_steps",
    category: "re_engagement",
    trigger: "inactivity_3d",
    titleSw: "Hatua ndogo huleta mafanikio",
    bodySw: "Kumbuka: hatua ndogo huleta mafanikio makubwa. Anza leo!",
    titleEn: "Small steps, big results",
    bodyEn: "Remember: small steps lead to big results. Start today!",
    href: "/foundation/home",
    targetSegments: ["struggling", "casual"],
  },
  {
    id: "reengagement_welcome_back",
    category: "re_engagement",
    trigger: "return_after_long_break",
    titleSw: "Karibu tena!",
    bodySw: "Karibu tena! Tunaanza upya pamoja. Uko tayari?",
    titleEn: "Welcome back!",
    bodyEn: "Welcome back! Let's start fresh together. Are you ready?",
    href: "/foundation/home",
    targetSegments: ["returning"],
  },
];

/**
 * Frequency rules for the notification system.
 * These are enforced by the backend before sending any notification.
 */
export const FOUNDATION_NOTIFICATION_FREQUENCY = {
  /** Maximum notifications per week (default) */
  maxPerWeek: 3,
  /** Maximum notifications per day */
  maxPerDay: 1,
  /** Days of inactivity before sending re-engagement nudge */
  reEngagementAfterDays: 3,
  /** Days of inactivity before sending stronger nudge */
  strongNudgeAfterDays: 5,
} as const;

/**
 * User activity segments for adaptive notification logic.
 * Determined server-side by analysing lesson completion frequency.
 */
export type UserActivitySegment = "active" | "casual" | "struggling" | "returning";

export function classifyUserSegment(params: {
  lessonsLast7Days: number;
  daysSinceLastSession: number;
  isReturningAfterLongBreak: boolean;
}): UserActivitySegment {
  const { lessonsLast7Days, daysSinceLastSession, isReturningAfterLongBreak } = params;

  if (isReturningAfterLongBreak) return "returning";
  if (daysSinceLastSession >= 3) return "struggling";
  if (lessonsLast7Days >= 5) return "active";
  return "casual";
}

/**
 * Pick templates that match a given trigger and user segment,
 * filtering out any already sent recently.
 */
export function selectTemplatesForTrigger(
  trigger: FoundationNotificationTrigger,
  segment: UserActivitySegment,
  recentlyUsedIds: string[] = [],
): FoundationNotificationTemplate[] {
  return FOUNDATION_NOTIFICATION_TEMPLATES.filter(
    (t) =>
      t.trigger === trigger &&
      (t.targetSegments.includes(segment) || t.targetSegments.includes("all")) &&
      !recentlyUsedIds.includes(t.id),
  );
}
