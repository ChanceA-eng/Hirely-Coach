import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  appendFoundationInboxItem,
  buildFoundationMilestone,
  createFoundationInboxItem,
  normalizeFoundationInboxState,
  unreadFoundationInboxCount,
  assertNoCareerJargon,
  type FoundationInboxItem,
} from "@/app/lib/foundationInbox";

type PostBody =
  | { action?: "module-unlock"; moduleNum?: number }
  | { action?: "append"; notification?: Partial<FoundationInboxItem> };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const inboxState = normalizeFoundationInboxState(metadata.foundationInboxState);

  return NextResponse.json({
    notifications: inboxState.notifications,
    unreadCount: unreadFoundationInboxCount(inboxState.notifications),
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { action?: "mark-all-read" | "mark-read"; id?: string };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const inboxState = normalizeFoundationInboxState(metadata.foundationInboxState);

  const notifications = inboxState.notifications.map((item) => {
    if (body.action === "mark-all-read") return { ...item, read: true };
    if (body.action === "mark-read" && body.id === item.id) return { ...item, read: true };
    return item;
  });

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...metadata,
      foundationInboxState: { notifications },
    },
  });

  return NextResponse.json({ ok: true, unreadCount: unreadFoundationInboxCount(notifications) });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as PostBody;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const inboxState = normalizeFoundationInboxState(metadata.foundationInboxState);

  let nextItem: FoundationInboxItem | null = null;
  if (body.action === "module-unlock" && typeof body.moduleNum === "number") {
    nextItem = buildFoundationMilestone(body.moduleNum);
  }

  if (body.action === "append" && body.notification) {
    assertNoCareerJargon(String(body.notification.title ?? ""), String(body.notification.body ?? ""));
    if (!body.notification.title || !body.notification.body || !body.notification.href || !body.notification.payload) {
      return NextResponse.json({ error: "Incomplete notification payload" }, { status: 400 });
    }
    nextItem = createFoundationInboxItem({
      title: body.notification.title,
      body: body.notification.body,
      href: body.notification.href,
      category:
        body.notification.category === "alerts" ||
        body.notification.category === "inbox" ||
        body.notification.category === "updates"
          ? body.notification.category
          : "alerts",
      payload: body.notification.payload,
    });
  }

  if (!nextItem) {
    return NextResponse.json({ error: "Unsupported foundation inbox action" }, { status: 400 });
  }

  const notifications = appendFoundationInboxItem(inboxState.notifications, nextItem);
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...metadata,
      foundationInboxState: { notifications },
    },
  });

  return NextResponse.json({
    ok: true,
    notifications,
    unreadCount: unreadFoundationInboxCount(notifications),
  });
}