"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { loadGrowthHubSnapshot } from "../lib/interviewStorage";

export default function ReadinessPulse() {
  const { userId } = useAuth();
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const snap = loadGrowthHubSnapshot(userId);
      if (typeof snap?.starrScore === "number") {
        setScore(Math.min(100, Math.round(snap.starrScore)));
      }
    } catch {
      // no-op
    }
  }, [userId]);

  if (score === null) return null;

  return (
    <Link href="/growthhub" className="nav-hub-shortcut">
      <div className="pulse-dot" />
      <span className="score-text">{score}% Readiness</span>
    </Link>
  );
}
