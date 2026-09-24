// 16px line icons in the menu's style: 1.5px strokes, currentColor.
type P = { className?: string; size?: number };

function Svg({ className, size = 16, children }: P & { children: React.ReactNode }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const Home = (p: P) => <Svg {...p}><path d="M2.5 7.2 8 2.8l5.5 4.4V13.2H9.6V9.8H6.4v3.4H2.5z" /></Svg>;
export const Code = (p: P) => <Svg {...p}><path d="M5.2 4.5 1.8 8l3.4 3.5M10.8 4.5 14.2 8l-3.4 3.5M9.2 3 6.8 13" /></Svg>;
export const Globe = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.8" /><ellipse cx="8" cy="8" rx="2.4" ry="5.8" /><path d="M2.4 8h11.2" /></Svg>;
export const Radar = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.8" /><circle cx="8" cy="8" r="2.6" /><circle cx="8" cy="8" r=".6" fill="currentColor" /></Svg>;
export const Scope = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="4.6" /><path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4" /></Svg>;
export const Nade = (p: P) => <Svg {...p}><circle cx="7" cy="10" r="3.7" /><path d="M9.6 7.3 11.2 5.7M10 3.2h3.3" /></Svg>;
export const Shader = (p: P) => <Svg {...p}><circle cx="8" cy="8" r="5.8" /><path d="M8 2.2a5.8 5.8 0 0 0 0 11.6z" fill="currentColor" /></Svg>;
export const Bolt = (p: P) => <Svg {...p}><path d="M9.2 1.6 4 9h4l-1.2 5.4L12 7H8z" /></Svg>;
export const Gear = (p: P) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="2.2" />
    <circle cx="8" cy="8" r="4.4" />
    <path d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
  </Svg>
);
export const Search = (p: P) => <Svg {...p}><circle cx="7" cy="7" r="4.2" /><path d="m10.2 10.2 3.3 3.3" /></Svg>;
export const Chat = (p: P) => <Svg {...p}><path d="M2.8 3.2h10.4v7.2H7.4L4.4 13v-2.6H2.8z" /></Svg>;
export const External = (p: P) => <Svg {...p}><path d="M6.5 3.5h-3v9h9v-3M9.5 2.5h4v4M13.5 2.5 7.8 8.2" /></Svg>;
export const Shield = (p: P) => <Svg {...p}><path d="M8 1.8 13 3.8v3.9c0 3-2.1 5.2-5 6.5-2.9-1.3-5-3.5-5-6.5V3.8z" /></Svg>;
export const Download = (p: P) => <Svg {...p}><path d="M8 2.5v8M4.6 7.2 8 10.6l3.4-3.4M2.8 13.5h10.4" /></Svg>;
export const Pencil = (p: P) => <Svg {...p}><path d="M10.6 2.6l2.8 2.8L5.8 13H3v-2.8z" /></Svg>;
export const Tabs = (p: P) => <Svg {...p}><rect x="2.2" y="3" width="11.6" height="10" /><path d="M2.2 6.2h11.6M6.2 3v3.2" /></Svg>;
export const Refresh = (p: P) => <Svg {...p}><path d="M13.2 8A5.2 5.2 0 1 1 11.6 4.2M13.4 1.8v3h-3" /></Svg>;
export const Menu = (p: P) => <Svg {...p}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" /></Svg>;
export const Expand = (p: P) => <Svg {...p}><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" /></Svg>;
export const Sliders = (p: P) => <Svg {...p}><path d="M2.5 4.5h7M12.5 4.5h1M2.5 11.5h1M6.5 11.5h7" /><circle cx="11" cy="4.5" r="1.5" /><circle cx="5" cy="11.5" r="1.5" /></Svg>;
export const Close = (p: P) => <Svg {...p}><path d="m4 4 8 8M12 4l-8 8" /></Svg>;
export const Caret = (p: P) => <Svg {...p}><path d="M4.8 6.4h6.4L8 9.8z" fill="currentColor" stroke="none" /></Svg>;
export const Grip = (p: P) => <Svg {...p}><path d="M14 9 9 14M14 5 5 14M14 13l-1 1" strokeWidth="1" /></Svg>;
