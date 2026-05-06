"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";

export default function SmartBrand({ className }: { className?: string }) {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [href, setHref] = useState("/");
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFoundationRoute = pathname?.startsWith("/foundation") ?? false;

  useEffect(() => {
    if (isFoundationRoute) {
      setHref("/foundation/home");
      return;
    }

    if (isSignedIn) {
      setHref("/growthhub");
      return;
    }

    try {
      const raw = window.localStorage.getItem("hirelyCoachInterviewHistory");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHref("/growthhub");
        }
      }
    } catch {
      // fallback to "/"
    }
  }, [isSignedIn, isFoundationRoute]);

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
    <a href={href} className={className} onClick={handleClick} style={{ cursor: "pointer" }}>
      {isFoundationRoute ? "Hirely Foundation" : "Hirely Coach"}
    </a>
  );
}
