import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { isAdminRequest } from "@/app/lib/hcAdminConfig";
import {
  loadLegalDocuments,
  publicLegalDocuments,
  upsertLegalDocument,
  type LegalDocumentKey,
} from "@/app/lib/legalDocuments";

export const dynamic = "force-dynamic";

function isLegalDocumentKey(value: string): value is LegalDocumentKey {
  return value === "terms" || value === "privacy";
}

function revalidateLegalRoutes() {
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/");
}

export async function GET() {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const documents = await loadLegalDocuments();
    return NextResponse.json({ documents: publicLegalDocuments(documents) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load legal documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const documentType = String(formData.get("documentType") ?? "").trim();
    const file = formData.get("file");

    if (!isLegalDocumentKey(documentType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF uploads are supported" }, { status: 400 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured" }, { status: 500 });
    }

    const blob = await put(`legal/${documentType}.pdf`, file, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: file.type || "application/pdf",
    });

    const documents = await upsertLegalDocument(documentType, {
      url: blob.url,
      pathname: blob.pathname,
      fileName: file.name,
      uploadedAt: Date.now(),
    });

    revalidateLegalRoutes();

    return NextResponse.json({ ok: true, documents: publicLegalDocuments(documents) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { documentType?: string };
    const documentType = String(body.documentType ?? "").trim();

    if (!isLegalDocumentKey(documentType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const documents = await upsertLegalDocument(documentType, {
      url: null,
      pathname: null,
      fileName: null,
      uploadedAt: null,
    });

    revalidateLegalRoutes();

    return NextResponse.json({ ok: true, documents: publicLegalDocuments(documents) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}