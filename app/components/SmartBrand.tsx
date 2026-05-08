"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function SmartBrand({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFoundationRoute = pathname?.startsWith("/foundation") ?? false;

  const src = isFoundationRoute
    ? "/HIrelylogo.Vertical.png"
    : "/hirelylogo.Horizontal.png";

  // Native image ratios from provided assets:
  // foundation vertical: 600x730, standard horizontal: 286x108.
  const width = isFoundationRoute ? 600 : 286;
  const height = isFoundationRoute ? 730 : 108;

  // ── Secret Handshake: double-click logo → admin ────────────────────────
  function handleClick(e: React.MouseEvent) {
    clickCountRef.current += 1;
    if (clickCountRef.current === 2) {
      e.preventDefault();
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      router.push("/admin/login");
      return;
    }
    // Reset count after 400ms if second click doesn't come
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 400);
  }

  return (
    <Link href="/" className={className} onClick={handleClick} style={{ cursor: "pointer" }} aria-label="Go to homepage">
      <Image
        src={src}
        alt={isFoundationRoute ? "Hirely Foundation" : "Hirely Coach"}
        width={width}
        height={height}
        priority
        className="global-header-brand-logo"
      />
    </Link>
  );
}
