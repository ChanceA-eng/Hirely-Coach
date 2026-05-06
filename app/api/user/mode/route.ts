import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export type UserMode = "foundation" | "coach";

export type FoundationProgress = {
  completedLessons: string[];
  completedModules: number[];
  assessmentScores: Record<string, number>;
  graduatedAt?: string;
};

export type FoundationProfile = {
  onboarding_complete: boolean;
  total_xp: number;
  language_pref: "en" | "sw";
};

export type FoundationOverride = {
  unlocked_modules: number[];
};

function normalizeProgress(raw: unknown): FoundationProgress {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    completedLessons: Array.isArray(r.completedLessons)
      ? r.completedLessons.map(String)
      : [],
    completedModules: Array.isArray(r.completedModules)
      ? r.completedModules.map(Number)
      : [],
    assessmentScores:
      r.assessmentScores && typeof r.assessmentScores === "object"
        ? (r.assessmentScores as Record<string, number>)
        : {},
    graduatedAt: r.graduatedAt ? String(r.graduatedAt) : undefined,
  };
}

function normalizeFoundationProfile(raw: unknown): FoundationProfile {
  const row = (raw ?? {}) as Record<string, unknown>;
  const totalXp = Math.floor(Number(row.total_xp ?? 0));
  const languagePref = row.language_pref === "sw" ? "sw" : "en";

  return {
    onboarding_complete: Boolean(row.onboarding_complete),
    total_xp: Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0,
    language_pref: languagePref,
  };
}

function normalizeFoundationOverride(raw: unknown): FoundationOverride {
  const row = (raw ?? {}) as Record<string, unknown>;
  const unlockedModules = Array.isArray(row.unlocked_modules)
    ? row.unlocked_modules
        .map(Number)
        .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12)
    : [];

  return {
    unlocked_modules: unlockedModules,
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    current_mode: (meta.current_mode as UserMode) ?? null,
    foundation_progress: normalizeProgress(meta.foundation_progress),
    foundation_profile: normalizeFoundationProfile(meta.foundation_profile),
    foundation_override: normalizeFoundationOverride((meta.interviewAdminOverride as Record<string, unknown>)?.foundationOverride ?? {
      unlocked_modules: (meta.interviewAdminOverride as Record<string, unknown>)?.foundationUnlockedModules,
    }),
  });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<{
    current_mode: UserMode;
    foundation_progress: FoundationProgress;
    foundation_profile: Partial<FoundationProfile>;
    foundation_override: Partial<FoundationOverride>;
  }>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate mode value
  if (body.current_mode && !["foundation", "coach"].includes(body.current_mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;

  const updates: Record<string, unknown> = { ...meta };
  if (body.current_mode !== undefined) updates.current_mode = body.current_mode;
  if (body.foundation_progress !== undefined) {
    updates.foundation_progress = normalizeProgress(body.foundation_progress);
  }
  if (body.foundation_profile !== undefined) {
    updates.foundation_profile = normalizeFoundationProfile({
      ...normalizeFoundationProfile(meta.foundation_profile),
      ...body.foundation_profile,
    });
  }
  if (body.foundation_override !== undefined) {
    const currentOverride = (updates.interviewAdminOverride ?? {}) as Record<string, unknown>;
    const normalized = normalizeFoundationOverride({
      unlocked_modules: body.foundation_override.unlocked_modules,
    });
    updates.interviewAdminOverride = {
      ...currentOverride,
      foundationUnlockedModules: normalized.unlocked_modules,
      updatedAt: Date.now(),
    };
  }

  await client.users.updateUserMetadata(userId, { publicMetadata: updates });
  return NextResponse.json({ ok: true });
}
