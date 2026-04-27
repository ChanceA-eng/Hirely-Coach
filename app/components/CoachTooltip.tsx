"use client";

import { useState, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type CoachContext = "quiz" | "starr" | "interview" | "general";

interface CoachTooltipProps {
  message: string;
  context?: CoachContext;
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * Wrap mode — pass the question/statement as children.
   * Hovering the children triggers the HC nudge.
   * If omitted, a small HC icon badge is rendered as the trigger instead.
   */
  children?: React.ReactNode;
  /** Icon shown inside the badge when no children provided. Defaults to "HC" */
  triggerSymbol?: string;
}

const CONTEXT_ACCENT: Record<CoachContext, string> = {
  quiz:      "#0d9488",
  starr:     "#7c3aed",
  interview: "#10b981",
  general:   "#10b981",
};

const CONTEXT_LABELS: Record<CoachContext, string> = {
  quiz:      "Quiz Tip",
  starr:     "STARR Tip",
  interview: "Coach Tip",
  general:   "Coach Tip",
};

export default function CoachTooltip({
  children,
  message,
  context = "general",
  placement = "top",
  triggerSymbol,
}: CoachTooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
  }
  function hide() {
    hideTimer.current = setTimeout(() => setVisible(false), 160);
  }

  const accent = CONTEXT_ACCENT[context];
  const label  = CONTEXT_LABELS[context];

  // Bubble position relative to the trigger wrapper
  const resolvedPlacement = placement === "left" ? "top" : placement === "right" ? "bottom" : placement;
  const bubblePos: React.CSSProperties =
    resolvedPlacement === "top"
      ? { bottom: "calc(100% + 10px)", left: 0 }
      : { top:    "calc(100% + 10px)", left: 0 };

  const bubble = (
    <AnimatePresence>
      {visible && (
        <motion.div
          id={id}
          role="tooltip"
          initial={{ opacity: 0, y: resolvedPlacement === "top" ? 6 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={  { opacity: 0, y: resolvedPlacement === "top" ? 6 : -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          style={{
            position: "absolute",
            ...bubblePos,
            zIndex: 9999,
            minWidth: 220,
            maxWidth: 300,
            background: "rgba(6, 78, 59, 0.12)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${accent}55`,
            borderRadius: 10,
            padding: "10px 14px",
            pointerEvents: "none",
          } as React.CSSProperties}
        >
          {/* HC badge row */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              background: accent,
              borderRadius: "50%",
              fontSize: "0.58rem",
              fontWeight: 800,
              color: "#fff",
              fontFamily: "sans-serif",
              letterSpacing: "-0.02em",
              flexShrink: 0,
            }}>
              HC
            </span>
            <span style={{
              color: accent,
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>
              {label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}>
            {message}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Wrap mode: children are the hover trigger ────────────────────────────
  if (children) {
    return (
      <span
        style={{ position: "relative", display: "block", cursor: "default" }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
        {bubble}
      </span>
    );
  }

  // ── Icon mode: small HC badge is the trigger ─────────────────────────────
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        aria-describedby={id}
        aria-label="Coach tip"
        style={{
          background: accent,
          border: "none",
          borderRadius: "50%",
          width: 20,
          height: 20,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginLeft: 5,
          lineHeight: 1,
          fontSize: "0.6rem",
          fontWeight: 800,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {triggerSymbol ?? "HC"}
      </button>
      {bubble}
    </span>
  );
}
