import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Only allow http/https URLs to prevent SSRF to internal resources
function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url || typeof url !== "string" || !isSafeUrl(url)) {
      return Response.json({ error: "A valid http/https URL is required." }, { status: 400 });
    }

    // Fetch the page with a short timeout and a browser-like UA
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; HirelyBot/1.0; +https://hirely.coach)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeout);
      const html = await res.text();

      // Extract OG tags + title tag as the most reliable metadata
      const og = (prop: string) =>
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, "i"))?.[1] ||
        "";

      const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
      const ogTitle = og("title");
      const ogSiteName = og("site_name");
      const bodySnippet = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `I am providing a job listing URL. Please extract only the Job Title and the Company Name.\n\nFormat:\nTitle: [Job Title]\nCompany: [Company Name]\n\nNote: Do not return the URL. Return a clean, professional title that can be used as a header (e.g., 'Software Engineer').\n\nReturn ONLY valid JSON in this exact shape: {"title":"...","company":"..."}.\n\nURL + Page Context:\n${[url, ogSiteName, ogTitle, titleTag, bodySnippet].filter(Boolean).join("\n").slice(0, 12000)}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 240,
      });

      const raw = completion.choices[0].message.content || "{}";
      const parsed = JSON.parse(raw) as { title?: string; company?: string };

      const title = String(parsed.title || "").trim() || "Unknown Role";
      const company = String(parsed.company || "").trim() || "Unknown Company";
      const description = bodySnippet.slice(0, 4000);

      return Response.json({
        title,
        company,
        description,
        full_description: description,
      });
    } catch {
      return Response.json({ error: "Unable to fetch that URL. The site may block automated requests." }, { status: 422 });
    }
  } catch (err) {
    return Response.json(
      { error: "Server error", details: (err as Error).message },
      { status: 500 }
    );
  }
}
