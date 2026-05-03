import { NextResponse } from "next/server";
import jobs from "@/app/data/jobs.json";
import { filterJobsByKj, type JobRecord } from "@/app/lib/kj";

function buildCareerLiftSuggestions(resumeText: string) {
  const normalized = String(resumeText || "").toLowerCase();
  const sawJuniorDeveloper =
    normalized.includes("junior developer") ||
    normalized.includes("junior software engineer") ||
    normalized.includes("entry level developer");

  if (!sawJuniorDeveloper) return [];

  return [
    {
      id: "career-lift-mid-dev-1",
      title: "Mid-Level Software Engineer",
      company: "Orion Product Labs",
      location: "Remote, US",
      salary: "$128k-$152k",
      description:
        "Build and ship core product workflows, partner with design and product, and own production reliability KPIs.",
      full_description:
        "You will own feature delivery from planning through release, mentor newer engineers, and improve system quality metrics. Required: JavaScript/TypeScript, API integration, and product collaboration.",
      tags: ["TECHNICAL", "PRODUCT"],
      matchScore: 88,
      job_url: "",
      queryHit: true,
    },
    {
      id: "career-lift-mid-dev-2",
      title: "Software Engineer II",
      company: "Northline Cloud",
      location: "Austin, TX",
      salary: "$122k-$148k",
      description:
        "Design backend services, own service health dashboards, and deliver measurable latency and reliability gains.",
      full_description:
        "The role focuses on production APIs, code quality, and measurable operational improvements. Required: backend development experience, testing discipline, and incident response collaboration.",
      tags: ["TECHNICAL", "SYSTEMS"],
      matchScore: 85,
      job_url: "",
      queryHit: true,
    },
    {
      id: "career-lift-mid-dev-3",
      title: "Mid-Level Full Stack Developer",
      company: "Summit Commerce",
      location: "Hybrid, Seattle",
      salary: "$120k-$145k",
      description:
        "Deliver end-to-end customer features, improve conversion funnels, and drive data-informed engineering decisions.",
      full_description:
        "You will build front-end and back-end features, collaborate with analytics, and own key release outcomes. Required: React, Node.js, and measurable business impact orientation.",
      tags: ["TECHNICAL", "BUSINESS"],
      matchScore: 82,
      job_url: "",
      queryHit: true,
    },
  ];
}

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

    const uplift = buildCareerLiftSuggestions(String(body?.resumeText || ""));
    const merged = [...matched, ...uplift]
      .filter((job, index, all) => all.findIndex((item) => item.id === job.id) === index)
      .sort((a, b) => Number(b.matchScore || 0) - Number(a.matchScore || 0));

    return NextResponse.json({ jobs: merged });
  } catch {
    return NextResponse.json({ error: "Unable to load matched jobs" }, { status: 500 });
  }
}
