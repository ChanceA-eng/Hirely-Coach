"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { migrateGuestDataToUser } from "../lib/interviewStorage";
import { syncInterviewProgress } from "../lib/interviewProgress";

export default function GuestDataMigration() {
  const { userId } = useAuth();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!userId || migratedRef.current) return;
    const result = migrateGuestDataToUser(userId);
    if (result.latestSnapshot) {
      syncInterviewProgress(result.latestSnapshot).catch(() => {
        // Non-blocking: local migration already succeeded.
      });
    }
    migratedRef.current = true;
  }, [userId]);

  return null;
}
