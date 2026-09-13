import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Radar — gamesense.cloud",
  description: "Live CS2 radar overlay",
};

export default function RadarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
