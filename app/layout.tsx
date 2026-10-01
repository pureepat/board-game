import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Werewolf Online",
  description: "Real-time multiplayer Werewolf / Mafia with an automated moderator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
