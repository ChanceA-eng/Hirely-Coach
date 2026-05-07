"use client";

import { ReactNode, Suspense } from "react";
import FoundationCommandCenter from "../components/foundation/FoundationCommandCenter";

export default function FoundationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fn-shell">
      <Suspense fallback={null}>
        <FoundationCommandCenter />
      </Suspense>
      <main className="fn-main">{children}</main>

      <style>{`
        .fn-shell {
          min-height: 100vh;
          background: linear-gradient(160deg, #121212 0%, #0b0b0b 60%);
          display: flex;
          flex-direction: column;
        }
        .fn-main {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}
