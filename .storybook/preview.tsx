import type { Preview } from "@storybook/nextjs";
import "../src/app/globals.css";

import { Toaster } from "@/components/ui/toaster";

import { withThemeByClassName } from "@storybook/addon-themes";
import { Noto_Sans_TC, Saira } from "next/font/google";

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

if (typeof document !== "undefined") {
  document.documentElement.classList.add(saira.variable, notoSansTC.variable);
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
    withThemeByClassName({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
