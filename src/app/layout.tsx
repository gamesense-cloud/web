import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamesense.cloud",
  description: "Game enhancement suite",
};

function Nav() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/changelog", label: "Changelog" },
    { href: "/contact", label: "Contact" },
    { href: "/policy", label: "Policy" },
  ];
  return (
    <nav className="border-b border-border sticky top-0 bg-bg/80 backdrop-blur-md z-50">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-accent font-bold text-lg tracking-tight">
          gamesense<span className="text-text-muted">.cloud</span>
        </Link>
        <div className="flex gap-6 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-text-muted hover:text-text transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-text-muted">
        <span>&copy; {new Date().getFullYear()} gamesense.cloud</span>
        <div className="flex gap-4">
          <Link href="/policy" className="hover:text-text transition-colors">Policy</Link>
          <Link href="/contact" className="hover:text-text transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
