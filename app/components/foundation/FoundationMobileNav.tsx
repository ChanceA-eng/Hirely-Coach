"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  FOUNDATION_PROFILE_EVENT,
  getFoundationLanguagePref,
  getMode,
} from "@/app/lib/foundationProgress";

export default function FoundationMobileNav() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCoachUser, setIsCoachUser] = useState(false);
  const [language, setLanguage] = useState<"en" | "sw">("en");

  const copy = language === "sw"
    ? { myPath: "Masomo", inbox: "Ujumbe", growthHub: "Ukuaji", notificationsAria: "Taarifa", unreadSuffix: "hazijasomwa" }
    : { myPath: "My Path", inbox: "Inbox", growthHub: "GrowthHub", notificationsAria: "Notifications", unreadSuffix: "unread" };

  useEffect(() => {
    // Load local state immediately
    const localMode = getMode();
    setIsCoachUser(localMode === "coach");

    // Initial unread count fetch
    if (isSignedIn) {
      void fetch("/api/user/foundation-inbox")
        .then((r) => r.json() as Promise<{ unreadCount: number }>)
        .then((data) => setUnreadCount(data.unreadCount ?? 0))
        .catch(() => {});
    }

    // Listen for live count updates from FoundationCommandCenter
    function handleCount(e: Event) {
      const detail = (e as CustomEvent<{ count: number }>).detail;
      setUnreadCount(detail.count ?? 0);
    }
    window.addEventListener("hirely:unread-count", handleCount);

    function handleLanguagePref() {
      setLanguage(getFoundationLanguagePref());
    }
    window.addEventListener(FOUNDATION_PROFILE_EVENT, handleLanguagePref);

    return () => {
      window.removeEventListener("hirely:unread-count", handleCount);
      window.removeEventListener(FOUNDATION_PROFILE_EVENT, handleLanguagePref);
    };
  }, [isSignedIn]);

  // Only render on Foundation routes
  if (!pathname?.startsWith("/foundation")) return null;

  const isHomePath = pathname.startsWith("/foundation/home") || pathname === "/foundation";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 12, 14, 0.97)",
        borderTop: "1px solid rgba(16, 185, 129, 0.18)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: "max(10px, env(safe-area-inset-bottom))",
        paddingTop: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          maxWidth: "100%",
          padding: "0 8px",
          gap: 4,
        }}
      >
        {/* My Path */}
        <Link
          href="/foundation/home"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            minHeight: 48,
            gap: 3,
            color: isHomePath ? "#34d399" : "#94a3b8",
            textDecoration: "none",
            borderRadius: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l8-7 8 7" />
            <path d="M6 10v10h12V10" />
            <path d="M10 20v-5h4v5" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
            {copy.myPath}
          </span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          aria-label={`${copy.notificationsAria}${unreadCount > 0 ? `, ${unreadCount} ${copy.unreadSuffix}` : ""}`}
          onClick={() => window.dispatchEvent(new CustomEvent("foundation:toggle-inbox"))}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            minHeight: 48,
            gap: 3,
            color: unreadCount > 0 ? "#f59e0b" : "#94a3b8",
            background: "none",
            border: "none",
            cursor: "pointer",
            borderRadius: 10,
          }}
        >
          <div style={{ position: "relative" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: -5,
                right: -7,
                background: "#ef4444",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 800,
                lineHeight: 1,
                width: 15,
                height: 15,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid rgba(10, 12, 14, 0.97)",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
            {copy.inbox}
          </span>
        </button>

        {/* Return to GrowthHub — coach-mode users only */}
        {isCoachUser && (
          <Link
            href="/growthhub"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              minHeight: 48,
              gap: 3,
              color: "#94a3b8",
              textDecoration: "none",
              borderRadius: 10,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11.5L12 4l9 7.5" />
              <path d="M6 10.5V20h12v-9.5" />
              <path d="M10 20v-6h4v6" />
            </svg>
            <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
              {copy.growthHub}
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
