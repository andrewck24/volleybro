import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { V_CORAL } from "@/components/brand/logo-symbol";

type Theme = "light" | "dark";
type Rgb = [number, number, number];
type Tokens = Record<string, string>;

function readTokens(file: string): Record<Theme, Tokens> {
  const css = readFileSync(path.join(__dirname, "..", "..", file), "utf8");
  const light: Tokens = {};
  const dark: Tokens = {};
  postcss.parse(css).walkRules((rule) => {
    const selectors = rule.selectors;
    const isLight = selectors.includes(":root");
    const isDark = selectors.includes(".dark");
    rule.walkDecls(/^--/, (decl) => {
      const name = decl.prop.slice(2);
      if (isLight) light[name] = decl.value;
      if (isDark) dark[name] = decl.value;
    });
  });
  return { light, dark: { ...light, ...dark } };
}

const app = readTokens("src/app/globals.css");
const blueprint = readTokens("blueprint/src/styles/global.css");

function toRgb(tokens: Tokens, name: string): Rgb {
  const value = tokens[name];
  if (value === undefined) throw new Error(`--${name} is not defined`);
  const alias = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  if (alias) return toRgb(tokens, alias);
  const hsl = value.match(
    /^hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%\s*\)$/,
  );
  if (!hsl) throw new Error(`--${name}: cannot read "${value}"`);
  const h = Number(hsl[1]);
  const s = Number(hsl[2]) / 100;
  const l = Number(hsl[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [channel(0), channel(8), channel(4)];
}

function luminance([r, g, b]: Rgb) {
  const linear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(theme: Theme, a: string, b: string) {
  const first = luminance(toRgb(app[theme], a));
  const second = luminance(toRgb(app[theme], b));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const TEXT = 4.5;
const ICON = 3;
const BOTH: Theme[] = ["light", "dark"];

const pairs: { fg: string; bg: string; min: number; themes?: Theme[] }[] = [
  { fg: "destructive-foreground", bg: "destructive", min: TEXT },
  { fg: "away-foreground", bg: "away", min: TEXT },
  { fg: "error-foreground", bg: "error", min: TEXT },
  { fg: "destructive-text", bg: "card", min: TEXT },
  { fg: "destructive-text", bg: "accent", min: TEXT },
  { fg: "away-text", bg: "card", min: TEXT },
  { fg: "away-text", bg: "accent", min: TEXT },
  { fg: "error-text", bg: "card", min: TEXT },
  { fg: "error-text", bg: "accent", min: TEXT },
  { fg: "primary-text", bg: "card", min: TEXT },
  { fg: "primary-text", bg: "accent", min: TEXT },
  { fg: "primary-text", bg: "muted", min: ICON, themes: ["dark"] },
  { fg: "court-foreground", bg: "court", min: TEXT },
  { fg: "court-foreground", bg: "court-back-zone", min: TEXT },
  { fg: "primary-foreground", bg: "primary", min: TEXT },
  { fg: "muted-foreground", bg: "muted", min: TEXT },
  { fg: "muted-foreground", bg: "card", min: TEXT },
  { fg: "muted-foreground", bg: "background", min: TEXT },
];

describe("globals.css colour tokens", () => {
  it.each(
    pairs.flatMap(({ fg, bg, min, themes = BOTH }) =>
      themes.map((theme) => ({ theme, fg, bg, min })),
    ),
  )("$theme: $fg on $bg reaches $min:1", ({ theme, fg, bg, min }) => {
    expect(contrast(theme, fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it.each(BOTH)("%s: --court equals the mark coral", (theme) => {
    const mark = [1, 3, 5].map((i) => parseInt(V_CORAL.slice(i, i + 2), 16));
    toRgb(app[theme], "court").forEach((channel, i) => {
      expect(
        Math.abs(Math.round(channel * 255) - mark[i]!),
      ).toBeLessThanOrEqual(1);
    });
  });

  it.each(BOTH)("%s: the Blueprint copy holds the app's values", (theme) => {
    const shared = Object.keys(blueprint[theme]).filter(
      (name) => name in app[theme],
    );
    expect(shared).toEqual(
      expect.arrayContaining(pairs.flatMap((p) => [p.fg, p.bg])),
    );
    for (const name of shared) {
      expect([name, blueprint[theme][name]]).toEqual([name, app[theme][name]]);
    }
  });
});
