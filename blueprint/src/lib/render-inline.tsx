import { Fragment, type ReactNode } from "react";

// Splits on backtick pairs only — no bold, links, or other markdown. An
// unmatched backtick has no closing pair to split on, so it stays literal.
export function renderInline(text: string): ReactNode {
  const parts = text.split(/`([^`]+)`/);
  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code key={i}>{part}</code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
