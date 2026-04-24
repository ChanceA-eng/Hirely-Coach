"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

export default function SmartBrand({ className }: { className?: string }) {
  const { isSignedIn } = useAuth();
  const [href, setHref] = useState("/");

  useEffect(() => {
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
  }, [isSignedIn]);

  return (
    <Link href={href} className={className}>
      Hirely Coach
    </Link>
  );
}
