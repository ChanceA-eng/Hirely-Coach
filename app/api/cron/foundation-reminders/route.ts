import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getNotifications } from "@/app/lib/foundationNotificationStore";
import {
  appendFoundationInboxItem,
  createFoundationInboxItem,
  normalizeFoundationInboxState,
} from "@/app/lib/foundationInbox";

type ReminderDispatchState = {
  byTemplate?: Record<string, string>;
  lastRunAt?: number;
};

function isTruthyQuery(value: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function isFoundationUserMetadata(metadata: Record<string, unknown>): boolean {
  const currentMode = String(metadata.current_mode ?? "").toLowerCase();
  const onboardingPath = String(metadata.onboarding_path ?? "").toLowerCase();
  if (currentMode === "foundation" || onboardingPath === "foundation") return true;

  // Fallback: if a user already has foundation structures, treat as foundation user.
  if (metadata.foundation_profile || metadata.foundation_progress) return true;
  return false;
}

function nowInUtcPlus3(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const local = new Date(utcMs + 3 * 60 * 60 * 1000);
  const yyyy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const hh = local.getUTCHours();
  return {
    dateKey: `${yyyy}-${mm}-${dd}`,
    hour: hh,
  };
}

function authValid(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

function renderTemplate(
  text: string,
  values: { userName: string; lessonNo: number; streakCount: number }
): string {
  return text
    .replace(/{{\s*user_name\s*}}/gi, values.userName)
    .replace(/{{\s*lesson_no\s*}}/gi, String(values.lessonNo))
    .replace(/{{\s*count\s*}}/gi, String(values.streakCount));
}

export async function GET(req: NextRequest) {
  if (!authValid(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forceDispatch = isTruthyQuery(req.nextUrl.searchParams.get("force"));
  const client = await clerkClient();
  const templates = getNotifications().filter((template) => template.enabled);
  const now = Date.now();
  const { dateKey, hour } = nowInUtcPlus3(new Date(now));

  const scheduled = forceDispatch
    ? templates.filter((template) => template.channel === "streak_alerts")
    : templates.filter((template) => template.scheduleHour === hour);

  // Fallback daily morning nudge if nothing matches at 8am UTC+3.
  if (scheduled.length === 0 && hour === 8) {
    scheduled.push({
      id: "fallback-morning-nudge",
      name: "Morning Reminder",
      channel: "streak_alerts",
      trigger: "nudge",
      scheduleHour: 8,
      abTest: false,
      variants: [
        {
          id: "fallback-morning-nudge-a",
          label: "A",
          title: "Daily Nudge",
          body: "Sofia is waiting! Let's start Lesson {{lesson_no}} now. 📚",
          bodySwahili: "Sofia anakusubiri! Tuanze Somo la {{lesson_no}} sasa. 📚",
        },
        {
          id: "fallback-morning-nudge-b",
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
      createdAt: now,
    });
  }

  if (scheduled.length === 0) {
    return NextResponse.json({
      ok: true,
      scannedUsers: 0,
      dispatched: 0,
      forceDispatch,
      reason: "No templates scheduled this hour",
    });
  }

  const users = await client.users.getUserList({ limit: 500 });

  let scannedUsers = 0;
  let dispatched = 0;

  for (const user of users.data) {
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
    if (!isFoundationUserMetadata(metadata)) continue;

    scannedUsers += 1;

    const profileRow = (metadata.foundation_profile ?? {}) as Record<string, unknown>;
    const progressRow = (metadata.foundation_progress ?? {}) as Record<string, unknown>;

    const completedLessons = Array.isArray(progressRow.completedLessons) ? progressRow.completedLessons.length : 0;
    const lessonNo = Math.min(12, Math.max(1, completedLessons + 1));
    const streakCount = Math.max(1, Math.floor(Number(profileRow.total_xp ?? 0) / 50));
    const displayName =
      user.firstName?.trim() || user.fullName?.split(" ")?.[0] || "Learner";

    const inboxState = normalizeFoundationInboxState(metadata.foundationInboxState);
    const dispatchState = (metadata.foundationReminderDispatchState ?? {}) as ReminderDispatchState;
    const byTemplate = { ...(dispatchState.byTemplate ?? {}) };

    let nextNotifications = [...inboxState.notifications];
    let changed = false;

    for (const template of scheduled) {
      const dispatchKey = `${dateKey}:${template.scheduleHour}`;
      if (byTemplate[template.id] === dispatchKey) {
        continue;
      }

      const variant = template.abTest
        ? template.variants[Math.random() < 0.5 ? 0 : 1]
        : template.variants[0];

      const title = renderTemplate(variant.title, {
        userName: displayName,
        lessonNo,
        streakCount,
      });
      const body = renderTemplate(variant.bodySwahili || variant.body, {
        userName: displayName,
        lessonNo,
        streakCount,
      });

      const deepLesson = template.deepLinkLessonId?.trim();
      const href = deepLesson
        ? `/foundation/lesson/${deepLesson.includes("-") ? deepLesson.split("-")[0] : lessonNo}/${deepLesson}`
        : `/foundation/home?autoReminder=${encodeURIComponent(template.id)}`;

      const item = createFoundationInboxItem({
        title,
        body,
        category: "inbox",
        href,
        payload: {
          title,
          body,
          data: {
            screen: "LessonView",
            params: {
              lesson_id: deepLesson || `${lessonNo}-1`,
              module: Number(deepLesson?.split("-")[0] || lessonNo),
              template_id: template.id,
            },
          },
          sound: "default",
          priority: "high",
        },
      }, now);

      nextNotifications = appendFoundationInboxItem(nextNotifications, item);
      byTemplate[template.id] = dispatchKey;
      changed = true;
      dispatched += 1;
    }

    if (!changed) continue;

    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...metadata,
        foundationInboxState: { notifications: nextNotifications },
        foundationReminderDispatchState: {
          byTemplate,
          lastRunAt: now,
        },
      },
    });
  }

  return NextResponse.json({
    ok: true,
    forceDispatch,
    scannedUsers,
    dispatched,
    templatesScheduled: scheduled.map((template) => template.id),
  });
}
