import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PartyBros",
  description: "Party games for your friend group: Werewolf, One Night, Feed the Kraken, Insider and more. Play together at the table or online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
