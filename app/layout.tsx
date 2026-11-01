import type { Metadata, Viewport } from "next";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./game.css";
import "./journey.css";
import "./monster-power.css";
import "./creature-power.css";
import "./location-search.css";
import "./map-layers.css";
import "./collector.css";
import "./collector-navigation.css";

export const metadata: Metadata = {
  title: "PotholeKiller | Hunt potholes. Save your streets.",
  description: "Turn road damage into a useful report and an original collectable creature, with UK address lookup and a playful Hackney demo map.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#091c30" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-GB"><body>{children}</body></html>;
}
