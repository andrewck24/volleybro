"use client";
import { ApproachComparison } from "@/components/ApproachComparison";
import { RiskTable } from "@/components/RiskTable";

const decisions = [
  {
    name: "D1: Runtime generation via next/og ImageResponse",
    pros: [
      "No new dependency — next/og is bundled with Next.js 16",
      "No build step or stored binaries",
      "Splash always tracks the current --primary token",
    ],
    cons: ["iOS fetches at install time (online), so runtime latency is acceptable"],
  },
  {
    name: "D2: Size from route segment, validated against a fixed list",
    pros: [
      "One handler serves all 15 device sizes",
      "Unsupported sizes return 404 — no mis-sized images silently served",
    ],
    cons: [
      "Extra path segments (e.g. 750x1334xfoo) are parsed loosely — non-security-relevant",
    ],
  },
  {
    name: 'D3: "V" mark as two inline SVG paths (Saira Stencil One)',
    pros: [
      "No runtime font dependency — glyph path data hardcoded",
      "Left/right arms filled independently (#F6F4F5 and #FC7A56)",
      "SVG sized to 25% of shorter dimension, centered",
    ],
    cons: ["Path data must be re-extracted manually if the glyph ever changes"],
  },
  {
    name: "D4: Fifteen device configs as shared source of truth",
    pros: [
      "Layout startupImage list and route validation share the same array",
      "Coverage and accepted sizes cannot drift apart",
    ],
    cons: ["New device sizes require a code change to devices.ts"],
  },
];

const risks = [
  {
    name: "iOS fetches splash online at install time",
    severity: "info" as const,
    mitigation: "Cache-Control: public, max-age=31536000, immutable set on every response",
  },
  {
    name: "Hardcoded primary color #10687E",
    severity: "info" as const,
    mitigation: "Necessary because Satori (next/og renderer) cannot read CSS variables",
  },
  {
    name: "Loose size parsing (extra path segments)",
    severity: "ok" as const,
    mitigation: "Accepted — worst case is a valid registered image returned; non-security",
  },
];

export default function Design() {
  return (
    <div>
      <p>
        The app root layout registered nine hand-exported{" "}
        <code>appleWebApp.startupImage</code> PNGs from April 2024 whose background
        no longer matched the current <code>--primary</code> token. Next.js 16 ships{" "}
        <code>next/og</code> (<code>ImageResponse</code>), so launch screens can be
        generated at request time — no new dependency, no stored assets.
      </p>

      <h2>Decisions</h2>
      <ApproachComparison approaches={decisions} />

      <h2>Risks</h2>
      <RiskTable risks={risks} />

      <h2>Implementation Contract</h2>
      <ul>
        <li>
          <strong>Route:</strong> <code>src/app/apple-splash/[size]/route.tsx</code>{" "}
          — returns an <code>ImageResponse</code> of exactly that width/height on
          success, 404 on unsupported size.
        </li>
        <li>
          <strong>Shared config:</strong> <code>src/app/apple-splash/devices.ts</code>{" "}
          exports 15 device entries and <code>isSupportedSize(w, h)</code>.
        </li>
        <li>
          <strong>Layout:</strong> <code>src/app/layout.tsx</code> builds{" "}
          <code>appleWebApp.startupImage</code> from the shared list; no static PNG
          URLs.
        </li>
      </ul>
    </div>
  );
}
