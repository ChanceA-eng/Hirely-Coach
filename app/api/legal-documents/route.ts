import { NextResponse } from "next/server";
import { loadLegalDocuments, publicLegalDocuments } from "@/app/lib/legalDocuments";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const documents = await loadLegalDocuments();
    return NextResponse.json({
      documents: publicLegalDocuments(documents),
      diagnostics: {
        tokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      },
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[legal-documents][GET] failed to load document links", error);
    return NextResponse.json({
      documents: {
        terms: { key: "terms", label: "Terms of Use", url: null, pathname: null, fileName: null, uploadedAt: null },
        privacy: { key: "privacy", label: "Privacy Policy", url: null, pathname: null, fileName: null, uploadedAt: null },
      },
      error: "Legal document links are unavailable",
      diagnostics: {
        tokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      },
    }, { status: 500 });
  }
}