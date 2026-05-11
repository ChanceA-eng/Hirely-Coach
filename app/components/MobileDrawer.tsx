"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount?: number;
}

export default function MobileDrawer({ isOpen, onClose, unreadCount = 0 }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [mode, setMode] = useState<"foundation" | "coach" | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    fetch("/api/user/mode")
      .then((response) => response.json() as Promise<{ current_mode: "foundation" | "coach" | null }>)
      .then((payload) => {
        if (!cancelled) setMode(payload.current_mode);
      })
      .catch(() => {
        if (!cancelled) setMode(pathname?.startsWith("/foundation") ? "foundation" : "coach");
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, pathname]);

  const isFoundation = (isSignedIn ? mode : null) === "foundation" || pathname?.startsWith("/foundation");
  const currentPath = pathname ?? "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
            onClick={onClose}
            style={{ backgroundColor: "#000000" }}
          />

          <motion.div
            ref={drawerRef}
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 md:hidden bg-[#0a0a0a]"
            style={{
              backgroundColor: "#0a0a0a",
              borderRight: "1px solid rgba(148, 163, 184, 0.1)",
              boxShadow: "20px 0 50px rgba(0,0,0,0.8)",
              paddingTop: "max(16px, env(safe-area-inset-top))",
              paddingBottom: "max(16px, env(safe-area-inset-bottom))",
              opacity: 1,
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-white/5"
              aria-label="Close drawer"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <nav className="flex flex-col gap-1 p-6 pt-12">
              <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-[#006837] opacity-80">
                {isFoundation ? "Foundation Menu" : "Hirely Menu"}
              </div>

              {isFoundation ? (
                <>
                  <DrawerLink
                    href="/foundation/home"
                    icon={<OutlineIcon variant="foundation" />}
                    label="My Path"
                    active={currentPath.startsWith("/foundation/home")}
                    onClick={onClose}
                  />
                  <DrawerButton
                    icon={<BellIcon unreadCount={unreadCount} />}
                    label="Notifications"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("foundation:open-inbox"));
                      onClose();
                    }}
                  />
                  <DrawerLink
                    href="/help"
                    icon={<OutlineIcon variant="help" />}
                    label="Help"
                    active={currentPath.startsWith("/help")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/foundation/settings"
                    icon={<OutlineIcon variant="settings" />}
                    label="Settings"
                    active={currentPath.startsWith("/foundation/settings")}
                    onClick={onClose}
                  />
                </>
              ) : (
                <>
                  <DrawerLink
                    href="/growthhub"
                    icon={<OutlineIcon variant="home" />}
                    label="GrowthHub"
                    active={currentPath.startsWith("/growthhub")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/foundation/home"
                    icon={<OutlineIcon variant="foundation" />}
                    label="Foundation"
                    active={currentPath.startsWith("/foundation")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/training"
                    icon={<OutlineIcon variant="training" />}
                    label="Accelerator"
                    active={currentPath.startsWith("/training")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/voice?mode=new"
                    icon={<OutlineIcon variant="interview" />}
                    label="Mock Interview"
                    active={currentPath.startsWith("/voice")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/history"
                    icon={<OutlineIcon variant="history" />}
                    label="History"
                    active={currentPath.startsWith("/history")}
                    onClick={onClose}
                  />
                  <DrawerButton
                    icon={<BellIcon unreadCount={unreadCount} />}
                    label="Notifications"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("foundation:open-inbox"));
                      onClose();
                    }}
                  />
                  <DrawerLink
                    href="/growthhub/profile"
                    icon={<OutlineIcon variant="settings" />}
                    label="Profile & Settings"
                    active={currentPath.startsWith("/growthhub/profile")}
                    onClick={onClose}
                  />
                  <DrawerLink
                    href="/help"
                    icon={<OutlineIcon variant="help" />}
                    label="Help"
                    active={currentPath.startsWith("/help")}
                    onClick={onClose}
                  />
                </>
              )}

              <div className="my-4 border-t border-white/5" />

              {isSignedIn && (
                <DrawerButton
                  icon={<OutlineIcon variant="logout" />}
                  label="Log Out"
                  danger
                  onClick={() => {
                    onClose();
                    void signOut({ redirectUrl: "/" });
                  }}
                />
              )}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function BellIcon({ unreadCount }: { unreadCount: number }) {
  return (
    <span style={{ position: "relative", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <OutlineIcon variant="bell" />
      {unreadCount > 0 && (
        <span
          style={{
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
            border: "2px solid #0a0a0a",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-[48px] items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-white/10"
      style={{
        color: active ? "#93c5fd" : "#e2e8f0",
        fontSize: "0.95rem",
        fontWeight: active ? 700 : 500,
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center text-[#94a3b8]">{icon}</span>
      {label}
    </Link>
  );
}

function DrawerButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-white/10"
      style={{
        color: danger ? "#fca5a5" : "#e2e8f0",
        fontSize: "0.95rem",
        fontWeight: 600,
        justifyContent: "flex-start",
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center text-[#94a3b8]">{icon}</span>
      {label}
    </button>
  );
}

function OutlineIcon({ variant }: { variant: "home" | "foundation" | "training" | "interview" | "history" | "bell" | "help" | "settings" | "logout" }) {
  const stroke = "currentColor";
  const strokeWidth = 1.8;
  const iconProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (variant) {
    case "home":
      return <svg {...iconProps}><path d="M3 11.5L12 4l9 7.5" /><path d="M6 10.5V20h12v-9.5" /><path d="M10 20v-6h4v6" /></svg>;
    case "foundation":
      return <svg {...iconProps}><path d="M4 12l8-7 8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></svg>;
    case "training":
      return <svg {...iconProps}><path d="M4 18l6-6 4 4 6-8" /><path d="M18 8h2v2" /></svg>;
    case "interview":
      return <svg {...iconProps}><path d="M7 5h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4 3v-3H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /><path d="M10 10h4" /></svg>;
    case "history":
      return <svg {...iconProps}><path d="M4 7h16v12H4z" /><path d="M8 7V5h8v2" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>;
    case "bell":
      return <svg {...iconProps}><path d="M12 4a4 4 0 0 0-4 4v3c0 .8-.3 1.6-.9 2.2L6 14h12l-1.1-.8c-.6-.6-.9-1.4-.9-2.2V8a4 4 0 0 0-4-4z" /><path d="M10 18a2 2 0 0 0 4 0" /></svg>;
    case "help":
      return <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.9c-.7.6-1.7 1.1-1.7 2.6" /><path d="M12 17h.01" /></svg>;
    case "settings":
      return <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.3.4.6.6 1 .1.3.1.7.1 1s0 .7-.1 1a3 3 0 0 0-.5 3z" /></svg>;
    case "logout":
      return <svg {...iconProps}><path d="M10 17l-1 0a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h1" /><path d="M15 8l4 4-4 4" /><path d="M19 12H10" /></svg>;
    default:
      return null;
  }
}
