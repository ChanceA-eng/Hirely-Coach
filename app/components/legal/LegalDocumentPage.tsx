import { Inter } from "next/font/google";
import Link from "next/link";
import {
  LEGAL_PLACEHOLDER_COPY,
  loadLegalDocuments,
  type LegalDocumentKey,
} from "@/app/lib/legalDocuments";

const inter = Inter({ subsets: ["latin"] });

export default async function LegalDocumentPage({ documentKey }: { documentKey: LegalDocumentKey }) {
  const documents = await loadLegalDocuments();
  const content = LEGAL_PLACEHOLDER_COPY[documentKey];
  const uploadedUrl = documents[documentKey].url;

  return (
    <main
      className={inter.className}
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, rgba(16,185,129,0.12), transparent 34%), #040814",
        color: "#e2e8f0",
        padding: "48px 20px 72px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto", display: "grid", gap: 24 }}>
        <section
          style={{
            borderRadius: 28,
            padding: "28px 28px 24px",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(15,23,42,0.7)",
            boxShadow: "0 24px 60px rgba(2,6,23,0.45)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.78rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#86efac", fontWeight: 700 }}>
            {content.eyebrow}
          </p>
          <h1 style={{ margin: "10px 0 8px", fontSize: "2.35rem", lineHeight: 1.05, color: "#f8fafc" }}>{content.title}</h1>
          <p style={{ margin: 0, maxWidth: 700, color: "#cbd5e1", lineHeight: 1.7 }}>{content.intro}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 18, alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>Last updated: {content.lastUpdated}</span>
            {uploadedUrl && (
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 999,
                  textDecoration: "none",
                  color: "#dcfce7",
                  background: "rgba(16,185,129,0.14)",
                  border: "1px solid rgba(16,185,129,0.28)",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                Open uploaded PDF
              </a>
            )}
            <Link href="/" style={{ color: "#93c5fd", textDecoration: "none", fontSize: "0.82rem" }}>
              Back to Hirely
            </Link>
          </div>
        </section>

        <section style={{ display: "grid", gap: 16 }}>
          {content.sections.map((section) => (
            <article
              key={section.heading}
              style={{
                borderRadius: 22,
                padding: "22px 24px",
                border: "1px solid rgba(148,163,184,0.14)",
                background: "rgba(15,23,42,0.58)",
              }}
            >
              <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem", color: "#f8fafc" }}>{section.heading}</h2>
              <div style={{ display: "grid", gap: 12 }}>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.75, fontSize: "0.96rem" }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}