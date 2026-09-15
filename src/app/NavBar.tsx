"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface SearchResult {
  fn: string;
  section: string;
  desc: string;
  element: HTMLElement;
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const isDocs = pathname === "/docs";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const search = useCallback((q: string) => {
    const needle = q.toLowerCase().trim();
    if (!needle) {
      setResults([]);
      setOpen(false);
      return;
    }

    const fnBlocks = document.querySelectorAll<HTMLElement>("[data-fn]");
    const hits: SearchResult[] = [];

    fnBlocks.forEach((el) => {
      const fn = el.getAttribute("data-fn") ?? "";
      const desc = el.getAttribute("data-desc") || (el.textContent ?? "").slice(0, 120).trim();
      const section = el.closest("section[id]");
      const sectionId = section?.id ?? "";
      const sectionTitle = section?.querySelector("h2")?.textContent ?? sectionId;

      const fnLower = fn.toLowerCase();
      const descLower = desc.toLowerCase();

      if (fnLower.includes(needle) || descLower.includes(needle)) {
        hits.push({ fn, section: sectionTitle, desc, element: el });
      }
    });

    hits.sort((a, b) => {
      const aExact = a.fn.toLowerCase().startsWith(needle) ? 0 : 1;
      const bExact = b.fn.toLowerCase().startsWith(needle) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.fn.localeCompare(b.fn);
    });

    setResults(hits.slice(0, 25));
    setSelectedIdx(0);
    setOpen(hits.length > 0);
  }, []);

  const navigateTo = useCallback((result: SearchResult) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();

    result.element.scrollIntoView({ behavior: "smooth", block: "center" });

    result.element.style.transition = "background 0.3s, outline 0.3s";
    result.element.style.background = "rgba(142,111,247,0.08)";
    result.element.style.outline = "1px solid rgba(142,111,247,0.25)";
    result.element.style.borderRadius = "4px";
    setTimeout(() => {
      result.element.style.background = "";
      result.element.style.outline = "";
      result.element.style.borderRadius = "";
    }, 1500);
  }, []);

  useEffect(() => {
    if (isDocs) search(query);
    else { setResults([]); setOpen(false); }
  }, [query, search, isDocs]);

  useEffect(() => {
    setQuery("");
    setResults([]);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isDocs) {
          router.push("/docs");
        }
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDocs, router]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateTo(results[selectedIdx]);
    }
  };

  useEffect(() => {
    if (!open) return;
    const el = dropdownRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, open]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.section] ??= []).push(r);
    return acc;
  }, {});

  let globalIdx = 0;

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
            onFocus={() => { if (query.trim()) search(query); }}
            onKeyDown={onKeyDown}
            placeholder="Search docs... (Ctrl+K)"
            className="w-full bg-surface-2 border border-border rounded px-3 py-1.5 text-xs text-text placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors"
          />
          {query && !open && results.length === 0 && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-[10px] text-text-faint">No matches</span>
            </div>
          )}

          {open && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-[100] max-h-[min(420px,60vh)] overflow-y-auto"
            >
              <div className="px-3 py-2 border-b border-border">
                <span className="text-[10px] text-text-faint uppercase tracking-wider">
                  {results.length} result{results.length !== 1 ? "s" : ""}
                </span>
              </div>
              {Object.entries(grouped).map(([section, items]) => (
                <div key={section}>
                  <div className="px-3 py-1.5 bg-surface-2/50">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{section}</span>
                  </div>
                  {items.map((r) => {
                    const idx = globalIdx++;
                    const isSelected = idx === selectedIdx;
                    const fnParts = r.fn.split(".");
                    const module = fnParts.length > 1 ? fnParts[0] + "." : "";
                    const name = fnParts.length > 1 ? fnParts.slice(1).join(".") : r.fn;

                    return (
                      <button
                        key={r.fn}
                        data-idx={idx}
                        onClick={() => navigateTo(r)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors cursor-pointer ${
                          isSelected ? "bg-accent/10" : "hover:bg-surface-2"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-mono">
                            <span className="text-text-faint">{module}</span>
                            <span className={isSelected ? "text-accent font-bold" : "text-text font-bold"}>{name}</span>
                          </span>
                          {isSelected && (
                            <span className="ml-auto text-[9px] text-text-faint bg-surface-2 px-1.5 py-0.5 rounded">
                              Enter ↵
                            </span>
                          )}
                        </div>
                        {r.desc && (
                          <span className="text-[10px] text-text-faint leading-tight line-clamp-1">
                            {r.desc}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="px-3 py-2 border-t border-border flex items-center gap-3 text-[10px] text-text-faint">
                <span><kbd className="bg-surface-2 px-1 py-0.5 rounded text-[9px]">↑↓</kbd> navigate</span>
                <span><kbd className="bg-surface-2 px-1 py-0.5 rounded text-[9px]">↵</kbd> go to</span>
                <span><kbd className="bg-surface-2 px-1 py-0.5 rounded text-[9px]">esc</kbd> close</span>
              </div>
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
    </nav>
  );
}
