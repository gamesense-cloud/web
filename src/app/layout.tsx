import type { Metadata } from "next";
import Link from "next/link";
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
        <nav className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="text-sm font-bold text-accent hover:opacity-80 transition-opacity">
            gamesense<span className="text-text-faint">.cloud</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6 text-xs text-text-faint flex-wrap">
            <Link href="/docs" className="hover:text-text-muted transition-colors">
              Docs
            </Link>
            <Link href="/web-radar" className="hover:text-text-muted transition-colors">
              Radar
            </Link>
            <Link href="/changelog" className="hover:text-text-muted transition-colors">
              Changelog
            </Link>
            <Link href="/contact" className="hover:text-text-muted transition-colors">
              Contact
            </Link>
          </div>
        </nav>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-border py-5 px-6">
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
