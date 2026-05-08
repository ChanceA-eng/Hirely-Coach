import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { loadLegalDocuments, type LegalDocumentKey } from "@/app/lib/legalDocuments";

export const dynamic = "force-dynamic";

function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return value === "terms" || value === "privacy";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentType: string }> }
) {
  const { documentType } = await context.params;

  if (!isLegalDocumentKey(documentType)) {
    return NextResponse.json({ error: "Unsupported legal document type" }, { status: 400 });
  }

  try {
    const docs = await loadLegalDocuments();
    const record = docs[documentType];

    if (!record.url) {
      return NextResponse.json({ error: "No uploaded file for this document" }, { status: 404 });
    }

    const target = record.pathname || record.url;
    const blob = await get(target, { access: "public" });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "Uploaded file not found in Blob store" }, { status: 404 });
    }

    return new NextResponse(blob.stream, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=300",
        "Content-Disposition": `inline; filename=\"${documentType}.pdf\"`,
      },
    });
  } catch (error) {
    console.error("[legal-documents][proxy] failed to serve PDF", {
      documentType,
      tokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      error,
    });

    return NextResponse.json({
      error: "Could not read legal document from Blob",
      diagnostics: {
        documentType,
        tokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      },
    }, { status: 500 });
  }
}
