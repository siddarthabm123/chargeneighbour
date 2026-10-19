import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChargeNeighbour — Your neighbourhood. Fully charged.",
  description: "Find EV charging stations across India through Google Maps and apply to become a ChargeNeighbour charger host.",
  icons: {
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
