import { NextResponse } from "next/server";
import jobs from "@/app/data/jobs.json";
import { filterJobsByKj, type JobRecord } from "@/app/lib/kj";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const matched = filterJobsByKj(jobs as JobRecord[], {
      kjTitle: body?.kjTitle,
      city: body?.city,
      state: body?.state,
      query: body?.query,
      resumeText: body?.resumeText,
      minMatch: Number(body?.minMatch ?? 0),
    });

    return NextResponse.json({ jobs: matched });
  } catch {
    return NextResponse.json({ error: "Unable to load matched jobs" }, { status: 500 });
  }
}
