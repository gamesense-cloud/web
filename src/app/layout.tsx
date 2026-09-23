import type { Metadata } from "next";
import Shell from "./Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "gamesense.cloud",
  description:
    "CS2 enhancement suite with live web radar, 23-module Lua scripting API, and in-game ImGui overlay.",
  metadataBase: new URL("https://gamesense.cloud"),
  openGraph: {
    title: "gamesense.cloud",
    description:
      "Live web radar, Lua scripting API, and in-game overlay for Counter-Strike 2.",
    siteName: "gamesense.cloud",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "gamesense.cloud",
    description:
      "Live web radar, Lua scripting API, and in-game overlay for CS2.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
