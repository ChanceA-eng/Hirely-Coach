import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "app", "data", "jobs.json");

export async function POST() {
  try {
    fs.writeFileSync(DATA_PATH, "[]", "utf-8");
    return NextResponse.json({ ok: true, total: 0 });
  } catch (err) {
    console.error("Failed to clear jobs:", err);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
