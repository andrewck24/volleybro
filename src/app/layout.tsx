import "@/app/globals.css";
import { SerwistProvider } from "@/app/serwist-provider";
import { SWRProvider } from "@/components/layout/swr-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ReduxProvider } from "@/lib/redux/provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { devices } from "@/app/apple-splash/devices";
import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC, Saira } from "next/font/google";

const APP_NAME = "VolleyBro";
const APP_DEFAULT_TITLE = "VolleyBro";
const APP_TITLE_TEMPLATE = "%s | VolleyBro";
const APP_DESCRIPTION = "Best volleyball stats app ever.";
const AUTHOR = "Andrew Tseng";

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

export const metadata: Metadata = {
  manifest: "/manifest.json",
  applicationName: APP_NAME,
  title: { default: APP_DEFAULT_TITLE, template: APP_TITLE_TEMPLATE },
  description: APP_DESCRIPTION,
  keywords: ["volleyball", "stats", "app", "volleybro", "VolleyBro"],
  authors: [{ name: APP_NAME }, { name: AUTHOR }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
    startupImage: devices.map(({ media, width, height }) => ({
      url: `/apple-splash/${width}x${height}`,
      media,
    })),
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f2f6" }],
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  width: "device-width",
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${saira.variable} ${notoSansTC.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* apple touch icons, learn more: https://developer.apple.com/design/human-interface-guidelines/app-icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="apple-touch-icon"
          sizes="76x76"
          href="/apple-touch-icon-76x76.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="114x114"
          href="/apple-touch-icon-114x114.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="120x120"
          href="/apple-touch-icon-120x120.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/apple-touch-icon-144x144.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/apple-touch-icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="167x167"
          href="/apple-touch-icon-167x167.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon-180x180.png"
        />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="VolleyBro" />
        <meta property="og:site_name" content="VolleyBro" />
        <meta
          property="og:description"
          content="Best volleyball stats app ever"
        />
        {/* TODO: 尚未補上 og 圖片 */}
        {/* TODO: twitter 設定待補 */}
      </head>
      <body>
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV !== "production"}
        >
          <SWRProvider>
            <ReduxProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                {children}
                <Toaster />
                <Analytics />
                <SpeedInsights />
              </ThemeProvider>
            </ReduxProvider>
          </SWRProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
