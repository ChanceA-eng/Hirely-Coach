import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  // Gate 1 check — must be the admin Clerk user
  const { userId } = await auth();
  const adminId =
    process.env.ADMIN_USER_ID ??
    process.env.NEXT_PUBLIC_ADMIN_USER_ID ??
    "";

  if (!userId || (adminId && userId !== adminId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gate 2 check — validate the Master Key
  const body = await request.json() as { key?: string };
  const masterKey = process.env.ADMIN_MASTER_KEY ?? "";

  if (!masterKey) {
    // ADMIN_MASTER_KEY not configured — deny access
    return NextResponse.json(
      { error: "Server configuration error: ADMIN_MASTER_KEY not set." },
      { status: 503 },
    );
  }

  if (!body.key || body.key !== masterKey) {
    return NextResponse.json({ error: "Invalid key" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("hc_vault", "unlocked", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8, // 8-hour session
  });

  return response;
}
