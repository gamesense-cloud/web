"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  navItems: { id: string; label: string }[];
}

export default function DocsSearch({ navItems }: Props) {
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
    applyFilter(query);
  }, [query, applyFilter]);

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
    <div className="sticky top-[45px] z-10 bg-surface/95 backdrop-blur-sm border-b border-border -mx-6 px-6 py-3 mb-6">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search functions... (Ctrl+K)"
          className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-xs text-text-faint">
              {matchCount === 0 ? "No matches" : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
            </span>
            <button
              onClick={() => setQuery("")}
              className="text-text-faint hover:text-text text-xs"
            >
              &times;
            </button>
          </div>
        )}
      </div>
      <style>{`.docs-nav-hidden { opacity: 0.25; pointer-events: none; }`}</style>
    </div>
  );
}
