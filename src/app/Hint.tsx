"use client";

// The menu's "?": its help shows only while the pointer is on the mark (or it has focus), above
// it; `down` for a mark with no room above, `end` for one near the right edge. A click on it does
// nothing (inside a label it would toggle the box).
export default function Hint({ text, down, end }: { text: string; down?: boolean; end?: boolean }) {
  return (
    <span
      className={`hint${down ? " down" : ""}${end ? " end" : ""}`}
      tabIndex={0}
      aria-label={text}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      ?<span role="tooltip">{text}</span>
    </span>
  );
}
