import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { COURSE_CATALOG } from "@/app/courses/data";
import { LEVELS } from "@/app/lib/progression";
import { derivePrestigeRank, getNextRankRequirement } from "@/app/lib/rankSystem";

type Recommendation = {
  type: "SkillPath" | "PolishPath" | "HabitPath";
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
};

function toSafeInt(value: unknown): number {
  const n = Math.floor(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function minIpForLevel(levelTitle: string): number {
  return LEVELS.find((level) => level.title === levelTitle)?.minIp ?? 0;
}

function normalizeProgression(input: unknown) {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    totalIp: toSafeInt(row.totalIp),
    latestMockScore: toSafeInt(row.latestMockScore),
    interviewScores: Array.isArray(row.interviewScores)
      ? row.interviewScores.map((score) => toSafeInt(score)).slice(0, 3)
      : [],
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

  const progression = normalizeProgression(metadata.progressionState);
  const resumeAudit = (metadata.resumeAuditState ?? {}) as Record<string, unknown>;
  const impactEntries = Array.isArray(metadata.impactLedger) ? metadata.impactLedger : [];
  const completedCourses = Array.isArray(metadata.completedCourses)
    ? new Set(metadata.completedCourses.map((id) => String(id || "").trim()).filter(Boolean))
    : new Set<string>();

  const state = {
    totalIp: progression.totalIp,
    latestMockScore: progression.latestMockScore,
    globalResumeScore: toSafeInt(resumeAudit.overallScore),
  };

  const currentRank = derivePrestigeRank(state);
  const nextRankRequirements = getNextRankRequirement(state);

  const unlockedCourses = COURSE_CATALOG.filter((course) => progression.totalIp >= minIpForLevel(course.level));
  const lockedCourses = COURSE_CATALOG.filter((course) => progression.totalIp < minIpForLevel(course.level));

  const targetLocked = lockedCourses.find((course) => {
    const levelMinIp = minIpForLevel(course.level);
    return levelMinIp - progression.totalIp <= 1200;
  });

  let skillMessage = "Run one Interview Simulation focused on behavioral responses to tighten your result framing.";
  if (targetLocked?.prerequisiteCourseId) {
    const prerequisiteId = targetLocked.prerequisiteId || targetLocked.prerequisiteCourseId;
    const prereq = COURSE_CATALOG.find((course) => course.id === prerequisiteId);
    if (prereq) {
      skillMessage = `You are aiming for ${targetLocked.title}, but that lesson is rank-gated. Complete ${prereq.title} first to unlock the right foundation and explainable progression.`;
    }
  }

  const latestThreeScores = progression.interviewScores.length
    ? progression.interviewScores
    : [progression.latestMockScore].filter((score) => score > 0);

  const polishGap = Math.max(0, 90 - state.globalResumeScore);
  const interviewGap = Math.max(0, 85 - state.latestMockScore);

  const recommendations: Recommendation[] = [
    {
      type: "SkillPath",
      title: "Skill Path",
      message: skillMessage,
      ctaLabel: "Open Academy",
      ctaHref: "/courses",
    },
    {
      type: "PolishPath",
      title: "Polish Path",
      message:
        polishGap > 0 || interviewGap > 0
          ? `You are ${interviewGap}% away from Master interview target and ${polishGap}% away from resume target. Re-run a mock interview and one resume optimization pass this week.`
          : "Your polish signals are strong. Keep pressure-testing with a high-difficulty interview simulation.",
      ctaLabel: "Start Interview",
      ctaHref: "/voice?mode=new",
    },
    {
      type: "HabitPath",
      title: "Habit Path",
      message:
        impactEntries.length === 0
          ? "Impact Log is empty. Log three wins this week to build momentum and unlock faster rank progression."
          : `You have ${impactEntries.length} logged wins. Keep streak momentum by logging one fresh impact entry this week.`,
      ctaLabel: "Log A Win",
      ctaHref: "/growthhub",
    },
  ];

  return NextResponse.json({
    current_rank: currentRank,
    next_rank_requirements: nextRankRequirements,
    gap_analysis: {
      interviewGapToMaster: interviewGap,
      resumeGapToMaster: polishGap,
    },
    last_3_interview_scores: latestThreeScores.slice(0, 3),
    unlocked_courses: unlockedCourses.map((course) => ({ id: course.id, title: course.title })),
    locked_courses: lockedCourses.map((course) => ({
      id: course.id,
      title: course.title,
      prerequisite_id: course.prerequisiteId || course.prerequisiteCourseId || null,
    })),
    impact_log_activity: {
      isEmpty: impactEntries.length === 0,
      totalEntries: impactEntries.length,
    },
    recommendations,
  });
}

export async function POST() {
  return GET();
}
