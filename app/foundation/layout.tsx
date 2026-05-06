"use client";

import { ReactNode } from "react";

export default function FoundationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fn-shell">
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
