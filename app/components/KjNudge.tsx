"use client";

import { useState, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

const KJ_DEFINITION =
  "Your Kj (Known Job) is your professional anchor. It is the specific role our AI identified from your resume to ensure your puzzles and job matches are 100% relevant to your career.";

interface KjNudgeProps {
  /** Size of the ? badge — defaults to 16 */
  size?: number;
}

/**
 * Tiny "?" icon that shows the Kj definition on hover.
 * Drop it inline immediately after any "Kj" text mention.
 *
 * Usage: <span>Your Kj<KjNudge /></span>
 */
export default function KjNudge({ size = 16 }: KjNudgeProps) {
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
        aria-label="What is Kj?"
        style={{
          background: "transparent",
          border: "1.5px solid #10b981",
          borderRadius: "50%",
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
          marginLeft: 4,
          color: "#10b981",
          fontSize: size * 0.55 + "px",
          fontWeight: 700,
          fontFamily: "serif",
          lineHeight: 1,
        }}
      >
        ?
      </button>

      <AnimatePresence>
        {visible && (
          <motion.div
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              width: 260,
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: 10,
              padding: "10px 13px",
              fontSize: "0.78rem",
              lineHeight: 1.6,
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              pointerEvents: "none",
            } as React.CSSProperties}
          >
            <span style={{
              display: "inline-block",
              background: "#10b981",
              color: "#fff",
              fontSize: "0.6rem",
              fontWeight: 800,
              borderRadius: 4,
              padding: "1px 6px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}>
              What is Kj?
            </span>
            <br />
            {KJ_DEFINITION}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
