/**
 * Design tokens for programmatic usage (e.g. chart configs, dynamic styles).
 * Source of truth: src/app/globals.css CSS custom properties.
 */

export const chartColors = {
  1: "var(--chart-1)", // primary teal
  2: "var(--chart-2)", // destructive orange (contrast)
  3: "var(--chart-3)", // cool blue
  4: "var(--chart-4)", // warm yellow
  5: "var(--chart-5)", // neutral purple
} as const;

export const feedbackColors = {
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  destructive: "var(--destructive)",
} as const;

export const semanticColors = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  ...feedbackColors,
} as const;
