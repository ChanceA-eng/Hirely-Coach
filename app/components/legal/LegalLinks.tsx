"use client";

import { type CSSProperties } from "react";
import Link from "next/link";

type Props = {
  language?: "en" | "sw";
  includeVersion?: boolean;
  includeCopyright?: boolean;
  className?: string;
  linkClassName?: string;
  style?: CSSProperties;
  linkStyle?: CSSProperties;
};

function LegalAnchor({ href, label, className, style }: { href: string; label: string; className?: string; style?: CSSProperties }) {
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
  const copy = language === "sw"
    ? { terms: "Masharti", privacy: "Faragha" }
    : { terms: "Terms of Use", privacy: "Privacy Policy" };

  return (
    <span className={className} style={style}>
      {includeVersion && <span>v1.0.0</span>}
      {includeVersion && <span> · </span>}
      <LegalAnchor href="/terms" label={copy.terms} className={linkClassName} style={linkStyle} />
      <span> | </span>
      <LegalAnchor href="/privacy" label={copy.privacy} className={linkClassName} style={linkStyle} />
      {includeCopyright && <span> | © 2026 Hirely</span>}
    </span>
  );
}