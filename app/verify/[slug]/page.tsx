import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";

type VerificationProfile = {
  slug: string;
  credentialId: string;
  publicEnabled: boolean;
  showContact: boolean;
  levelTitle: string;
  resumeScore: number;
  topSimulationScore: number;
  consistencyWeeks: number;
  certificationsCompleted: number;
  badges: string[];
};

type ImpactEntry = {
  id: string;
  createdAt: number;
  action: string;
  proof: string;
  result: string;
};

type Props = {
  params: Promise<{ slug: string }>;
};

function asProfile(input: unknown): VerificationProfile {
  const row = (input ?? {}) as Record<string, unknown>;
  return {
    slug: String(row.slug || "").trim(),
    credentialId: String(row.credentialId || "").trim(),
    publicEnabled: Boolean(row.publicEnabled),
    showContact: Boolean(row.showContact),
    levelTitle: String(row.levelTitle || "Novice").trim(),
    resumeScore: Math.max(0, Math.min(100, Math.floor(Number(row.resumeScore || 0)))),
    topSimulationScore: Math.max(0, Math.min(100, Math.floor(Number(row.topSimulationScore || 0)))),
    consistencyWeeks: Math.max(0, Math.floor(Number(row.consistencyWeeks || 0))),
    certificationsCompleted: Math.max(0, Math.floor(Number(row.certificationsCompleted || 0))),
    badges: Array.isArray(row.badges) ? row.badges.map((b) => String(b || "").trim()).filter(Boolean).slice(0, 8) : [],
  };
}

function asImpactEntries(input: unknown): ImpactEntry[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: String(row.id || "").trim(),
        createdAt: Math.floor(Number(row.createdAt || 0)),
        action: String(row.action || "").trim(),
        proof: String(row.proof || "").trim(),
        result: String(row.result || "").trim(),
      };
    })
    .filter((entry) => entry.id && entry.createdAt && entry.action && entry.proof && entry.result)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
}

async function findBySlug(slug: string) {
  const client = await clerkClient();
  const users = await client.users.getUserList({ limit: 200 });
  for (const user of users.data) {
    const publicMetadata = (user.publicMetadata as Record<string, unknown>) || {};
    const profile = asProfile(publicMetadata.verificationProfile);
    if ((profile.slug === slug || profile.credentialId === slug) && profile.publicEnabled) {
      return {
        profile,
        displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Hirely Professional",
        email: user.emailAddresses[0]?.emailAddress || "",
        topWins: asImpactEntries(publicMetadata.impactLedger),
      };
    }
  }
  return null;
}

export default async function VerifyPage({ params }: Props) {
  const { slug } = await params;
  const found = await findBySlug(slug);

  if (!found) {
    return (
      <div className="lp-root">
        <main className="page-shell-gh" style={{ paddingTop: 48 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h1 className="gh-page-h1" style={{ marginBottom: 12 }}>Verification Profile Not Found</h1>
            <p className="gh-page-sub">This profile is private or does not exist.</p>
            <Link href="/" className="lp-btn-ghost" style={{ marginTop: 14, display: "inline-flex" }}>
              Back to Hirely Coach
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { profile, displayName, email, topWins } = found;

  return (
    <div className="lp-root">
      <main className="page-shell-gh" style={{ paddingTop: 32 }}>
        <section className="glass-card" style={{ padding: 24, marginBottom: 18 }}>
          <p className="gh-page-eyebrow">Verified Talent</p>
          <h1 className="gh-page-h1" style={{ marginBottom: 8 }}>{displayName}</h1>
          <p className="gh-page-sub" style={{ marginBottom: 0 }}>
            Competency Milestone: {profile.levelTitle}
          </p>
          {profile.credentialId && (
            <p className="gh-page-sub" style={{ marginTop: 6, marginBottom: 0 }}>
              Credential ID: {profile.credentialId}
            </p>
          )}
          {profile.showContact && email && (
            <p className="gh-page-sub" style={{ marginTop: 6 }}>Contact: {email}</p>
          )}
        </section>

        <section className="glass-card" style={{ padding: 24, marginBottom: 18 }}>
          <h2 className="th-section-title" style={{ marginBottom: 14 }}>Active Verification</h2>
          <div className="archive-week-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div className="archive-week-tile has-data">
              <span>Verified STAR Method Proficiency</span>
              <strong>{profile.topSimulationScore}/100</strong>
            </div>
            <div className="archive-week-tile has-data">
              <span>Resume Quality Signal</span>
              <strong>{profile.resumeScore}/100</strong>
            </div>
            <div className="archive-week-tile has-data">
              <span>Consistency</span>
              <strong>{profile.consistencyWeeks} weeks</strong>
            </div>
            <div className="archive-week-tile has-data">
              <span>Verified Certifications</span>
              <strong>{profile.certificationsCompleted}</strong>
            </div>
          </div>
        </section>

        <section className="glass-card" style={{ padding: 24 }}>
          <h2 className="th-section-title" style={{ marginBottom: 12 }}>Badges</h2>
          {profile.badges.length === 0 ? (
            <p className="gh-page-sub" style={{ margin: 0 }}>No badges published.</p>
          ) : (
            <div className="ph-pills">
              {profile.badges.map((badge) => (
                <span key={badge} className="ph-pill ph-pill--selected" style={{ cursor: "default" }}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card" style={{ padding: 24, marginTop: 18 }}>
          <h2 className="th-section-title" style={{ marginBottom: 12 }}>Top Verified Impact Wins</h2>
          {topWins.length === 0 ? (
            <p className="gh-page-sub" style={{ margin: 0 }}>No published wins yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {topWins.map((win) => (
                <div key={win.id} className="archive-week-tile has-data" style={{ display: "block", textAlign: "left" }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>{win.action}</strong>
                  <span style={{ display: "block", color: "#94a3b8" }}>{win.proof}</span>
                  <span style={{ display: "block", marginTop: 4 }}>{win.result}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
