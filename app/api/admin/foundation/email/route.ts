import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { appendEmailLog, listEmailLogs } from "@/app/lib/emailLogStore";
import {
  foundationTemplateMessage,
  type FoundationTemplateKey,
} from "@/app/lib/emailTemplates";
import { sendFoundationEmail } from "@/app/lib/email";
import {
  createFoundationInboxItem,
  appendFoundationInboxItem,
  normalizeFoundationInboxState,
} from "@/app/lib/foundationInbox";

function isAdmin(userId: string | null): boolean {
  const adminId = process.env.ADMIN_USER_ID ?? process.env.NEXT_PUBLIC_ADMIN_USER_ID ?? "";
  return !!adminId && userId === adminId;
}

export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  return NextResponse.json({
    logs: listEmailLogs(500),
    statusLabelsSw: {
      delivered: "Imepokelewa",
      failed: "Imeshindikana",
      blocked: "Imezuiwa",
      unread: "Haijasomwa",
      opened: "Imefunguliwa",
      sent: "Imetumwa",
      bounced: "Imerudishwa",
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = (await req.json()) as {
    action: "broadcast" | "test";
    template: FoundationTemplateKey;
    lessonNo?: string;
    moduleName?: string;
    points?: number;
    customTitle?: string;
    customBody?: string;
    email?: string;
  };

  if (body.action !== "broadcast" && body.action !== "test") {
    return NextResponse.json({ error: "Unsupported email action" }, { status: 400 });
  }

  if (body.action === "test") {
    const targetEmail = body.email?.trim();
    if (!targetEmail) {
      return NextResponse.json({ error: "email is required for test action" }, { status: 400 });
    }

    const message = foundationTemplateMessage(body.template, {
      name: "Mwanafunzi",
      lessonNo: body.lessonNo,
      moduleName: body.moduleName,
      points: body.points,
      customTitle: body.customTitle,
      customBody: body.customBody,
    });

    const result = await sendFoundationEmail({
      to: targetEmail,
      template: `${body.template}-test`,
      subject: `[TEST] ${message.subject}`,
      bodyText: message.bodyText,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Test send failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sent: 1, attempted: 1, failed: 0 });
  }

  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 500 });

  let attempted = 0;
  let sent = 0;
  let failed = 0;

  await Promise.all(
    users.data.map(async (user) => {
      const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
      const currentMode = meta.current_mode;
      if (currentMode !== "foundation") return;

      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) {
        appendEmailLog({
          email: user.username ?? user.id,
          template: body.template,
          subject: "N/A",
          status: "blocked",
          provider: "resend",
          providerMessageId: null,
          error: "No recipient email on profile",
        });
        attempted += 1;
        failed += 1;
        return;
      }

      attempted += 1;

      const message = foundationTemplateMessage(body.template, {
        name: user.firstName ?? user.fullName ?? "Mwanafunzi",
        lessonNo: body.lessonNo,
        moduleName: body.moduleName,
        points: body.points,
        customTitle: body.customTitle,
        customBody: body.customBody,
      });

      const result = await sendFoundationEmail({
        to: email,
        template: body.template,
        subject: message.subject,
        bodyText: message.bodyText,
      });

      if (result.ok) sent += 1;
      else failed += 1;

      const inboxState = normalizeFoundationInboxState(meta.foundationInboxState);
      const inboxItem = createFoundationInboxItem({
        title: message.subject,
        body: message.bodyText,
        category: "updates",
        href: "/foundation/home",
        payload: {
          title: message.subject,
          body: message.bodyText,
          data: { screen: "LessonView", params: { source: "email-broadcast", template: body.template } },
          sound: "default",
          priority: "high",
        },
      });
      const notifications = appendFoundationInboxItem(inboxState.notifications, inboxItem);

      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          ...meta,
          foundationInboxState: { notifications },
        },
      });
    })
  );

  return NextResponse.json({ ok: true, attempted, sent, failed });
}
