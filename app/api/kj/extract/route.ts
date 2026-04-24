import { NextResponse } from "next/server";
import { extractKjFromResumeText } from "@/app/lib/kj";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const resumeText = String(body?.resumeText ?? "").trim();

    if (!resumeText) {
      return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
    }

    const extracted = extractKjFromResumeText(resumeText);
    return NextResponse.json(extracted);
  } catch {
    return NextResponse.json({ error: "Unable to parse Kj data" }, { status: 500 });
  }
}
