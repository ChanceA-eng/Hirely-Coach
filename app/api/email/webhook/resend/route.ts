import { NextRequest, NextResponse } from "next/server";
import { updateEmailStatusByProviderId } from "@/app/lib/emailLogStore";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { type?: string; data?: { email_id?: string } };

  const providerMessageId = body.data?.email_id;
  if (!providerMessageId) {
    return NextResponse.json({ ok: true });
  }

  const statusMap: Record<string, "delivered" | "opened" | "bounced" | "blocked" | "failed" | "sent"> = {
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.delivery_delayed": "failed",
    "email.opened": "opened",
    "email.bounced": "bounced",
    "email.complained": "blocked",
  };

  const mappedStatus = statusMap[body.type ?? ""];
  if (mappedStatus) {
    updateEmailStatusByProviderId(providerMessageId, mappedStatus);
  }

  return NextResponse.json({ ok: true });
}
