import OpenAI from "openai";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { loadHcAdminConfig } from "@/app/lib/hcAdminConfig";
import type { ImpactEntry } from "@/app/lib/impactLog";
import { canAccessPromotionSupport } from "@/app/lib/progression";

type PromotionSupportRequest = {
  managerName?: string;
  totalIp?: number;
};

type PromotionSupportResponse = {
  portfolioSummary: string;
  topImpact: string;
  revenueGrowth: string[];
  efficiency: string[];
  leadership: string[];
  emailSubject: string;
  emailBody: string;
  verifiedCount: number;
};

type VerificationProfile = {
  levelTitle: string;
};

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    portfolioSummary: { type: "string" },
    topImpact: { type: "string" },
    revenueGrowth: { type: "array", items: { type: "string" } },
    efficiency: { type: "array", items: { type: "string" } },
    leadership: { type: "array", items: { type: "string" } },
    emailSubject: { type: "string" },
    emailBody: { type: "string" },
  },
  required: [
    "portfolioSummary",
    "topImpact",
    "revenueGrowth",
    "efficiency",
    "leadership",
    "emailSubject",
    "emailBody",
  ],
} as const;

function asVerificationProfile(input: unknown): VerificationProfile {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    levelTitle: String(row.levelTitle || "Novice").trim(),
  };
}

function normalizeImpactEntries(input: unknown): ImpactEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const createdAt = Math.floor(Number(row.createdAt || 0));
      const action = String(row.action || "").trim();
      const proof = String(row.proof || "").trim();
      const result = String(row.result || "").trim();
      if (!id || !createdAt || !action || !proof || !result) return null;
      return { id, createdAt, action, proof, result } as ImpactEntry;
    })
    .filter(Boolean)
    .sort((a, b) => (b as ImpactEntry).createdAt - (a as ImpactEntry).createdAt)
    .slice(0, 40) as ImpactEntry[];
}

function isVerifiedImpactEntry(entry: ImpactEntry): boolean {
  const combined = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
  const hasQuantSignal = /\$\d|\d+%|\d+\s*(hours|days|weeks|months|clients|tickets|users|revenue|cost|pipeline|stakeholders|teams|hires)/.test(combined);
  const hasVerificationSignal = /\bhc\b|hirely\s*coach|verified|validated|audited|measured/.test(combined);
  return hasQuantSignal || hasVerificationSignal;
}

async function getPortfolioData(userId: string) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const publicMetadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
  const impactLedger = normalizeImpactEntries(publicMetadata.impactLedger).filter(isVerifiedImpactEntry).slice(0, 10);
  const verificationProfile = asVerificationProfile(publicMetadata.verificationProfile);
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Hirely Coach Professional";

  return {
    userName,
    levelTitle: verificationProfile.levelTitle || "Novice",
    publicMetadata,
    impactEntries: impactLedger,
  };
}

function classifyWin(entry: ImpactEntry): "Revenue/Growth" | "Efficiency" | "Leadership" {
  const combined = `${entry.action} ${entry.proof} ${entry.result}`.toLowerCase();
  if (/revenue|growth|pipeline|sales|conversion|retention|acquisition|arr|mrr|upsell|adoption|engagement/.test(combined)) {
    return "Revenue/Growth";
  }
  if (/led|leadership|stakeholder|cross-functional|mentored|hired|coached|board|executive|team/.test(combined)) {
    return "Leadership";
  }
  return "Efficiency";
}

function rewriteWin(entry: ImpactEntry): string {
  const resultText = entry.result.replace(/\.$/, "");
  return `Achieved ${entry.action}, which resulted in ${resultText}.`;
}

function buildFallbackResponse(input: {
  userName: string;
  userRank: string;
  totalIp: number;
  managerName: string;
  impactEntries: ImpactEntry[];
}): PromotionSupportResponse {
  const categorized = {
    "Revenue/Growth": [] as string[],
    Efficiency: [] as string[],
    Leadership: [] as string[],
  };

  for (const entry of input.impactEntries) {
    categorized[classifyWin(entry)].push(rewriteWin(entry));
  }

  const topImpactEntry = input.impactEntries[0];
  const topImpact = topImpactEntry
    ? rewriteWin(topImpactEntry)
    : "Achieved consistent measurable business impact across core responsibilities.";

  return {
    portfolioSummary: `${input.userName} reached ${input.userRank} status through verified impact, systemic optimization, and executive-level execution. Total IP earned: ${input.totalIp}.`,
    topImpact,
    revenueGrowth: categorized["Revenue/Growth"].slice(0, 4),
    efficiency: categorized.Efficiency.slice(0, 4),
    leadership: categorized.Leadership.slice(0, 4),
    emailSubject: `Discussion regarding my role and impact - ${input.userName}`,
    emailBody: `Hi ${input.managerName},\n\nI have been reflecting on my contributions over the last quarter, especially ${topImpact.toLowerCase()}. Given that I have now reached the ${input.userRank} performance benchmark in my professional development tracking, I would value a conversation about title alignment and compensation review based on the attached Performance Portfolio.\n\nThe portfolio summarizes data-backed wins across revenue/growth, efficiency, and leadership. I remain committed to supporting the team's Q3/Q4 goals and would appreciate 20 minutes to discuss how my current responsibilities align with the next level of scope.\n\nBest,\n${input.userName}`,
    verifiedCount: input.impactEntries.length,
  };
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PromotionSupportRequest;
    const managerName = String(body.managerName || "Manager").trim() || "Manager";
    const totalIp = Math.max(0, Math.floor(Number(body.totalIp || 0)));

    const portfolioData = await getPortfolioData(userId);
    if (!canAccessPromotionSupport(totalIp, portfolioData.publicMetadata)) {
      return NextResponse.json(
        { error: "Promotion Support unlocks at Executive tier. Reach 3,000 IP to open the Performance Portfolio tools." },
        { status: 403 }
      );
    }

    if (portfolioData.impactEntries.length === 0) {
      return NextResponse.json({ error: "No verified impact entries found." }, { status: 400 });
    }

    const fallback = buildFallbackResponse({
      userName: portfolioData.userName,
      userRank: portfolioData.levelTitle,
      totalIp,
      managerName,
      impactEntries: portfolioData.impactEntries,
    });

    if (!client || !process.env.OPENAI_API_KEY) {
      return NextResponse.json(fallback);
    }

    const config = await loadHcAdminConfig();
    const completion = await client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are an Executive Career Coach. Your goal is to transform a user's raw Impact Log entries into a professional Performance Portfolio and a formal Promotion Request. Group the wins into three categories: Revenue/Growth, Efficiency, and Leadership. Translate 'I did X' into 'Achieved X which resulted in Y% improvement.' Format the portfolio as a clean, one-page executive summary. The promotion email must be confident, collaborative, and data-driven. Structure it with: opening acknowledging current growth in role, proof mentioning the transition to the user's rank status representing top-tier performance, ask requesting a meeting for title alignment or compensation review based on the attached portfolio, and closing that reiterates commitment to the company’s Q3/Q4 goals.",
        },
        {
          role: "user",
          content: `User Rank: ${portfolioData.levelTitle}\nTotal IP: ${totalIp}\nManager Name: ${managerName}\nImpact Entries:\n${portfolioData.impactEntries
            .map((entry, index) => `${index + 1}. Action: ${entry.action} | Proof: ${entry.proof} | Result: ${entry.result}`)
            .join("\n")}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "promotion_support",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return NextResponse.json(fallback);
    }

    const parsed = JSON.parse(content) as Omit<PromotionSupportResponse, "verifiedCount">;
    return NextResponse.json({
      ...parsed,
      verifiedCount: portfolioData.impactEntries.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate promotion support.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
