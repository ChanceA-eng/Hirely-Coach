"use client";

import { ReactNode, Suspense } from "react";
import FoundationCommandCenter from "../components/foundation/FoundationCommandCenter";
import FoundationMobileNav from "../components/foundation/FoundationMobileNav";

export default function FoundationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fn-shell">
      <Suspense fallback={null}>
        <FoundationCommandCenter />
      </Suspense>
      <main className="fn-main">{children}</main>
      <Suspense fallback={null}>
        <FoundationMobileNav />
      </Suspense>

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

        @media (max-width: 767px) {
          .fn-main {
            padding-bottom: calc(88px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </div>
  );
}
