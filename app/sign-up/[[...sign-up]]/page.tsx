import { SignUp } from "@clerk/nextjs";
import SmartBrand from "../../components/SmartBrand";
import "../../growthhub/page.css";

export default function SignUpPage() {
  return (
    <main className="auth-page lp-accelerator-theme gh-main">
      <div className="auth-shell gh-sidebar-card">
        <SmartBrand className="auth-brand" />
        <p className="gh-eyebrow">Account Access</p>
        <h1 className="gh-h1">Create your Hirely Coach account</h1>
      </div>
      <SignUp
        path="/sign-up"
        forceRedirectUrl="/growthhub"
        fallbackRedirectUrl="/growthhub"
        appearance={{
          variables: {
            colorPrimary: "#10b981",
            colorBackground: "#020617",
            colorText: "#f8fafc",
          },
          elements: {
            card: "glass-card",
            headerTitle: "auth-hidden",
            headerSubtitle: "auth-hidden",
            footerActionLink: "auth-link",
          },
        }}
      />
    </main>
  );
}
