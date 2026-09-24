"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DISCORD_URL } from "@/lib/site";
import * as I from "./icons";

const NAV = [
  { href: "/", label: "Home", Icon: I.Home },
  { href: "/docs", label: "Docs", Icon: I.Code },
  { href: "/web-radar", label: "Web Radar", Icon: I.Radar },
];

// The docs' modules, as a strip under the bar that follows the page.
const DOC_MODULES = [
  "engine", "entity", "renderer", "input", "bit", "ui", "events", "http", "cheat", "system", "math",
  "json", "store", "file", "timer", "ffi", "cvar", "memory", "anim", "net", "sound", "trace", "types", "scripts",
];

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
  const navIndex = NAV.findIndex((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)));

  const [open, setOpen] = useState(false); // the menu under the bar, on narrow screens
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [pick, setPick] = useState(0);
  const [active, setActive] = useState("");
  const [stats, setStats] = useState<{ users: number; radars: number } | null>(null);
  const [marker, setMarker] = useState<{ x: number; w: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // ---- the accent under the current page, sliding from tab to tab
  useLayoutEffect(() => {
    const measure = () => {
      const tab = tabsRef.current?.querySelectorAll<HTMLElement>("a")[navIndex];
      setMarker(tab ? { x: tab.offsetLeft, w: tab.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [navIndex]);

  useEffect(() => setOpen(false), [pathname]);

  // ---- docs search
  useEffect(() => {
    setHits(isDocs ? searchDocs(query) : []);
    setPick(0);
  }, [query, isDocs]);

  useEffect(() => {
    if (!isDocs) setQuery("");
  }, [isDocs]);

  const go = useCallback((hit: Hit) => {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    hit.el.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(hit.el);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!isDocs) router.push("/docs");
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 60);
      } else if (e.key === "Escape") {
        setQuery("");
        setOpen(false);
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

  // ---- which module the docs are showing, for the strip
  useEffect(() => {
    if (!isDocs) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      let current = "";
      for (const id of DOC_MODULES) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 130) current = id;
      }
      if (!current) current = DOC_MODULES[0];
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2)
        current = DOC_MODULES[DOC_MODULES.length - 1];
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [isDocs]);

  useEffect(() => {
    const strip = stripRef.current;
    const on = strip?.querySelector<HTMLElement>("a.on");
    if (strip && on && strip.scrollWidth > strip.clientWidth)
      strip.scrollTo({ left: on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2, behavior: "smooth" });
  }, [active]);

  // ---- who is online, like the menu's "0 loaded · 8 fps"
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
    <div className={open ? "app open" : "app"}>
      <header className="top">
        <Link href="/" className="brand">gamesense<i>.cloud</i></Link>

        <div className="top-menu" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
          <nav className="tabs" ref={tabsRef}>
            {NAV.map(({ href, label, Icon }, i) => (
              <Link key={href} href={href} className={i === navIndex ? "on" : undefined}>
                <Icon size={14} />
                {label}
              </Link>
            ))}
            <span
              className="tabs-hl"
              style={marker ? { transform: `translateX(${marker.x}px)`, width: marker.w } : { opacity: 0 }}
            />
          </nav>

          <div className="top-end">
            <div className="search">
              <I.Search size={13} />
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
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="top-link" aria-label="Discord">
              <I.Chat size={14} />
              <span>Discord</span>
            </a>
            <Link href="/policy" className="top-link top-policy">
              <I.Shield size={14} />
              <span>Policy</span>
            </Link>
            {stats && stats.users > 0 && (
              <span className="online" title={stats.radars > 0 ? `${stats.radars} radar${stats.radars === 1 ? "" : "s"} live` : undefined}>
                <span className="dot ok pulse" />
                {stats.users.toLocaleString()} online
              </span>
            )}
          </div>
        </div>

        <button type="button" className="burger" aria-label={open ? "Close the menu" : "Open the menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <I.Close /> : <I.Menu />}
        </button>
      </header>

      {isDocs && (
        <div className="strip" ref={stripRef}>
          {DOC_MODULES.map((id) => (
            <a key={id} href={`#${id}`} className={active === id ? "on" : undefined}>
              {id === "types" ? "Types" : id === "scripts" ? "Scripts" : id}
            </a>
          ))}
        </div>
      )}

      <div className="scrim" onClick={() => setOpen(false)} />
      <main className="main">{children}</main>
    </div>
  );
}
