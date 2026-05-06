/**
 * In-memory Foundation notification store.
 * Manages notification templates, schedules, and A/B test variants.
 */

export type NotificationChannel = "lesson_reminders" | "milestone_alerts" | "streak_alerts";

export type NotificationVariant = {
  id: string;
  label: "A" | "B";
  title: string;
  body: string;
  bodySwahili: string;
};

export type ScheduledNotification = {
  id: string;
  name: string;
  channel: NotificationChannel;
  trigger: "daily_streak" | "skill_unlock" | "nudge" | "morning_sync" | "congratulatory";
  scheduleHour: number; // 0-23 UTC+3 local
  abTest: boolean;
  variants: [NotificationVariant, NotificationVariant];
  deepLinkLessonId: string | null;
  richMedia: boolean;
  enabled: boolean;
  sentCount: number;
  createdAt: number;
};

const DEFAULT_NOTIFICATIONS: ScheduledNotification[] = [
  {
    id: "daily-nudge-001",
    name: "Daily Nudge",
    channel: "streak_alerts",
    trigger: "nudge",
    scheduleHour: 8,
    abTest: false,
    variants: [
      {
        id: "daily-nudge-001-a",
        label: "A",
        title: "Daily Nudge",
        body: "Sofia is waiting! Let's start Lesson {{lesson_no}} now. 📚",
        bodySwahili: "Sofia anakusubiri! Tuanze Somo la {{lesson_no}} sasa. 📚",
      },
      {
        id: "daily-nudge-001-b",
        label: "B",
        title: "Daily Nudge",
        body: "Sofia is waiting! Let's start Lesson {{lesson_no}} now. 📚",
        bodySwahili: "Sofia anakusubiri! Tuanze Somo la {{lesson_no}} sasa. 📚",
      },
    ],
    deepLinkLessonId: null,
    richMedia: false,
    enabled: true,
    sentCount: 0,
    createdAt: Date.now(),
  },
  {
    id: "module-unlock-001",
    name: "Module Unlock",
    channel: "milestone_alerts",
    trigger: "skill_unlock",
    scheduleHour: 0,
    abTest: false,
    variants: [
      {
        id: "module-unlock-001-a",
        label: "A",
        title: "Module Unlock",
        body: "Congratulations! New lessons are open. Tap to see them. 🔓",
        bodySwahili: "Hongera! Masomo mapya yamefunguliwa. Gusa hapa uyaone. 🔓",
      },
      {
        id: "module-unlock-001-b",
        label: "B",
        title: "Module Unlock",
        body: "Congratulations! New lessons are open. Tap to see them. 🔓",
        bodySwahili: "Hongera! Masomo mapya yamefunguliwa. Gusa hapa uyaone. 🔓",
      },
    ],
    deepLinkLessonId: null,
    richMedia: false,
    enabled: true,
    sentCount: 0,
    createdAt: Date.now(),
  },
  {
    id: "new-video-001",
    name: "New Video",
    channel: "lesson_reminders",
    trigger: "morning_sync",
    scheduleHour: 0,
    abTest: false,
    variants: [
      {
        id: "new-video-001-a",
        label: "A",
        title: "New Video",
        body: "New video added! Watch to see how to pronounce the words. 🎬",
        bodySwahili: "Video mpya imeongezwa! Itazame uone jinsi ya kutamka maneno. 🎬",
      },
      {
        id: "new-video-001-b",
        label: "B",
        title: "New Video",
        body: "New video added! Watch to see how to pronounce the words. 🎬",
        bodySwahili: "Video mpya imeongezwa! Itazame uone jinsi ya kutamka maneno. 🎬",
      },
    ],
    deepLinkLessonId: null,
    richMedia: true,
    enabled: true,
    sentCount: 0,
    createdAt: Date.now(),
  },
  {
    id: "streak-alert-001",
    name: "Streak Alert",
    channel: "streak_alerts",
    trigger: "daily_streak",
    scheduleHour: 19,
    abTest: false,
    variants: [
      {
        id: "streak-alert-001-a",
        label: "A",
        title: "Streak Alert",
        body: "{{count}} days in a row! Don't break your streak today. 🔥",
        bodySwahili: "Siku {{count}} mfululizo! Usivunje mlolongo wako leo. 🔥",
      },
      {
        id: "streak-alert-001-b",
        label: "B",
        title: "Streak Alert",
        body: "{{count}} days in a row! Don't break your streak today. 🔥",
        bodySwahili: "Siku {{count}} mfululizo! Usivunje mlolongo wako leo. 🔥",
      },
    ],
    deepLinkLessonId: null,
    richMedia: false,
    enabled: true,
    sentCount: 0,
    createdAt: Date.now(),
  },
  {
    id: "sofia-tip-001",
    name: "Sofia's Tip",
    channel: "lesson_reminders",
    trigger: "nudge",
    scheduleHour: 12,
    abTest: true,
    variants: [
      {
        id: "sofia-tip-001-a",
        label: "A",
        title: "Sofia's Tip",
        body: "Remember? The letter 'H' in 'Head' must sound strong. Try Lesson 13 again!",
        bodySwahili: "Umekumbuka? Herufi 'H' katika 'Head' inatamkwa kwa nguvu. Jaribu tena katika Somo la 13!",
      },
      {
        id: "sofia-tip-001-b",
        label: "B",
        title: "Milestone",
        body: "You're halfway through the lessons. Only a few steps left to finish the foundation.",
        bodySwahili: "Umemaliza nusu ya masomo! Bado hatua chache tu umalize misingi yote.",
      },
    ],
    deepLinkLessonId: "13",
    richMedia: false,
    enabled: true,
    sentCount: 0,
    createdAt: Date.now(),
  },
];

const g = globalThis as typeof globalThis & {
  __foundationNotifications?: ScheduledNotification[];
};
if (!g.__foundationNotifications) g.__foundationNotifications = structuredClone(DEFAULT_NOTIFICATIONS);

export function getNotifications(): ScheduledNotification[] {
  return g.__foundationNotifications!;
}

export function upsertNotification(n: ScheduledNotification) {
  const store = g.__foundationNotifications!;
  const idx = store.findIndex((s) => s.id === n.id);
  if (idx === -1) {
    store.unshift(n);
  } else {
    store[idx] = n;
  }
}

export function deleteNotification(id: string) {
  g.__foundationNotifications = g.__foundationNotifications!.filter((n) => n.id !== id);
}
