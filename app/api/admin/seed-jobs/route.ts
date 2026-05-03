import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type JobEntry = {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  full_description?: string;
  job_url?: string;
  tags: string[];
  category: string;
  alignmentReason: string;
  scaryQuestions: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as { jobs: JobEntry[] };
  const incoming = Array.isArray(body.jobs) ? body.jobs : [];

  const filePath = path.join(process.cwd(), "app", "data", "jobs.json");

  let existing: JobEntry[] = [];
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }

  // Deduplicate by title + company (case-insensitive)
  const key = (j: JobEntry) => `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
  const existingKeys = new Set(existing.map(key));
  const newJobs = incoming.filter((j) => !existingKeys.has(key(j)));

  const merged = [...existing, ...newJobs];
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), "utf-8");

  return NextResponse.json({ added: newJobs.length, total: merged.length });
}
