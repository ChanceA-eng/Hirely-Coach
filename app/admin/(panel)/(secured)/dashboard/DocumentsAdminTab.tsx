"use client";

import { useEffect, useState } from "react";

type LegalDocumentKey = "terms" | "privacy";

type LegalDocumentRecord = {
  url: string | null;
  fileName: string | null;
  uploadedAt: number | null;
};

type DocumentsPayload = {
  documents: Record<LegalDocumentKey, LegalDocumentRecord>;
};

const DOCUMENT_OPTIONS: Array<{ key: LegalDocumentKey; label: string; help: string }> = [
  { key: "terms", label: "Terms of Use PDF", help: "Upload the latest approved Terms document." },
  { key: "privacy", label: "Privacy Policy PDF", help: "Upload the latest approved Privacy document." },
];

export default function DocumentsAdminTab() {
  const [documents, setDocuments] = useState<DocumentsPayload["documents"] | null>(null);
  const [busyKey, setBusyKey] = useState<LegalDocumentKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDocuments() {
    const res = await fetch("/api/admin/legal-documents", { cache: "no-store" });
    const payload = (await res.json()) as Partial<DocumentsPayload> & { error?: string };
    if (!res.ok) {
      throw new Error(payload.error || "Failed to load legal documents");
    }
    setDocuments(payload.documents ?? null);
  }

  useEffect(() => {
    void loadDocuments().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "Failed to load legal documents");
    });
  }, []);

  async function uploadDocument(documentType: LegalDocumentKey, file: File) {
    setBusyKey(documentType);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("documentType", documentType);
      formData.set("file", file);

      const res = await fetch("/api/admin/legal-documents", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as Partial<DocumentsPayload> & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      setDocuments(payload.documents ?? null);
      setMessage(`${documentType === "terms" ? "Terms" : "Privacy"} PDF uploaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeDocument(documentType: LegalDocumentKey) {
    setBusyKey(documentType);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/legal-documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType }),
      });
      const payload = (await res.json()) as Partial<DocumentsPayload> & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Delete failed");
      }

      setDocuments(payload.documents ?? null);
      setMessage(`${documentType === "terms" ? "Terms" : "Privacy"} PDF removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc" }}>Documents</h2>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.84rem" }}>
          Upload the current Terms of Use and Privacy Policy PDFs. Footer links and Foundation legal links will use these public files automatically.
        </p>
        {message && (
          <div style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(15,23,42,0.58)", color: "#cbd5e1", fontSize: "0.82rem" }}>
            {message}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {DOCUMENT_OPTIONS.map((item) => {
          const doc = documents?.[item.key];
          const isBusy = busyKey === item.key;

          return (
            <section
              key={item.key}
              style={{
                display: "grid",
                gap: 14,
                padding: 18,
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.14)",
                background: "rgba(15,23,42,0.62)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <h3 style={{ margin: 0, fontSize: "0.96rem", color: "#f8fafc" }}>{item.label}</h3>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem" }}>{item.help}</p>
                </div>
                {doc?.url ? (
                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: "#93c5fd", fontSize: "0.8rem", textDecoration: "none" }}>
                    Open current PDF
                  </a>
                ) : (
                  <span style={{ color: "#64748b", fontSize: "0.8rem" }}>No PDF uploaded yet</span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ color: "#cbd5e1", fontSize: "0.82rem" }}>
                  {doc?.fileName ? `${doc.fileName}${doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleString()}` : ""}` : "Using route fallback until a PDF is uploaded."}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 14px",
                      borderRadius: 12,
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.2)",
                      color: isBusy ? "#94a3b8" : "#dcfce7",
                      cursor: isBusy ? "default" : "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    {isBusy ? "Uploading..." : "Upload PDF"}
                    <input
                      type="file"
                      accept="application/pdf"
                      disabled={isBusy}
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadDocument(item.key, file);
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={isBusy || !doc?.url}
                    onClick={() => void removeDocument(item.key)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(239,68,68,0.24)",
                      background: "rgba(127,29,29,0.24)",
                      color: isBusy || !doc?.url ? "#64748b" : "#fecaca",
                      cursor: isBusy || !doc?.url ? "not-allowed" : "pointer",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                    }}
                  >
                    Remove link
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}