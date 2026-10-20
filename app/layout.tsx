import type { Metadata, Viewport } from "next";
export const viewport: Viewport = { themeColor: "#173b2b" };
import "./globals.css";
import "leaflet/dist/leaflet.css";
import AnalyticsChoice from "./analytics-choice";
import NetworkStatus from "./network-status";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL || "https://chargeneighbour-theta.vercel.app",
  ),
  title: "ChargeNeighbour — Your neighbourhood. Fully charged.",
  description:
    "Find mapped EV charging places, preview road routes and apply to share a home charger in a reviewed neighbourhood pilot.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "ChargeNeighbour",
    title: "Find a charge. Share your charger.",
    description:
      "Real station discovery. Applications for a verified neighbourhood charger-sharing pilot.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChargeNeighbour — Find a charge. Share your charger.",
    images: ["/opengraph-image"],
  },
  icons: {
    apple: "/images/app-192.png",
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NetworkStatus />
        {children}
        <AnalyticsChoice />
      </body>
    </html>
  );
}
