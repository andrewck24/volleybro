import "./globals.css";
import type { ReactNode } from "react";
import { Noto_Sans_TC, Saira } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";

// Same font setup as the app (src/app/layout.tsx): Saira for Latin,
// Noto Sans TC as the CJK fallback — the docs render the real type system.
const saira = Saira({
  subsets: ["latin"],
  variable: "--font-saira",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-sans-tc",
  display: "fallback",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${saira.variable} ${notoSansTC.variable}`}
    >
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
