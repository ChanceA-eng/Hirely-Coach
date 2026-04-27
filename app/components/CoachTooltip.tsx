"use client";

import { useState, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type CoachContext = "quiz" | "starr" | "interview" | "general";

interface CoachTooltipProps {
  message: string;
  context?: CoachContext;
  /** Position hint — defaults to "top" */
  placement?: "top" | "bottom" | "left" | "right";
  /** Trigger glyph shown in the nudge badge, defaults to "?" */
  triggerSymbol?: "?" | "!";
  /** Override the trigger element — defaults to the HC icon */
  children?: React.ReactNode;
}

const CONTEXT_COLORS: Record<CoachContext, string> = {
  quiz: "#0d9488",
  starr: "#7c3aed",
  interview: "#064e3b",
  general: "#374151",
};

const CONTEXT_LABELS: Record<CoachContext, string> = {
  quiz: "Quiz Tip",
  starr: "STARR Tip",
  interview: "Coach Tip",
  general: "Coach Tip",
};

/** Small floating "HC" badge that reveals a coaching tooltip on hover/focus */
export default function CoachTooltip({
  message,
  context = "general",
  placement = "top",
  triggerSymbol = "?",
  children,
}: CoachTooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  }
  function hide() {
    timerRef.current = setTimeout(() => setVisible(false), 120);
  }
  function toggle() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible((v) => !v);
  }

  const color = CONTEXT_COLORS[context];
  const label = CONTEXT_LABELS[context];

  const offsetStyle = placement === "top"
    ? { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : placement === "bottom"
    ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : placement === "left"
    ? { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" }
    : { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", verticalAlign: "middle" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {/* Trigger */}
      <button
        type="button"
        aria-describedby={id}
        aria-label="Coach tip"
        style={{
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: `1px solid ${color}aa`,
          borderRadius: "50%",
          width: 24,
          height: 24,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginLeft: 6,
          boxShadow: `0 2px 8px ${color}33`,
          lineHeight: 1,
          transition: "box-shadow 0.2s, border-color 0.2s",
        }}
        onClick={toggle}
      >
        {children ?? (
          <span style={{ fontSize: "0.58rem", fontWeight: 800, color: color, fontFamily: "sans-serif", letterSpacing: "-0.02em" }}>
            {triggerSymbol}
          </span>
        )}
      </button>

      {/* Bubble */}
      <AnimatePresence>
        {visible && (
          <motion.div
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.92, y: placement === "bottom" ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              ...offsetStyle,
              zIndex: 9999,
              width: 240,
              background: "rgba(6, 12, 28, 0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#f1f5f9",
              borderRadius: 10,
              border: `1px solid ${color}55`,
              padding: "10px 13px",
              fontSize: "0.78rem",
              lineHeight: 1.55,
              boxShadow: `0 8px 24px rgba(0,0,0,0.25), 0 0 0 1px ${color}22`,
              pointerEvents: "none",
            } as React.CSSProperties}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `1px solid ${color}99`,
                  color: color,
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                !
              </span>
              <span style={{
                background: color,
                color: "#fff",
                fontSize: "0.6rem",
                fontWeight: 800,
                borderRadius: 4,
                padding: "1px 6px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}>
                {label}
              </span>
            </div>
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
