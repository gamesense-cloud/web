// Port of the in-game editor's highlighter (dll/src/ui/LuaHighlighter.cpp), so
// code on the site is coloured exactly like code in the menu.

const KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function", "goto",
  "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while",
]);

// The editor's API roots, plus the modules the docs cover.
const API = new Set([
  "gscloud", "require", "print", "self", "string", "table", "math", "os", "utf8", "coroutine",
  "debug", "pairs", "ipairs", "type", "tostring", "tonumber", "pcall", "xpcall", "error",
  "assert", "select", "setmetatable", "getmetatable", "rawget", "rawset", "next", "unpack",
  "load", "ui", "events", "renderer", "input", "esp", "http", "cheat", "system", "json",
  "store", "file", "timer", "log", "ffi", "cvar", "trace", "panorama", "engine", "entity",
  "hooks", "globals", "types", "Color", "Vector", "QAngle", "Pointer",
  "bit", "memory", "anim", "net", "sound",
]);

const PUNCT = /[!-/:-@[-`{-~]/;

// "[", n "=", "[" at i -> n, otherwise -1.
function bracketLevel(src: string, i: number) {
  if (src[i] !== "[") return -1;
  let j = i + 1;
  while (src[j] === "=") j++;
  return src[j] === "[" ? j - i - 1 : -1;
}

function bracketEnd(src: string, from: number, level: number) {
  const close = `]${"=".repeat(level)}]`;
  const at = src.indexOf(close, from);
  return at === -1 ? src.length : at + close.length;
}

export function highlightLua(src: string): React.ReactNode[] {
  // [class, text] runs; adjacent runs of one class merge, like the editor's spans.
  const runs: [string, string][] = [];
  const emit = (cls: string, text: string) => {
    const last = runs[runs.length - 1];
    if (last && last[0] === cls) last[1] += text;
    else runs.push([cls, text]);
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === "-" && src[i + 1] === "-") {
      const level = bracketLevel(src, i + 2);
      const newline = src.indexOf("\n", i);
      const end = level >= 0 ? bracketEnd(src, i + level + 4, level) : newline === -1 ? src.length : newline;
      emit("c", src.slice(i, end));
      i = end;
      continue;
    }

    const level = bracketLevel(src, i);
    if (level >= 0) {
      const end = bracketEnd(src, i + level + 2, level);
      emit("s", src.slice(i, end));
      i = end;
      continue;
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      j = Math.min(j + 1, src.length);
      emit("s", src.slice(i, j));
      i = j;
      continue;
    }

    if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] ?? ""))) {
      let j = i + 1;
      while (j < src.length && (/[\w.]/.test(src[j]) || (/[+-]/.test(src[j]) && /[eEpP]/.test(src[j - 1])))) j++;
      emit("n", src.slice(i, j));
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /\w/.test(src[j])) j++;
      const word = src.slice(i, j);
      emit(KEYWORDS.has(word) ? "k" : API.has(word) ? "a" : "", word);
      i = j;
      continue;
    }

    emit(PUNCT.test(c) ? "p" : "", c);
    i++;
  }

  return runs.map(([cls, text], k) => (cls ? <span key={k} className={cls}>{text}</span> : text));
}

export default function LuaCode({ children, flush = false }: { children: string; flush?: boolean }) {
  return (
    <pre className={flush ? "code flush" : "code"}>
      <code>{highlightLua(children)}</code>
    </pre>
  );
}
