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
