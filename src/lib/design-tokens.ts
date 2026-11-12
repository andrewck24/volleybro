export const chartColors = {
  teal: "var(--chart-1)",
  coral: "var(--chart-2)",
  blue: "var(--chart-3)",
  yellow: "var(--chart-4)",
  purple: "var(--chart-5)",
} as const;

export const feedbackColors = {
  success: "var(--success)",
  warning: "var(--warning)",
  info: "var(--info)",
  destructive: "var(--destructive)",
  error: "var(--error)",
  away: "var(--away)",
} as const;

export const semanticColors = {
  primary: "var(--primary)",
  secondary: "var(--secondary)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  ...feedbackColors,
} as const;
