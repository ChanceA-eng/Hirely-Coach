import { NextResponse } from "next/server";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";

export async function GET() {
  const config = await loadHcAdminConfig();
  return NextResponse.json({
    resumeCacheVersion: config.resumeCacheVersion,
    updatedAt: config.updatedAt,
  });
}
