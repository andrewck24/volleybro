import type { Preview } from "@storybook/nextjs";
import "../src/app/globals.css";

import { withThemeByClassName } from "@storybook/addon-themes";
import { Noto_Sans_TC, Saira } from "next/font/google";

// Stories render without app/layout.tsx, so the font variables it defines
// are absent and globals.css's `--font-sans: var(--font-saira), ...` chain
// resolves to nothing -- every story falls back to Tailwind's default
// stack. Declared here with the same options as the layout so a snapshot
// shows the typeface the app actually ships.
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

// `--font-sans` is declared on `:root`, so it resolves `var(--font-saira)`
// against the root element -- a wrapper deeper in the tree defines the
// variable too late to be seen. The layout puts these on <html> for the
// same reason.
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
    withThemeByClassName({
      themes: {
        // nameOfTheme: 'classNameForTheme',
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
