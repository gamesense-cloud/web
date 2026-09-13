import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Radar — gamesense.cloud",
  description: "Live CS2 radar view with player positions, grenades, bomb timer, and scoreboard. Share a link — no login required.",
  openGraph: {
    title: "Web Radar — gamesense.cloud",
    description: "Live CS2 radar view with player positions, grenades, and bomb tracking.",
    type: "website",
  },
};

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
