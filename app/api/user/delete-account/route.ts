import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();

  try {
    const user = await client.users.getUser(userId);
    const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

    // Best-effort clean sweep before user deletion.
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...metadata,
        foundationInboxState: null,
        impactLedger: null,
        interviewProgress: null,
        notificationState: null,
        progressionState: null,
        foundation_progress: null,
        foundation_profile: null,
        current_mode: null,
        onboarding_path: null,
      },
    });

    await client.users.deleteUser(userId);

    return NextResponse.json({ ok: true, redirectTo: "/" });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete account right now. Please try again." },
      { status: 500 }
    );
  }
}
