import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getNotifications,
  upsertNotification,
  deleteNotification,
  type ScheduledNotification,
} from "@/app/lib/foundationNotificationStore";
import { assertNoCareerJargon } from "@/app/lib/foundationInbox";

function isAdmin(userId: string | null): boolean {
  const adminId =
    process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  return NextResponse.json(getNotifications());
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await req.json()) as ScheduledNotification;
  if (!body.id || !body.name) return NextResponse.json({ error: "id and name required" }, { status: 400 });
  try {
    assertNoCareerJargon(
      body.name,
      ...body.variants.flatMap((variant) => [variant.title, variant.body, variant.bodySwahili])
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid notification copy" }, { status: 400 });
  }
  upsertNotification(body);
  return NextResponse.json({ ok: true, notifications: getNotifications() });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  deleteNotification(id);
  return NextResponse.json({ ok: true });
}
