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
  };

  if (!body.targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(body.targetUserId, {
    publicMetadata: {
      ...(body.kj !== undefined ? { kj: body.kj } : {}),
      ...(body.acceleratorLevel !== undefined
        ? { acceleratorLevel: body.acceleratorLevel }
        : {}),
      ...(body.resumeText !== undefined ? { resumeText: body.resumeText } : {}),
      ...(body.leadershipWeight !== undefined ? { leadershipWeight: body.leadershipWeight } : {}),
      ...(body.technicalWeight !== undefined ? { technicalWeight: body.technicalWeight } : {}),
      ...(body.founderNote !== undefined ? { founderNote: body.founderNote } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
