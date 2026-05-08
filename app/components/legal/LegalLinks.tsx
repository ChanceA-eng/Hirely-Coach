"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";

type LegalDocumentRecord = {
  url: string | null;
};

type LegalDocumentsResponse = {
  documents?: {
    terms?: LegalDocumentRecord;
    privacy?: LegalDocumentRecord;
  };
};

type Props = {
  language?: "en" | "sw";
  includeVersion?: boolean;
  includeCopyright?: boolean;
  className?: string;
  linkClassName?: string;
  style?: CSSProperties;
  linkStyle?: CSSProperties;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function LegalAnchor({ href, label, className, style }: { href: string; label: string; className?: string; style?: CSSProperties }) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className} style={style}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      {label}
    </Link>
  );
}

export default function LegalLinks({
  language = "en",
  includeVersion = false,
  includeCopyright = false,
  className,
  linkClassName,
  style,
  linkStyle,
}: Props) {
  const [hrefs, setHrefs] = useState({ terms: "/terms", privacy: "/privacy" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/legal-documents", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as LegalDocumentsResponse;
        if (cancelled) return;
        setHrefs({
          terms: payload.documents?.terms?.url || "/terms",
          privacy: payload.documents?.privacy?.url || "/privacy",
        });
      } catch {
        // Keep route fallbacks.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const copy = language === "sw"
    ? { terms: "Masharti", privacy: "Faragha" }
    : { terms: "Terms of Use", privacy: "Privacy Policy" };

  return (
    <span className={className} style={style}>
      {includeVersion && <span>v1.0.0</span>}
      {includeVersion && <span> · </span>}
      <LegalAnchor href={hrefs.terms} label={copy.terms} className={linkClassName} style={linkStyle} />
      <span> | </span>
      <LegalAnchor href={hrefs.privacy} label={copy.privacy} className={linkClassName} style={linkStyle} />
      {includeCopyright && <span> | © 2026 Hirely</span>}
    </span>
  );
}