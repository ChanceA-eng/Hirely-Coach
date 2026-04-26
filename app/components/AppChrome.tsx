"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname?.startsWith("/admin");

  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}