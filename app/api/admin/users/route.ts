import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

function adminId() {
  return process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
}

async function isAdmin(): Promise<boolean> {
  const { userId } = await auth();
  const id = adminId();
  return !!userId && (!id || userId === id);
}

/** GET /api/admin/users — list all Clerk users */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ limit: 500 });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      createdAt: u.createdAt,
      publicMetadata: u.publicMetadata ?? {},
    })),
  );
}

/** PATCH /api/admin/users — update a user's public metadata (kj, acceleratorLevel) */
export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    targetUserId?: string;
    kj?: string;
    acceleratorLevel?: string;
    resumeText?: string;
    leadershipWeight?: number;
    technicalWeight?: number;
    founderNote?: string;
    masterUnlock?: boolean;
    forcedTier?: number | null;
    forcedCourseLevel?: number | null;
    promotionSupportUnlock?: boolean;
    foundationUnlockedModules?: number[];
    impactPointsDelta?: number;
    snapshotAction?: "save" | "restore";
    resetOnboarding?: boolean;
  };

  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(body.targetUserId);
  const currentPublicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const currentPrivateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
  const currentProgress = (currentPublicMetadata.interviewProgress ?? {}) as Record<string, unknown>;
  const forcedTier =
    typeof body.forcedTier === "number" && body.forcedTier >= 1 && body.forcedTier <= 7
      ? body.forcedTier
      : null;
  const forcedCourseLevel =
    typeof body.forcedCourseLevel === "number" && body.forcedCourseLevel >= 1 && body.forcedCourseLevel <= 7
      ? body.forcedCourseLevel
      : null;
  const fullTierSet = [1, 2, 3, 4, 5, 6, 7];

  const snapshot = currentPrivateMetadata.adminCommandSnapshot as Record<string, unknown> | undefined;

  let nextPublicMetadata: Record<string, unknown> = {
    ...currentPublicMetadata,
    ...(body.kj !== undefined ? { kj: body.kj } : {}),
    ...(body.acceleratorLevel !== undefined ? { acceleratorLevel: body.acceleratorLevel } : {}),
    ...(body.resumeText !== undefined ? { resumeText: body.resumeText } : {}),
    ...(body.leadershipWeight !== undefined ? { leadershipWeight: body.leadershipWeight } : {}),
    ...(body.technicalWeight !== undefined ? { technicalWeight: body.technicalWeight } : {}),
    ...(body.founderNote !== undefined ? { founderNote: body.founderNote } : {}),
    ...(body.impactPointsDelta !== undefined ? { adminImpactPointsDelta: body.impactPointsDelta } : {}),
  };

  if (body.resetOnboarding) {
    const currentFoundationProfile = (currentPublicMetadata.foundation_profile ?? {}) as Record<string, unknown>;
    nextPublicMetadata.foundation_profile = {
      ...currentFoundationProfile,
      onboarding_complete: false,
    };
  }

  const nextPrivateMetadata: Record<string, unknown> = {
    ...currentPrivateMetadata,
  };

  if (body.snapshotAction === "save") {
    nextPrivateMetadata.adminCommandSnapshot = {
      savedAt: Date.now(),
      acceleratorLevel: currentPublicMetadata.acceleratorLevel ?? null,
      adminImpactPointsDelta: currentPublicMetadata.adminImpactPointsDelta ?? 0,
      interviewProgress: currentPublicMetadata.interviewProgress ?? null,
      interviewAdminOverride: currentPublicMetadata.interviewAdminOverride ?? null,
    };
  }

  if (body.snapshotAction === "restore" && snapshot) {
    nextPublicMetadata = {
      ...currentPublicMetadata,
      acceleratorLevel: snapshot.acceleratorLevel ?? "",
      adminImpactPointsDelta: snapshot.adminImpactPointsDelta ?? 0,
      interviewProgress: snapshot.interviewProgress ?? null,
      interviewAdminOverride: snapshot.interviewAdminOverride ?? null,
    };
  } else {
    const currentOverride = (currentPublicMetadata.interviewAdminOverride ?? {}) as Record<string, unknown>;
    const nextOverride = {
      ...currentOverride,
      ...(body.masterUnlock !== undefined ? { masterUnlock: body.masterUnlock } : {}),
      ...(body.forcedTier !== undefined ? { forcedTier } : {}),
      ...(body.forcedCourseLevel !== undefined ? { forcedCourseLevel } : {}),
      ...(body.promotionSupportUnlock !== undefined ? { promotionSupportUnlock: body.promotionSupportUnlock } : {}),
      ...(body.foundationUnlockedModules !== undefined
        ? {
            foundationUnlockedModules: Array.isArray(body.foundationUnlockedModules)
              ? body.foundationUnlockedModules
                  .map(Number)
                  .filter((moduleNum) => Number.isFinite(moduleNum) && moduleNum >= 1 && moduleNum <= 12)
              : [],
          }
        : {}),
      updatedAt: Date.now(),
    };

    if (
      body.masterUnlock !== undefined ||
      body.forcedTier !== undefined ||
      body.forcedCourseLevel !== undefined ||
      body.promotionSupportUnlock !== undefined ||
      body.foundationUnlockedModules !== undefined
    ) {
      nextPublicMetadata.interviewAdminOverride = nextOverride;
    }

    if (body.masterUnlock === true) {
      nextPublicMetadata.interviewProgress = {
        ...currentProgress,
        hasCompletedInterview: true,
        completedTiers: fullTierSet,
        highestCompletedTier: 7,
      };
    } else if (forcedTier) {
      const unlockedTiers = fullTierSet.slice(0, forcedTier);
      nextPublicMetadata.interviewProgress = {
        ...currentProgress,
        hasCompletedInterview: true,
        completedTiers: unlockedTiers,
        highestCompletedTier: forcedTier,
      };
    }
  }

  await client.users.updateUserMetadata(body.targetUserId, {
    publicMetadata: nextPublicMetadata,
    privateMetadata: nextPrivateMetadata,
  });

  return NextResponse.json({ ok: true, publicMetadata: nextPublicMetadata });
}
