import { NextResponse } from "next/server";
import { loadLegalDocuments, publicLegalDocuments } from "@/app/lib/legalDocuments";

export const dynamic = "force-dynamic";

export async function GET() {
  const documents = await loadLegalDocuments();
  return NextResponse.json({ documents: publicLegalDocuments(documents) });
}