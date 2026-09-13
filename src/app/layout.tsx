import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamesense.cloud",
  description: "Game enhancement suite for CS2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <nav className="border-b border-border px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-accent hover:opacity-80 transition-opacity">
            gamesense<span className="text-text-faint">.cloud</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-text-faint">
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
            <Link href="/login" className="hover:text-text-muted transition-colors">
              Login
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
