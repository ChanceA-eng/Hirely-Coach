"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  FOUNDATION_INBOX_EVENT,
  FOUNDATION_PROFILE_EVENT,
  FOUNDATION_PROGRESS_EVENT,
  getFoundationLanguagePref,
  getFoundationProfile,
  hydrateFoundationState,
  setFoundationLanguagePref,
} from "@/app/lib/foundationProgress";
import type { FoundationInboxItem } from "@/app/lib/foundationInbox";

type ModeResponse = {
  current_mode: "foundation" | "coach" | null;
  foundation_progress: {
    completedLessons: string[];
    completedModules: number[];
    assessmentScores: Record<string, number>;
    graduatedAt?: string;
  };
  foundation_profile: {
    onboarding_complete: boolean;
    total_xp: number;
    language_pref: "en" | "sw";
  };
  foundation_override?: {
    unlocked_modules?: number[];
  };
};

const UI_TEXT = {
  en: {
    drawerTitle: "Updates",
    markAll: "Mark All as Read",
    empty: "No new items right now.",
    legal: "v1.0.0 · Terms · Privacy",
    learner: "Learner",
    closeInboxAria: "Close inbox",
    justNow: "just now",
    minAgo: "m ago",
    hourAgo: "h ago",
    dayAgo: "d ago",
  },
  sw: {
    drawerTitle: "Taarifa",
    markAll: "Weka Zote Zimesomwa",
    empty: "Hakuna taarifa mpya kwa sasa.",
    legal: "v1.0.0 · Masharti · Faragha",
    learner: "Mwanafunzi",
    closeInboxAria: "Funga kikasha",
    justNow: "sasa hivi",
    minAgo: "dk zilizopita",
    hourAgo: "saa zilizopita",
    dayAgo: "siku zilizopita",
  },
} as const;

function playDing() {
  if (typeof window === "undefined") return;
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.02;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.1);
  oscillator.stop(context.currentTime + 0.1);
  void context.close().catch(() => {});
}

function formatTimeAgo(
  createdAt: number,
  copy: {
    justNow: string;
    minAgo: string;
    hourAgo: string;
    dayAgo: string;
  }
): string {
  const diff = Date.now() - createdAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return copy.justNow;
  if (mins < 60) return `${mins} ${copy.minAgo}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${copy.hourAgo}`;
  return `${Math.floor(hours / 24)} ${copy.dayAgo}`;
}

export default function FoundationCommandCenter() {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "sw">(getFoundationLanguagePref());
  const [notifications, setNotifications] = useState<FoundationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showIosA2hsPrompt, setShowIosA2hsPrompt] = useState(false);
  const initialLoadRef = useRef(true);
  const lastUnreadRef = useRef(0);

  const copy = UI_TEXT[language];
  const profileName = user?.firstName ?? user?.fullName ?? copy.learner;

  async function loadState() {
    try {
      const [modeRes, inboxRes] = await Promise.all([
        fetch("/api/user/mode").then((res) => res.json() as Promise<ModeResponse>),
        fetch("/api/user/foundation-inbox").then((res) => res.json() as Promise<{ notifications: FoundationInboxItem[]; unreadCount: number }>),
      ]);

      hydrateFoundationState({
        mode: modeRes.current_mode,
        progress: modeRes.foundation_progress,
        profile: modeRes.foundation_profile,
        override: modeRes.foundation_override,
      });

      setLanguage(modeRes.foundation_profile.language_pref === "en" ? "en" : "sw");
      setNotifications(inboxRes.notifications);
      setUnreadCount(inboxRes.unreadCount);

      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        lastUnreadRef.current = inboxRes.unreadCount;
        return;
      }

      if (inboxRes.unreadCount > lastUnreadRef.current) {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(100);
        }
        playDing();
      }
      lastUnreadRef.current = inboxRes.unreadCount;
    } catch (error) {
      console.warn("Foundation state refresh failed; retrying next cycle.", error);
    }
  }

  useEffect(() => {
    const handleInboxRefresh = () => {
      void loadState();
    };
    const handleOpenInbox = () => {
      setOpen(true);
      void loadState();
    };
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        void loadState();
      }
    };

    void loadState();

    const interval = window.setInterval(() => {
      void loadState();
    }, 8000);

    const syncLocal = () => {
      const profile = getFoundationProfile();
      setLanguage(profile.languagePref);
    };

    window.addEventListener(FOUNDATION_PROGRESS_EVENT, syncLocal);
    window.addEventListener(FOUNDATION_PROFILE_EVENT, syncLocal);
    window.addEventListener(FOUNDATION_INBOX_EVENT, handleInboxRefresh);
    window.addEventListener("foundation:open-inbox", handleOpenInbox);
    window.addEventListener("focus", handleInboxRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    syncLocal();

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    setShowIosA2hsPrompt(isIos && !standalone);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(FOUNDATION_PROGRESS_EVENT, syncLocal);
      window.removeEventListener(FOUNDATION_PROFILE_EVENT, syncLocal);
      window.removeEventListener(FOUNDATION_INBOX_EVENT, handleInboxRefresh);
      window.removeEventListener("foundation:open-inbox", handleOpenInbox);
      window.removeEventListener("focus", handleInboxRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  async function markAllRead() {
    await fetch("/api/user/foundation-inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-read" }),
    });
    void loadState();
  }

  async function openNotification(item: FoundationInboxItem) {
    if (!item.read) {
      await fetch("/api/user/foundation-inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-read", id: item.id }),
      });
    }
    setOpen(false);
    void loadState();
    router.push(item.href);
  }

  async function toggleLanguage(next: "en" | "sw") {
    setLanguage(next);
    setFoundationLanguagePref(next);
  }

  return (
    <div style={styles.shell}>
      {showIosA2hsPrompt && (
        <div style={styles.a2hsPrompt}>
          <p style={styles.a2hsText}>
            iOS: Tumia Share then Add to Home Screen kuwezesha web push kikamilifu.
          </p>
          <button type="button" style={styles.a2hsDismiss} onClick={() => setShowIosA2hsPrompt(false)}>
            Sawa
          </button>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label={copy.closeInboxAria}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={styles.scrim}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 26 }}
              transition={{ duration: 0.18 }}
              style={styles.drawer}
            >
              <div style={styles.drawerTop}>
                <p style={styles.drawerTitle}>{copy.drawerTitle}</p>
                <div style={styles.languagePill}>
                  <button
                    type="button"
                    style={{ ...styles.languageBtn, ...(language === "en" ? styles.languageBtnActive : {}) }}
                    onClick={() => void toggleLanguage("en")}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    style={{ ...styles.languageBtn, ...(language === "sw" ? styles.languageBtnActive : {}) }}
                    onClick={() => void toggleLanguage("sw")}
                  >
                    SW
                  </button>
                </div>
              </div>

              <div style={styles.listHead}>
                <p style={styles.listMeta}>{profileName}</p>
                <button type="button" onClick={() => void markAllRead()} style={styles.markAllButton}>
                  {copy.markAll}
                </button>
              </div>

              <div style={styles.notificationList}>
                {notifications.length === 0 ? (
                  <p style={styles.emptyState}>{copy.empty}</p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openNotification(item)}
                      style={{ ...styles.notificationCard, ...(item.read ? styles.notificationRead : styles.notificationUnread) }}
                    >
                      <div style={styles.notificationRow}>
                        <strong style={styles.notificationTitle}>{item.title}</strong>
                        {!item.read && <span style={styles.notificationDot} />}
                      </div>
                      <p style={{ ...styles.notificationBody, ...(language === "sw" ? styles.notificationBodySw : undefined) }}>{item.body}</p>
                      <span style={styles.notificationTime}>{formatTimeAgo(item.createdAt, copy)}</span>
                    </button>
                  ))
                )}
              </div>

              <div style={styles.drawerFooter}>
                <p style={styles.legalText}>{copy.legal}</p>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "contents",
  },
  scrim: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.45)",
    border: 0,
    zIndex: 49,
  },
  drawer: {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: "min(380px, 100vw)",
    background: "rgba(26, 26, 26, 0.86)",
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: "#2f2f2f",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 50,
    display: "grid",
    gridTemplateRows: "auto auto auto 1fr auto",
    gap: 10,
    padding: "0.9rem",
    color: "#e0e0e0",
  },
  drawerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  drawerTitle: {
    margin: 0,
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#e0e0e0",
  },
  languagePill: {
    display: "inline-flex",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#2f2f2f",
    borderRadius: 4,
    overflow: "hidden",
    background: "#1a1a1a",
  },
  languageBtn: {
    border: "none",
    background: "transparent",
    color: "#a0a0a0",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0.35rem 0.55rem",
    cursor: "pointer",
  },
  languageBtnActive: {
    background: "#242424",
    color: "#e0e0e0",
  },
  categoryTabs: {},
  categoryBtn: {},
  categoryBtnActive: {},
  listHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderTop: "1px solid #333333",
    borderBottom: "1px solid #333333",
    padding: "0.55rem 0",
  },
  listMeta: {
    margin: 0,
    fontSize: "0.74rem",
    color: "#a0a0a0",
  },
  markAllButton: {
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    background: "transparent",
    color: "#8bc5ff",
    fontSize: "0.72rem",
    cursor: "pointer",
    padding: 0,
  },
  notificationList: {
    overflowY: "auto",
    display: "grid",
    gap: 0,
    alignContent: "start",
  },
  emptyState: {
    margin: 0,
    padding: "0.9rem 0",
    color: "#8d8d8d",
    fontSize: "0.8rem",
  },
  notificationCard: {
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    borderBottom: "1px solid #333333",
    background: "transparent",
    textAlign: "left",
    padding: "0.7rem 0",
    cursor: "pointer",
    display: "grid",
    gap: 6,
  },
  notificationUnread: {},
  notificationRead: { opacity: 0.72 },
  notificationRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontSize: "0.8rem",
    color: "#e0e0e0",
    fontWeight: 700,
  },
  notificationBody: {
    margin: 0,
    fontSize: "0.78rem",
    lineHeight: 1.45,
    color: "#d2d2d2",
  },
  notificationBodySw: {
    color: "#a0a0a0",
  },
  notificationTime: {
    fontSize: "0.68rem",
    color: "#7c7c7c",
  },
  notificationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    background: "#B00020",
    flexShrink: 0,
  },
  drawerFooter: {
    borderTop: "1px solid #333333",
    paddingTop: "0.5rem",
  },
  a2hsPrompt: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 4,
    padding: "0.45rem 0.55rem",
  },
  a2hsText: {
    margin: 0,
    fontSize: "0.72rem",
    color: "#d4d4d4",
  },
  a2hsDismiss: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#3a3a3a",
    borderRadius: 4,
    background: "#171717",
    color: "#e5e5e5",
    fontSize: "0.7rem",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0.2rem 0.5rem",
  },
  legalText: {
    margin: 0,
    fontSize: "0.66rem",
    color: "#707070",
  },
};
