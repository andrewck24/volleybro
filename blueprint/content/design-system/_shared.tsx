// Shared building blocks for the design-system reference pages.
//
// These pages document the *VolleyBro app* tokens, not the blueprint site's
// own theme, so every color is rendered from a hard-coded hsl string sourced
// from `src/app/globals.css` — never `var(--token)`, which would resolve to
// the blueprint's tokens. Each token carries its light and dark value and a
// swatch shows both grounds at once, independent of the viewer's theme.

export type Token = {
  name: string;
  light: string;
  dark: string;
  usage: string;
};

// A single token rendered as a split light/dark chip with both hsl values.
export function Swatch({ token }: { token: Token }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          height: "56px",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid var(--color-border, rgba(128,128,128,0.3))",
        }}
      >
        <div style={{ flex: 1, background: token.light }} />
        <div style={{ flex: 1, background: token.dark }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <code style={{ fontSize: "0.8rem", fontWeight: 600 }}>
          {token.name}
        </code>
        <span
          style={{
            fontSize: "0.7rem",
            opacity: 0.7,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {token.light}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            opacity: 0.7,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {token.dark}
        </span>
        <span style={{ fontSize: "0.75rem", opacity: 0.85 }}>
          {token.usage}
        </span>
      </div>
    </div>
  );
}

// A responsive grid of swatches for one token group.
export function SwatchGrid({ tokens }: { tokens: Token[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "16px",
        margin: "16px 0 24px",
      }}
    >
      {tokens.map((t) => (
        <Swatch key={t.name} token={t} />
      ))}
    </div>
  );
}
