import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getModuleLocks,
  updateModuleLock,
  resetModuleLocks,
  type ModuleLockEntry,
} from "@/app/lib/foundationModuleLockStore";
import {
  appendFoundationInboxItem,
  buildFoundationVideoUpdate,
  normalizeFoundationInboxState,
} from "@/app/lib/foundationInbox";

function isAdmin(userId: string | null): boolean {
  const adminId =
    process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

/** GET /api/admin/foundation/module-lock — list all module lock entries */
export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return NextResponse.json(getModuleLocks());
}

/** PATCH /api/admin/foundation/module-lock — update one module */
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await req.json()) as { moduleNum: number } & Partial<ModuleLockEntry>;
  const { moduleNum, ...patch } = body;
  if (!moduleNum) return NextResponse.json({ error: "moduleNum required" }, { status: 400 });

  const previous = getModuleLocks().find((entry) => entry.moduleNum === moduleNum) ?? null;

  const ok = updateModuleLock(moduleNum, patch);
  if (!ok) return NextResponse.json({ error: "Module not found" }, { status: 404 });

  const videoAdded = Boolean(
    typeof patch.videoUrl === "string" &&
    patch.videoUrl.trim() &&
    patch.videoUrl.trim() !== (previous?.videoUrl ?? "")
  );

  if (videoAdded) {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({ limit: 500 });
    const videoNotification = buildFoundationVideoUpdate(moduleNum);

    await Promise.all(
      users.map(async (user) => {
        const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
        const progress = (metadata.foundation_progress ?? {}) as { completedModules?: number[] };
        const completedModules = Array.isArray(progress.completedModules)
          ? progress.completedModules.map(Number)
          : [];
        const unlocked = moduleNum === 1 || completedModules.includes(moduleNum - 1);
        if (!unlocked) return;

        const inboxState = normalizeFoundationInboxState(metadata.foundationInboxState);
        const notifications = appendFoundationInboxItem(inboxState.notifications, videoNotification);

        await client.users.updateUserMetadata(user.id, {
          publicMetadata: {
            ...metadata,
            foundationInboxState: { notifications },
          },
        });
      })
    );
  }

  return NextResponse.json({ ok: true, locks: getModuleLocks() });
}

/** DELETE /api/admin/foundation/module-lock — reset to defaults */
export async function DELETE() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  resetModuleLocks();
  return NextResponse.json({ ok: true });
}
