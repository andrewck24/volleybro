import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(
  path.join(__dirname, "..", "app", "globals.css"),
  "utf8",
);

function tokens(selector: string) {
  const block = css.match(
    new RegExp(`^${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "m"),
  )?.[1];
  if (!block) throw new Error(`no ${selector} block in globals.css`);
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
  );
}

const themes = {
  light: tokens(":root,\n.light"),
  dark: { ...tokens(":root,\n.light"), ...tokens(".dark") },
};

type Rgb = [number, number, number];

function toRgb(theme: Record<string, string>, name: string): Rgb {
  const value = theme[name];
  if (value === undefined) throw new Error(`--${name} is not defined`);
  const alias = value.match(/^var\(--([\w-]+)\)$/)?.[1];
  if (alias) return toRgb(theme, alias);
  const hsl = value.match(
    /^hsl\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%\s*\)$/,
  );
  if (!hsl) throw new Error(`--${name}: cannot read "${value}"`);
  const [h, s, l] = [
    Number(hsl[1]),
    Number(hsl[2]) / 100,
    Number(hsl[3]) / 100,
  ];
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

function contrast(theme: keyof typeof themes, a: string, b: string) {
  const first = luminance(toRgb(themes[theme], a));
  const second = luminance(toRgb(themes[theme], b));
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const TEXT = 4.5;
const ICON = 3;

// [foreground, background, minimum ratio, themes it is drawn in]
const pairs: [string, string, number, (keyof typeof themes)[]][] = [
  ["destructive-foreground", "destructive", TEXT, ["light", "dark"]],
  ["destructive-text", "card", TEXT, ["light", "dark"]],
  ["destructive-text", "accent", TEXT, ["light", "dark"]],
  ["primary-text", "card", ICON, ["dark"]],
  ["primary-text", "accent", ICON, ["dark"]],
  ["court-foreground", "court", TEXT, ["light", "dark"]],
  ["court-foreground", "court-back-zone", TEXT, ["light", "dark"]],
  ["primary-foreground", "primary", TEXT, ["light", "dark"]],
];

describe("design token contrast", () => {
  it.each(
    pairs.flatMap(([fg, bg, min, on]) =>
      on.map((theme) => [theme, fg, bg, min] as const),
    ),
  )("%s: %s on %s reaches %s:1", (theme, fg, bg, min) => {
    expect(contrast(theme, fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("keeps the court brand coral while destructive is derived from it", () => {
    for (const theme of ["light", "dark"] as const) {
      expect(themes[theme].court).toBe("hsl(13.01, 96.51%, 66.27%)");
      expect(luminance(toRgb(themes[theme], "destructive"))).toBeLessThan(
        luminance(toRgb(themes[theme], "court")),
      );
    }
  });
});
