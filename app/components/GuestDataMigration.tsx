"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { migrateGuestDataToUser } from "../lib/interviewStorage";

export default function GuestDataMigration() {
  const { userId } = useAuth();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (!userId || migratedRef.current) return;
    migrateGuestDataToUser(userId);
    migratedRef.current = true;
  }, [userId]);

  return null;
}
