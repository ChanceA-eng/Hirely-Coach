import { NextResponse } from "next/server";
import { getModuleLocks } from "@/app/lib/foundationModuleLockStore";

export async function GET() {
  return NextResponse.json(getModuleLocks());
}