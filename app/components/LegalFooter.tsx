"use client";

import LegalLinks from "@/app/components/legal/LegalLinks";

export default function LegalFooter() {
  return (
    <footer
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "20px 16px 28px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.16)",
          background: "rgba(15,23,42,0.38)",
          color: "#94a3b8",
          fontSize: "0.78rem",
          textAlign: "center",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <LegalLinks
          includeCopyright
          linkStyle={{ color: "#cbd5e1", textDecoration: "none" }}
        />
      </div>
    </footer>
  );
}