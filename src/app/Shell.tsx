"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DISCORD_URL } from "@/lib/site";
import * as I from "./icons";

const NAV = [
  { href: "/", label: "Home", Icon: I.Home },
  { href: "/docs", label: "Docs", Icon: I.Code },
  { href: "/web-radar", label: "Web Radar", Icon: I.Radar },
];
const NAV_ROW = 28;

const TITLES: Record<string, string> = {
  "/": "Home",
  "/docs": "Docs",
  "/web-radar": "Web Radar",
  "/policy": "Policy",
};

const DOC_MODULES = [
  "engine", "entity", "renderer", "input", "bit", "ui", "events", "http", "cheat", "system", "math",
  "json", "store", "file", "timer", "ffi", "cvar", "memory", "anim", "net", "sound", "trace",
].map((id) => ({ id, label: id }));

// The per-page list under the rule, like the menu's "script tabs" section.
const SECTIONS: Record<string, { label: string; mono?: boolean; items: { id: string; label: string }[] }> = {
  "/": {
    label: "On this page",
    items: [
      { id: "features", label: "Features" },
      { id: "scripting", label: "Scripting" },
      { id: "start", label: "Get started" },
      { id: "requirements", label: "Requirements" },
    ],
  },
  "/docs": {
    label: "Modules",
    mono: true,
    items: [...DOC_MODULES, { id: "types", label: "Types" }, { id: "scripts", label: "Scripts" }],
  },
};

type Hit = { fn: string; module: string; desc: string; el: HTMLElement };

function searchDocs(query: string): Hit[] {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];
  const hits: Hit[] = [];
  document.querySelectorAll<HTMLElement>("[data-fn]").forEach((el) => {
    const fn = el.dataset.fn ?? "";
    const desc = el.dataset.desc || (el.textContent ?? "").slice(0, 120).trim();
    if (!fn.toLowerCase().includes(needle) && !desc.toLowerCase().includes(needle)) return;
    hits.push({ fn, desc, el, module: el.closest("section[id]")?.id ?? "" });
  });
  hits.sort(
    (a, b) =>
      Number(!a.fn.toLowerCase().startsWith(needle)) - Number(!b.fn.toLowerCase().startsWith(needle)) ||
      a.fn.localeCompare(b.fn),
  );
  return hits.slice(0, 25);
}

function flash(el: HTMLElement) {
  el.classList.remove("flash");
  void el.offsetWidth; // restart the animation when the same entry is picked twice
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1700);
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDocs = pathname === "/docs";
  const section = SECTIONS[pathname];
  const navIndex = NAV.findIndex((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [pick, setPick] = useState(0);
  const [active, setActive] = useState("");
  const [stats, setStats] = useState<{ users: number; radars: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);

  // ---- docs search
  useEffect(() => {
    setHits(isDocs ? searchDocs(query) : []);
    setPick(0);
  }, [query, isDocs]);

  useEffect(() => {
    if (pathname !== "/docs") setQuery("");
  }, [pathname]);

  const go = useCallback((hit: Hit) => {
    setQuery("");
    setDrawer(false);
    inputRef.current?.blur();
    hit.el.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(hit.el);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!isDocs) router.push("/docs");
        setDrawer(true);
        setTimeout(() => inputRef.current?.focus(), 60);
      } else if (e.key === "Escape") {
        setQuery("");
        setDrawer(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDocs, router]);

  useEffect(() => {
    resultsRef.current?.querySelector(`[data-i="${pick}"]`)?.scrollIntoView({ block: "nearest" });
  }, [pick]);

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (!hits.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setPick((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setPick((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(hits[pick]); }
  };

  // ---- scroll-spy for the section list
  useEffect(() => {
    if (!section) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = "";
      for (const { id } of section.items) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 96) current = id;
      }
      const first = document.getElementById(section.items[0].id);
      if (!current && first && first.getBoundingClientRect().top < window.innerHeight * 0.6) current = first.id;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
        current = section.items[section.items.length - 1].id;
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [section]);

  useEffect(() => {
    const list = tocRef.current;
    const on = list?.querySelector<HTMLElement>("a.on");
    if (list && on && list.scrollHeight > list.clientHeight)
      list.scrollTo({ top: on.offsetTop - list.clientHeight / 2, behavior: "smooth" });
  }, [active]);

  // ---- live status in the sidebar footer, like the menu's "0 loaded · 8 fps"
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/stats")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (alive && j && typeof j.active_users === "number")
            setStats({ users: j.active_users, radars: j.active_radars ?? 0 });
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  let n = 0;
  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => ((acc[h.module] ??= []).push(h), acc), {});

  return (
    <div className={drawer ? "app open" : "app"}>
      <aside className="side" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setDrawer(false); }}>
        <Link href="/" className="brand">gamesense<i>.cloud</i></Link>

        <div className="search">
          <I.Search size={14} />
          <input
            ref={inputRef}
            className="field"
            value={query}
            placeholder="Search docs"
            aria-label="Search the Lua API"
            onChange={(e) => {
              if (!isDocs && !query) router.push("/docs");
              setQuery(e.target.value);
            }}
            onKeyDown={onSearchKey}
          />
          {!query && <kbd className="kbd">Ctrl K</kbd>}
          {hits.length > 0 && (
            <div className="results" ref={resultsRef}>
              {Object.entries(grouped).map(([module, list]) => (
                <div key={module}>
                  <div className="label">{module}</div>
                  {list.map((h) => {
                    const i = n++;
                    const dot = h.fn.indexOf(".");
                    return (
                      <div
                        key={h.fn}
                        data-i={i}
                        className={i === pick ? "row on" : "row"}
                        onMouseEnter={() => setPick(i)}
                        onMouseDown={(e) => { e.preventDefault(); go(h); }}
                      >
                        <div className="min-w-0">
                          <code>
                            <span className="text-text-faint">{dot > 0 ? h.fn.slice(0, dot + 1) : ""}</span>
                            <b className="inline">{dot > 0 ? h.fn.slice(dot + 1) : h.fn}</b>
                          </code>
                          {h.desc && <small>{h.desc}</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="results-foot">
                <span><kbd className="kbd">↑↓</kbd> move</span>
                <span><kbd className="kbd">↵</kbd> open</span>
                <span><kbd className="kbd">esc</kbd> close</span>
              </div>
            </div>
          )}
        </div>

        <nav className="nav">
          <span
            className="nav-hl"
            style={{ transform: `translateY(${Math.max(navIndex, 0) * NAV_ROW}px)`, opacity: navIndex < 0 ? 0 : 1 }}
          />
          {NAV.map(({ href, label, Icon }, i) => (
            <Link key={href} href={href} className={i === navIndex ? "on" : undefined}>
              <Icon />
              {label}
            </Link>
          ))}
        </nav>

        {section && (
          <>
            <div className="rule" />
            <div className="label">{section.label}</div>
            <div ref={tocRef} className={section.mono ? "toc mono" : "toc"}>
              {section.items.map((item) => (
                <a key={item.id} href={`#${item.id}`} className={active === item.id ? "on" : undefined}>
                  {item.label}
                </a>
              ))}
            </div>
          </>
        )}

        <div className="side-foot">
          <div className="rule" />
          <nav className="nav static">
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
              <I.Chat />
              Discord
              <I.External className="ext" size={12} />
            </a>
            <Link href="/policy" className={pathname === "/policy" ? "on" : undefined}>
              <I.Shield />
              Policy
            </Link>
          </nav>
          <div className="side-status">
            {stats ? (
              <>
                <span className={stats.users > 0 ? "dot ok pulse" : "dot"} />
                {stats.users.toLocaleString()} online
                {stats.radars > 0 && ` · ${stats.radars} radar${stats.radars === 1 ? "" : "s"}`}
              </>
            ) : (
              <>&copy; {new Date().getFullYear()} gamesense.cloud</>
            )}
          </div>
        </div>
      </aside>

      <div className="scrim" onClick={() => setDrawer(false)} />

      <div className="main">
        <header className="bar">
          <button type="button" className="burger" aria-label="Open navigation" onClick={() => setDrawer(true)}>
            <I.Menu />
          </button>
          <Link href="/" className="wordmark">gamesense<i>.cloud</i></Link>
          <span className="crumb">/</span>
          <span className="bar-title">{TITLES[pathname] ?? "Not found"}</span>
        </header>
        {children}
      </div>
    </div>
  );
}
