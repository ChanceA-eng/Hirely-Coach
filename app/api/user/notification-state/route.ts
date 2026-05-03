import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { checkRankUpgrade } from "@/app/lib/checkRankUpgrade";
import {
  buildBaseLayerNotifications,
  buildWeeklyImpactEmail,
  createNotification,
  getRankCoachMessage,
  getStreakMessage,
  type NotificationRecord,
  type NotificationSnapshot,
} from "@/app/lib/notifications";
import { derivePrestigeRank, getNextRankRequirement, type PrestigeRank } from "@/app/lib/rankSystem";

type NotificationState = {
  lastNotifiedAt: number;
  lastWeeklyDigestAt: number;
  lastMondayResetAt: number;
  notifications: NotificationRecord[];
};

type ProgressionState = {
  totalIp: number;
  currentRank: PrestigeRank;
  latestMockScore: number;
  lastInterviewRewardDay: string;
  rankBonusAwardedAt?: number;
  interviewScores: number[];
};

type RequestPayload = {
  event?: "heartbeat" | "job-ready";
  snapshot?: Partial<NotificationSnapshot>;
  jobTitle?: string;
  company?: string;
};

function toSafeInt(value: unknown): number {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function normalizeNotifications(input: unknown): NotificationRecord[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const title = String(row.title || "").trim();
      const message = String(row.message || "").trim();
      const type = row.type === "Achievement" || row.type === "Reminder" || row.type === "JobAlert" ? row.type : "Reminder";
      if (!id || !title || !message) return null;
      return {
        id,
        title,
        message,
        type,
        ctaLabel: String(row.ctaLabel || "").trim() || undefined,
        ctaHref: String(row.ctaHref || "").trim() || undefined,
        createdAt: toSafeInt(row.createdAt),
        read: Boolean(row.read),
      } as NotificationRecord;
    })
    .filter(Boolean)
    .slice(0, 120) as NotificationRecord[];
}

function normalizeNotificationState(input: unknown): NotificationState {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    lastNotifiedAt: toSafeInt(row.lastNotifiedAt),
    lastWeeklyDigestAt: toSafeInt(row.lastWeeklyDigestAt),
    lastMondayResetAt: toSafeInt(row.lastMondayResetAt),
    notifications: normalizeNotifications(row.notifications),
  };
}

function normalizeProgressionState(input: unknown): ProgressionState {
  const row = (input ?? {}) as Record<string, unknown>;
  const currentRank = row.currentRank === "MASTER" || row.currentRank === "PROFESSIONAL" || row.currentRank === "APPRENTICE"
    ? row.currentRank
    : "APPRENTICE";

  return {
    totalIp: toSafeInt(row.totalIp),
    currentRank,
    latestMockScore: toSafeInt(row.latestMockScore),
    lastInterviewRewardDay: String(row.lastInterviewRewardDay || ""),
    rankBonusAwardedAt: toSafeInt(row.rankBonusAwardedAt) || undefined,
    interviewScores: Array.isArray(row.interviewScores)
      ? row.interviewScores.map((score) => toSafeInt(score)).slice(0, 12)
      : [],
  };
}

function normalizeSnapshot(input: Partial<NotificationSnapshot> | undefined, progression: ProgressionState): NotificationSnapshot {
  return {
    displayName: String(input?.displayName || "Professional").trim() || "Professional",
    totalIp: toSafeInt(input?.totalIp ?? progression.totalIp),
    currentStreak: toSafeInt(input?.currentStreak),
    latestImpactAt: toSafeInt(input?.latestImpactAt),
    profileCompletionPct: toSafeInt(input?.profileCompletionPct),
    targetJobCount: toSafeInt(input?.targetJobCount),
    latestImpactTitle: String(input?.latestImpactTitle || "").trim(),
    latestMockScore: toSafeInt(input?.latestMockScore ?? progression.latestMockScore),
    globalResumeScore: toSafeInt(input?.globalResumeScore),
  };
}

function isSameWeek(a: number, b: number): boolean {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  const ta = new Date(Date.UTC(da.getFullYear(), da.getMonth(), da.getDate()));
  const tb = new Date(Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()));
  return Math.abs(ta.getTime() - tb.getTime()) < 7 * 86400000 && da.getDay() <= db.getDay();
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const notificationState = normalizeNotificationState(metadata.notificationState);
  const progressionState = normalizeProgressionState(metadata.progressionState);

  const unreadCount = notificationState.notifications.filter((item) => !item.read).length;
  return NextResponse.json({
    notifications: notificationState.notifications,
    unreadCount,
    lastNotifiedAt: notificationState.lastNotifiedAt,
    progressionState,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { action?: "mark-all-read" | "mark-read"; id?: string };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const notificationState = normalizeNotificationState(metadata.notificationState);

  const notifications = notificationState.notifications.map((item) => {
    if (body.action === "mark-all-read") return { ...item, read: true };
    if (body.action === "mark-read" && body.id && item.id === body.id) return { ...item, read: true };
    return item;
  });

  const nextState: NotificationState = {
    ...notificationState,
    notifications,
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...metadata,
      notificationState: nextState,
    },
  });

  return NextResponse.json({ ok: true, unreadCount: notifications.filter((item) => !item.read).length });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as RequestPayload;
  const now = Date.now();
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  const notificationState = normalizeNotificationState(metadata.notificationState);
  const progressionState = normalizeProgressionState(metadata.progressionState);
  const snapshot = normalizeSnapshot(body.snapshot, progressionState);

  const upgrade = await checkRankUpgrade(userId, {
    totalIp: snapshot.totalIp,
    latestMockScore: snapshot.latestMockScore,
    globalResumeScore: snapshot.globalResumeScore,
    previousRank: progressionState.currentRank,
  });

  const nextReq = getNextRankRequirement(
    {
      totalIp: snapshot.totalIp,
      latestMockScore: snapshot.latestMockScore,
      globalResumeScore: snapshot.globalResumeScore,
    }
  );
  const rank = derivePrestigeRank(
    {
      totalIp: snapshot.totalIp,
      latestMockScore: snapshot.latestMockScore,
      globalResumeScore: snapshot.globalResumeScore,
    }
  );

  const throttleMs = 2 * 60 * 60 * 1000;
  const throttled = now - notificationState.lastNotifiedAt < throttleMs;

  const generated: NotificationRecord[] = [];

  if (!throttled) {
    generated.push(...buildBaseLayerNotifications(snapshot, now));

    generated.push(
      createNotification({
        type: "Reminder",
        title: "Rank Coach",
        message: getRankCoachMessage(rank, nextReq.pointsToNextRank),
        ctaLabel: "Open GrowthHub",
        ctaHref: "/growthhub",
      }, now)
    );

    generated.push(
      createNotification({
        type: "Reminder",
        title: "Impact Streak",
        message: getStreakMessage(snapshot.currentStreak),
        ctaLabel: "Log A Win",
        ctaHref: "/growthhub",
      }, now)
    );

    if (snapshot.currentStreak > 0 && snapshot.latestImpactAt > 0) {
      const daysSinceImpact = Math.floor((now - snapshot.latestImpactAt) / 86400000);
      if (daysSinceImpact >= 7 && nextReq.nextRank) {
        generated.push(
          createNotification({
            type: "Reminder",
            title: "Streak At Risk",
            message: `Do not lose your streak. Log one win now to stay on track for ${nextReq.nextRank}.`,
            ctaLabel: "Protect Streak",
            ctaHref: "/growthhub",
          }, now)
        );
      }
    }

    if (upgrade.masterEvaluationOpen) {
      generated.push(
        createNotification({
          type: "Achievement",
          title: "Master Evaluation Open",
          message: `You have the IP. Current: Interview ${upgrade.latestMockScore}% / Resume ${upgrade.globalResumeScore}%. Targets: 85% and 90%.`,
          ctaLabel: "Enter Master Evaluation",
          ctaHref: "/voice?mode=new",
        }, now)
      );
    }
  }

  if (body.event === "job-ready") {
    const title = String(body.jobTitle || "Role").trim() || "Role";
    const company = String(body.company || "Company").trim() || "Company";
    generated.push(
      createNotification({
        type: "JobAlert",
        title: `Application Ready for ${title} at ${company}`,
        message: "Your assets are optimized and your cover-letter draft is ready. You are one click away from applying.",
        ctaLabel: "Open Resume Optimizer",
        ctaHref: "/upload",
      }, now)
    );
  }

  if (upgrade.rankUp) {
    generated.push(
      createNotification({
        type: "Achievement",
        title: `RANK ACHIEVED: ${upgrade.nextRank}`,
        message: `You have officially moved from ${upgrade.previousRank} to ${upgrade.nextRank}. +500 bonus IP unlocked.`,
        ctaLabel: "View Career Roadmap",
        ctaHref: "/growthhub",
      }, now)
    );
  }

  const deduped = [...generated, ...notificationState.notifications]
    .filter((item, index, all) => all.findIndex((it) => it.title === item.title && it.message === item.message) === index)
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 120);

  const shouldSetWeeklyDigest = !isSameWeek(notificationState.lastWeeklyDigestAt, now);
  const nextNotificationState: NotificationState = {
    lastNotifiedAt: generated.length ? now : notificationState.lastNotifiedAt,
    lastWeeklyDigestAt: shouldSetWeeklyDigest ? now : notificationState.lastWeeklyDigestAt,
    lastMondayResetAt: notificationState.lastMondayResetAt,
    notifications: deduped,
  };

  const nextProgressionState: ProgressionState = {
    ...progressionState,
    totalIp: snapshot.totalIp,
    latestMockScore: snapshot.latestMockScore,
    currentRank: upgrade.nextRank,
  };

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...metadata,
      progressionState: nextProgressionState,
      notificationState: nextNotificationState,
      last_notified_at: nextNotificationState.lastNotifiedAt,
    },
  });

  const weekly = buildWeeklyImpactEmail(snapshot);

  return NextResponse.json({
    notifications: deduped,
    unreadCount: deduped.filter((item) => !item.read).length,
    rank: upgrade.nextRank,
    rankUp: upgrade.rankUp,
    pointsToNextRank: upgrade.pointsToNextRank,
    weeklyImpactReport: weekly,
    masterProgress: {
      ipAchieved: snapshot.totalIp >= 10000,
      interviewAchieved: snapshot.latestMockScore >= 85,
      resumeAchieved: snapshot.globalResumeScore >= 90,
      currentInterviewScore: snapshot.latestMockScore,
      currentResumeScore: snapshot.globalResumeScore,
    },
  });
}
