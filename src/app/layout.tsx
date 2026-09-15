import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "./NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamesense.cloud",
  description:
    "CS2 enhancement suite with live web radar, 23-module Lua scripting API, and in-game ImGui overlay.",
  metadataBase: new URL("https://gamesense.cloud"),
  openGraph: {
    title: "gamesense.cloud",
    description:
      "Live web radar, Lua scripting API, and in-game overlay for Counter-Strike 2.",
    siteName: "gamesense.cloud",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "gamesense.cloud",
    description:
      "Live web radar, Lua scripting API, and in-game overlay for CS2.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="sticky bottom-0 z-50 bg-bg border-t border-border py-5 px-6">
          <div className="max-w-md mx-auto flex items-center justify-between text-xs text-text-faint">
            <span>v1.0</span>
            <Link href="/policy" className="hover:text-text-muted transition-colors">
              Policy
            </Link>
            <span>&copy; {new Date().getFullYear()} gamesense.cloud</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
