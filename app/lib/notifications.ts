import { DEFAULT_RANK_THRESHOLDS, derivePrestigeRank, getNextRankRequirement, type PrestigeRank } from "@/app/lib/rankSystem";

export type NotificationType = "Achievement" | "Reminder" | "JobAlert";

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  createdAt: number;
  read: boolean;
};

export type NotificationSnapshot = {
  displayName: string;
  totalIp: number;
  currentStreak: number;
  latestImpactAt: number;
  profileCompletionPct: number;
  targetJobCount: number;
  latestImpactTitle: string;
  latestMockScore: number;
  globalResumeScore: number;
};

export function createNotification(
  partial: Omit<NotificationRecord, "id" | "createdAt" | "read">,
  now = Date.now()
): NotificationRecord {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    read: false,
    ...partial,
  };
}

export function getRankCoachMessage(rank: PrestigeRank, pointsToNextRank: number): string {
  if (rank === "MASTER") {
    return "Your Impact Log is looking elite. It is time to convert these wins into a promotion. Ready to draft your Growth Conversation script?";
  }
  if (rank === "PROFESSIONAL") {
    return "You have mastered the basics. Now, let us sharpen your edge. Have you tried a Stress-Test simulation in the Interview Coach this week?";
  }
  if (pointsToNextRank > 0) {
    return `You are building the habit. You only need ${pointsToNextRank} IP to level up.`;
  }
  return "You are building the habit. Consistency is what gets you hired.";
}

export function getStreakMessage(currentStreak: number): string {
  if (currentStreak > 0) return "Keep the flame alive!";
  return "Start a new streak today.";
}

export function isMondayMorning(date = new Date()): boolean {
  return date.getDay() === 1 && date.getHours() < 12;
}

export function daysSince(timestamp: number, now = Date.now()): number {
  if (!timestamp) return 999;
  return Math.floor((now - timestamp) / 86400000);
}

export function buildBaseLayerNotifications(snapshot: NotificationSnapshot, now = Date.now()): NotificationRecord[] {
  const list: NotificationRecord[] = [];
  const date = new Date(now);

  if (isMondayMorning(date)) {
    list.push(
      createNotification(
        {
          type: "Reminder",
          title: "The Weekly Reset",
          message: "Fresh week, fresh wins. Do not forget to log your achievements in the Impact Log today.",
          ctaLabel: "Log A Win",
          ctaHref: "/growthhub",
        },
        now
      )
    );
  }

  if (daysSince(snapshot.latestImpactAt, now) >= 14) {
    list.push(
      createNotification(
        {
          type: "Reminder",
          title: "The Comeback",
          message: "Your career does not pause, even if you do. Spend 5 minutes in the Academy today.",
          ctaLabel: "Open Academy",
          ctaHref: "/courses",
        },
        now
      )
    );
  }

  if (snapshot.profileCompletionPct >= 90 && snapshot.targetJobCount <= 0) {
    list.push(
      createNotification(
        {
          type: "Reminder",
          title: "The Foundation",
          message: "You are 90% ready. Add one target job to unlock your personalized interview prep.",
          ctaLabel: "Add Target Job",
          ctaHref: "/growthhub/targeting",
        },
        now
      )
    );
  }

  // Achievement: freshly logged impact win (< 2 hours old)
  if (
    snapshot.latestImpactAt &&
    snapshot.latestImpactTitle &&
    now - snapshot.latestImpactAt < 2 * 60 * 60 * 1000
  ) {
    const preview = snapshot.latestImpactTitle.slice(0, 64);
    list.push(
      // Use latestImpactAt as the `now` so the ID is stable across heartbeats
      createNotification(
        {
          type: "Achievement",
          title: "Impact Verified",
          message: `Win logged: "${preview}"`,
          ctaLabel: "View Impact Ledger",
          ctaHref: "/canvas",
        },
        snapshot.latestImpactAt
      )
    );
  }

  return list;
}

export function buildWeeklyImpactEmail(snapshot: NotificationSnapshot) {
  const rank = derivePrestigeRank(snapshot, DEFAULT_RANK_THRESHOLDS);
  const nextReq = getNextRankRequirement(snapshot, DEFAULT_RANK_THRESHOLDS);
  const nextThreshold = rank === "APPRENTICE" ? DEFAULT_RANK_THRESHOLDS.professionalIp : DEFAULT_RANK_THRESHOLDS.masterIp;
  const progressPct = Math.max(0, Math.min(100, Math.round((snapshot.totalIp / Math.max(1, nextThreshold)) * 100)));
  const subject = `Weekly Impact Report: You are ${nextReq.pointsToNextRank} IP from a Rank Up!`;

  const html = `
<div style="max-width:640px;margin:0 auto;padding:24px;font-family:Montserrat,Inter,Arial,sans-serif;background:#f8fafc;color:#0f172a;">
  <h1 style="font-size:24px;line-height:1.2;margin:0 0 14px;">Weekly Impact Report</h1>
  <p style="margin:0 0 18px;font-size:14px;">Hello ${snapshot.displayName || "Professional"}, you made moves this week.</p>
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
    <p style="margin:0 0 8px;font-size:14px;"><strong>Current Rank:</strong> ${rank}</p>
    <p style="margin:0 0 8px;font-size:14px;"><strong>Total Impact Points:</strong> ${snapshot.totalIp} IP</p>
    <p style="margin:0 0 8px;font-size:14px;"><strong>Weekly Streak:</strong> ${snapshot.currentStreak} Weeks</p>
    <p style="margin:0 0 12px;font-size:14px;"><strong>Top Win This Week:</strong> ${snapshot.latestImpactTitle || "No win logged yet"}</p>
    <div style="height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
      <div style="height:10px;width:${progressPct}%;background:linear-gradient(90deg,#0f766e,#10b981);"></div>
    </div>
    <p style="margin:10px 0 0;font-size:12px;color:#334155;">Progress to next rank: ${progressPct}%</p>
  </div>
  <p style="margin:16px 0 8px;font-size:14px;"><strong>Coach recommendation:</strong> Complete one Interview Simulation this week focused on Behavioral Questions.</p>
  <p style="margin:0;font-size:13px;color:#334155;">Log your wins for this week, then start an interview.</p>
</div>`;

  return { subject, html };
}
