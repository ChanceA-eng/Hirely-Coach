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
    <a
      href={href}
      className={className}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
      aria-label={isFoundationRoute ? "Hirely Foundation" : "Hirely Coach"}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 76 76"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="hirelyBlue" x1="4" y1="8" x2="36" y2="56" gradientUnits="userSpaceOnUse">
            <stop stopColor="#214fb4" />
            <stop offset="1" stopColor="#0f2f87" />
          </linearGradient>
          <linearGradient id="hirelyGreen" x1="34" y1="20" x2="68" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#12935a" />
            <stop offset="1" stopColor="#06683a" />
          </linearGradient>
        </defs>

        <circle cx="18" cy="14" r="9" fill="url(#hirelyBlue)" />
        <path
          d="M25 52C31 35 42 23 58 20C47 26 39 34 34 43C39 44.5 45 48 51 54H25Z"
          fill="url(#hirelyBlue)"
        />
        <path
          d="M32 22H57C61.4 22 65 25.6 65 30V54C65 58.4 61.4 62 57 62H28C23.6 62 20 58.4 20 54V38C20 29.2 27.2 22 36 22Z"
          fill="url(#hirelyGreen)"
        />
        <path
          d="M38 22V19.8C38 17 40.3 14.7 43.1 14.7H50.6C53.4 14.7 55.7 17 55.7 19.8V22"
          stroke="#0a4e2f"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M34 34H40.8V42H46.8V34H53.6V53H46.8V45H40.8V53H34V34Z"
          fill="#eefcf5"
        />
      </svg>

      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          lineHeight: 0.92,
          transform: "translateY(1px)",
        }}
      >
        <span
          style={{
            color: "#1c4db0",
            fontSize: "1em",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          Hirely
        </span>
        <span
          style={{
            color: "#0b7a46",
            fontSize: "0.74em",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginTop: 1,
          }}
        >
          {isFoundationRoute ? "Foundation" : "Coach"}
        </span>
      </span>
    </a>
  );
}
