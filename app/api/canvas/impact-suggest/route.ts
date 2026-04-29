import {
  classifyImpactDrop,
  suggestExecutiveVerbAlternatives,
} from "@/app/lib/hirelySupremacy";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return Response.json({ error: "text is required." }, { status: 400 });
    }

    const placement = classifyImpactDrop(text);
    const verbSuggestion = suggestExecutiveVerbAlternatives(text);

    return Response.json({
      placement,
      verbSuggestion,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown server error";
    return Response.json({ error: "Unable to analyze impact text.", details }, { status: 500 });
  }
}
