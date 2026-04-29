import { runCanvasPreflight } from "@/app/lib/hirelySupremacy";

export async function POST(req: Request) {
  try {
    const { resumeText, links, marginsInches, minFontSizePt } = await req.json();

    if (!resumeText || typeof resumeText !== "string") {
      return Response.json({ error: "resumeText is required." }, { status: 400 });
    }

    const result = runCanvasPreflight({
      resumeText,
      links: Array.isArray(links) ? links : [],
      marginsInches,
      minFontSizePt: Number(minFontSizePt || 10),
    });

    return Response.json(result);
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown server error";
    return Response.json({ error: "Unable to run preflight.", details }, { status: 500 });
  }
}
