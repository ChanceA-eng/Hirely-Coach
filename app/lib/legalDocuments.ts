import { get, put } from "@vercel/blob";
import { clerkClient } from "@clerk/nextjs/server";
import { adminUserId } from "@/app/lib/hcAdminConfig";

export type LegalDocumentKey = "terms" | "privacy";

export type LegalDocumentRecord = {
  key: LegalDocumentKey;
  label: string;
  url: string | null;
  pathname: string | null;
  fileName: string | null;
  uploadedAt: number | null;
};

export type LegalDocumentsState = Record<LegalDocumentKey, LegalDocumentRecord>;

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalPlaceholder = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
};

const LABELS: Record<LegalDocumentKey, string> = {
  terms: "Terms of Use",
  privacy: "Privacy Policy",
};

const LEGAL_MANIFEST_PATH = "legal/documents.json";

type LegalDocumentsManifest = {
  terms_pdf_url: string | null;
  privacy_pdf_url: string | null;
  terms_pdf_pathname?: string | null;
  privacy_pdf_pathname?: string | null;
  terms_file_name?: string | null;
  privacy_file_name?: string | null;
  terms_uploaded_at?: number | null;
  privacy_uploaded_at?: number | null;
};

function createEmptyRecord(key: LegalDocumentKey): LegalDocumentRecord {
  return {
    key,
    label: LABELS[key],
    url: null,
    pathname: null,
    fileName: null,
    uploadedAt: null,
  };
}

function normalizeRecord(key: LegalDocumentKey, input: unknown): LegalDocumentRecord {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    key,
    label: LABELS[key],
    url: typeof row.url === "string" && row.url.trim() ? row.url.trim() : null,
    pathname: typeof row.pathname === "string" && row.pathname.trim() ? row.pathname.trim() : null,
    fileName: typeof row.fileName === "string" && row.fileName.trim() ? row.fileName.trim() : null,
    uploadedAt: Number.isFinite(Number(row.uploadedAt)) ? Number(row.uploadedAt) : null,
  };
}

export function emptyLegalDocuments(): LegalDocumentsState {
  return {
    terms: createEmptyRecord("terms"),
    privacy: createEmptyRecord("privacy"),
  };
}

export function normalizeLegalDocuments(input: unknown): LegalDocumentsState {
  const row = (input ?? {}) as Record<string, unknown>;

  const termsFromSchema = typeof row.terms_pdf_url === "string" && row.terms_pdf_url.trim()
    ? row.terms_pdf_url.trim()
    : null;
  const privacyFromSchema = typeof row.privacy_pdf_url === "string" && row.privacy_pdf_url.trim()
    ? row.privacy_pdf_url.trim()
    : null;

  const termsLegacy = normalizeRecord("terms", row.terms);
  const privacyLegacy = normalizeRecord("privacy", row.privacy);

  return {
    terms: {
      ...termsLegacy,
      url: termsFromSchema ?? termsLegacy.url,
      pathname: (typeof row.terms_pdf_pathname === "string" && row.terms_pdf_pathname.trim())
        ? row.terms_pdf_pathname.trim()
        : termsLegacy.pathname,
      fileName: (typeof row.terms_file_name === "string" && row.terms_file_name.trim())
        ? row.terms_file_name.trim()
        : termsLegacy.fileName,
      uploadedAt: Number.isFinite(Number(row.terms_uploaded_at))
        ? Number(row.terms_uploaded_at)
        : termsLegacy.uploadedAt,
    },
    privacy: {
      ...privacyLegacy,
      url: privacyFromSchema ?? privacyLegacy.url,
      pathname: (typeof row.privacy_pdf_pathname === "string" && row.privacy_pdf_pathname.trim())
        ? row.privacy_pdf_pathname.trim()
        : privacyLegacy.pathname,
      fileName: (typeof row.privacy_file_name === "string" && row.privacy_file_name.trim())
        ? row.privacy_file_name.trim()
        : privacyLegacy.fileName,
      uploadedAt: Number.isFinite(Number(row.privacy_uploaded_at))
        ? Number(row.privacy_uploaded_at)
        : privacyLegacy.uploadedAt,
    },
  };
}

function toManifest(state: LegalDocumentsState): LegalDocumentsManifest {
  return {
    terms_pdf_url: state.terms.url,
    privacy_pdf_url: state.privacy.url,
    terms_pdf_pathname: state.terms.pathname,
    privacy_pdf_pathname: state.privacy.pathname,
    terms_file_name: state.terms.fileName,
    privacy_file_name: state.privacy.fileName,
    terms_uploaded_at: state.terms.uploadedAt,
    privacy_uploaded_at: state.privacy.uploadedAt,
  };
}

async function loadManifestFromBlob(): Promise<LegalDocumentsState | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[legal-documents] BLOB_READ_WRITE_TOKEN is missing; manifest read disabled.");
    return null;
  }

  try {
    const result = await get(LEGAL_MANIFEST_PATH, { access: "public" });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    if (!text.trim()) return null;
    return normalizeLegalDocuments(JSON.parse(text) as unknown);
  } catch (error) {
    console.error("[legal-documents] Failed to load manifest from Blob.", error);
    return null;
  }
}

async function saveManifestToBlob(state: LegalDocumentsState): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[legal-documents] BLOB_READ_WRITE_TOKEN is missing; manifest write skipped.");
    return;
  }

  await put(LEGAL_MANIFEST_PATH, JSON.stringify(toManifest(state), null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function loadLegalDocuments(): Promise<LegalDocumentsState> {
  const manifestState = await loadManifestFromBlob();
  if (manifestState) return manifestState;

  const id = adminUserId();
  if (!id) return emptyLegalDocuments();

  const client = await clerkClient();
  const user = await client.users.getUser(id);
  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;
  return normalizeLegalDocuments(privateMetadata.legalDocuments);
}

export async function saveLegalDocuments(nextState: LegalDocumentsState): Promise<LegalDocumentsState> {
  await saveManifestToBlob(nextState);

  const id = adminUserId();
  if (!id) return nextState;

  const client = await clerkClient();
  const user = await client.users.getUser(id);
  const privateMetadata = (user.privateMetadata ?? {}) as Record<string, unknown>;

  await client.users.updateUserMetadata(id, {
    privateMetadata: {
      ...privateMetadata,
      terms_pdf_url: nextState.terms.url,
      privacy_pdf_url: nextState.privacy.url,
      terms_pdf_pathname: nextState.terms.pathname,
      privacy_pdf_pathname: nextState.privacy.pathname,
      terms_file_name: nextState.terms.fileName,
      privacy_file_name: nextState.privacy.fileName,
      terms_uploaded_at: nextState.terms.uploadedAt,
      privacy_uploaded_at: nextState.privacy.uploadedAt,
      legalDocuments: nextState,
    },
  });

  return nextState;
}

export async function upsertLegalDocument(
  key: LegalDocumentKey,
  patch: Partial<Omit<LegalDocumentRecord, "key" | "label">>
): Promise<LegalDocumentsState> {
  const current = await loadLegalDocuments();
  const next: LegalDocumentsState = {
    ...current,
    [key]: {
      ...current[key],
      ...patch,
      key,
      label: LABELS[key],
    },
  };

  return saveLegalDocuments(next);
}

export function publicLegalDocuments(state: LegalDocumentsState) {
  return {
    terms: state.terms,
    privacy: state.privacy,
  };
}

export const LEGAL_PLACEHOLDER_COPY: Record<LegalDocumentKey, LegalPlaceholder> = {
  terms: {
    eyebrow: "Hirely Legal",
    title: "Terms of Use",
    intro:
      "These placeholder terms explain the structure of your final agreement until your approved legal copy is uploaded. Replace this text when your final wording is ready.",
    lastUpdated: "Placeholder draft",
    sections: [
      {
        heading: "Using Hirely",
        paragraphs: [
          "Hirely provides coaching, preparation tools, and professional-development workflows for job seekers and career builders.",
          "You agree to use the platform lawfully and not misuse accounts, content, or platform access.",
        ],
      },
      {
        heading: "Accounts and access",
        paragraphs: [
          "Users are responsible for maintaining accurate account information and protecting their login credentials.",
          "Hirely may limit, suspend, or revoke access where misuse, fraud, abuse, or security concerns are detected.",
        ],
      },
      {
        heading: "Content and platform materials",
        paragraphs: [
          "Platform lessons, workflows, and product content remain the property of Hirely or its licensors unless otherwise stated.",
          "User-submitted materials remain the user's responsibility, and users should only upload content they are authorized to share.",
        ],
      },
      {
        heading: "Service changes",
        paragraphs: [
          "Hirely may improve, update, or discontinue parts of the service as the product evolves.",
          "Material changes to these terms should be reflected in the final legal copy and updated PDF uploads.",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Hirely Legal",
    title: "Privacy Policy",
    intro:
      "This placeholder privacy summary is here so the legal routes, footer, and document-upload system are fully wired before final policy text is supplied.",
    lastUpdated: "Placeholder draft",
    sections: [
      {
        heading: "Information collected",
        paragraphs: [
          "Hirely may process account details, profile inputs, coaching activity, and uploaded materials needed to operate the product.",
          "Operational analytics and notification preferences may also be stored to improve service quality and user experience.",
        ],
      },
      {
        heading: "How information is used",
        paragraphs: [
          "Data is used to deliver coaching workflows, personalize product experiences, maintain accounts, and support administration.",
          "Hirely may also use limited operational data to improve product performance, reliability, and user support.",
        ],
      },
      {
        heading: "Storage and sharing",
        paragraphs: [
          "Hirely relies on service providers and infrastructure partners to host application data and uploaded files.",
          "Final legal text should clearly define retention, deletion, and any third-party sharing commitments.",
        ],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "Users should be able to review the latest legal documents and contact Hirely regarding account or privacy questions.",
          "Once your approved policy is uploaded, this placeholder content can remain only as a route-level fallback.",
        ],
      },
    ],
  },
};