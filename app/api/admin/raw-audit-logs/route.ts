import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/lib/hcAdminConfig";
import { listAdminAuditLogs } from "@/app/lib/adminAuditLogStore";

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = listAdminAuditLogs().slice(0, 50);
  return NextResponse.json({ logs });
}
