import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import GuestDataMigration from "./components/GuestDataMigration";
import AppChrome from "./components/AppChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hirely Coach – AI Resume Optimization & Interview Practice",
  description: "Improve your resume, practice real interviews, and track your achievements with Hirely Coach. AI-powered career tools to help you get a better job.",
  keywords: "resume optimization, interview practice, AI career tools, job interview preparation, resume builder, career tracking, mock interview",
  openGraph: {
    title: "Hirely Coach – AI Resume Optimization & Interview Practice",
    description: "Improve your resume, practice real interviews, and track your achievements with Hirely Coach.",
    url: "https://hirelycoach.com",
    siteName: "Hirely Coach",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hirely Coach – AI Resume Optimization & Interview Practice",
    description: "Improve your resume, practice real interviews, and track your achievements with Hirely Coach.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#6366f1",
              colorBackground: "#0a0a0a",
              colorText: "#ffffff",
              colorTextSecondary: "#f3f4f6",
              colorInputText: "#f3f4f6",
            },
            elements: {
              card: {
                background: "rgba(10, 10, 10, 0.82)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 24px 64px rgba(2, 6, 23, 0.45)",
              },
              cardBox: {
                background: "transparent",
              },
              headerTitle: {
                color: "#ffffff",
              },
              headerSubtitle: {
                color: "#f3f4f6",
              },
              formFieldLabel: {
                color: "#f3f4f6",
                fontWeight: 500,
              },
              formFieldInput: {
                color: "#f3f4f6",
                background: "rgba(15, 23, 42, 0.62)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              },
              formFieldHintText: {
                color: "#f3f4f6",
              },
              formButtonPrimary: {
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              },
              footerActionText: {
                color: "#f3f4f6",
                fontWeight: 500,
              },
              footerActionLink: {
                color: "#ffffff",
                fontWeight: 500,
                textDecoration: "underline",
              },
              identityPreviewText: {
                color: "#f3f4f6",
              },
            },
          }}
        >
          <GuestDataMigration />
          <AppChrome>{children}</AppChrome>
        </ClerkProvider>
      </body>
    </html>
  );
}
