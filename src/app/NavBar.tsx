"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const isDocs = pathname === "/docs";
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyFilter = useCallback((q: string) => {
    const needle = q.toLowerCase().trim();
    const sections = document.querySelectorAll<HTMLElement>("section[id]");
    const fnBlocks = document.querySelectorAll<HTMLElement>("[data-fn]");
    const navLinks = document.querySelectorAll<HTMLAnchorElement>("[data-nav-id]");

    if (!needle) {
      sections.forEach((s) => (s.hidden = false));
      fnBlocks.forEach((f) => (f.hidden = false));
      navLinks.forEach((n) => n.classList.remove("docs-nav-hidden"));
      setMatchCount(-1);
      return;
    }

    let hits = 0;

    fnBlocks.forEach((f) => {
      const name = (f.getAttribute("data-fn") ?? "").toLowerCase();
      const text = (f.textContent ?? "").toLowerCase();
      const match = name.includes(needle) || text.includes(needle);
      f.hidden = !match;
      if (match) hits++;
    });

    sections.forEach((s) => {
      const id = s.id.toLowerCase();
      const title = (s.querySelector("h2")?.textContent ?? "").toLowerCase();
      const sectionMatch = id.includes(needle) || title.includes(needle);

      if (sectionMatch) {
        s.hidden = false;
        s.querySelectorAll<HTMLElement>("[data-fn]").forEach((f) => {
          f.hidden = false;
          hits++;
        });
      } else {
        const visibleFns = s.querySelectorAll<HTMLElement>("[data-fn]:not([hidden])");
        s.hidden = visibleFns.length === 0;
      }
    });

    navLinks.forEach((n) => {
      const navId = n.getAttribute("data-nav-id") ?? "";
      const section = document.getElementById(navId);
      if (section?.hidden) {
        n.classList.add("docs-nav-hidden");
      } else {
        n.classList.remove("docs-nav-hidden");
      }
    });

    setMatchCount(hits);
  }, []);

  useEffect(() => {
    if (isDocs) applyFilter(query);
  }, [query, applyFilter, isDocs]);

  useEffect(() => {
    setQuery("");
    setMatchCount(-1);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-bg backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
      <Link href="/" className="text-sm font-bold hover:opacity-80 transition-opacity flex-shrink-0">
        <span className="text-text">gamesense</span>
        <span className="text-accent">.cloud</span>
      </Link>

      {isDocs && (
        <div className="relative flex-1 min-w-[160px] max-w-md">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs... (Ctrl+K)"
            className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
          />
          {query && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-[10px] text-text-faint">
                {matchCount === 0 ? "No matches" : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
              </span>
              <button
                onClick={() => setQuery("")}
                className="text-text-faint hover:text-text text-xs leading-none"
              >
                &times;
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 sm:gap-6 text-xs text-text-faint ml-auto flex-shrink-0">
        <Link href="/docs" className="hover:text-text-muted transition-colors">
          Docs
        </Link>
        <Link href="/web-radar" className="hover:text-text-muted transition-colors">
          Radar
        </Link>
        <a href="https://discord.gg/8U668smGy8" target="_blank" rel="noopener noreferrer" className="hover:text-text-muted transition-colors">
          Discord
        </a>
      </div>
      <style>{`.docs-nav-hidden { opacity: 0.25; pointer-events: none; }`}</style>
    </nav>
  );
}
