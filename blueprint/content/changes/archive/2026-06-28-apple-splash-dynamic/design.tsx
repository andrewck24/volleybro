"use client";
import { ApproachComparison } from "@/components/ApproachComparison";
import { RiskTable } from "@/components/RiskTable";

const V_LEFT =
  "M107.01 581.12L102.40 566.27Q95.74 545.79 90.62 526.34L90.62 526.34L74.24 470.02Q66.05 442.37 61.44 428.54L61.44 428.54Q57.34 413.18 54.78 405.50L54.78 405.50L2.56 228.86L107.01 228.86L202.75 581.12L107.01 581.12Z";
const V_RIGHT =
  "M225.28 581.12L182.78 424.96L234.50 228.86L336.90 228.86L284.67 405.50L265.73 470.02Q256.51 499.71 248.83 526.34L248.83 526.34Q243.71 545.79 237.06 566.27L237.06 566.27L232.45 581.12L225.28 581.12Z";

const SIZES = [
  { label: "28% (current)", px: 50, selected: false },
  { label: "25% ✓ selected", px: 45, selected: true },
  { label: "20%", px: 36, selected: false },
  { label: "15%", px: 27, selected: false },
];

function PhoneFrame({
  sizePx,
  label,
  selected,
}: {
  sizePx: number;
  label: string;
  selected: boolean;
}) {
  return (
    <div className="shrink-0 text-center">
      <div
        className={`mx-auto flex h-65 w-30 items-center justify-center overflow-hidden rounded-[20px] border-[5px] border-black bg-[#10687E] ${selected ? "ring-2 ring-[#2f9e44]" : ""}`}
      >
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="-10 225 360 360"
          className="block"
        >
          <path d={V_LEFT} fill="#F6F4F5" />
          <path d={V_RIGHT} fill="#FC7A56" />
        </svg>
      </div>
      <div
        className={`mt-1.5 text-[11px] ${selected ? "text-[#2f9e44]" : "text-[#9aa0ad]"}`}
      >
        {label}
      </div>
    </div>
  );
}

const decisions = [
  {
    name: "D1: Runtime generation via next/og ImageResponse",
    pros: [
      "No new dependency — next/og is bundled with Next.js 16",
      "No build step or stored binaries",
      "Splash always tracks the current --primary token",
    ],
    cons: [
      "iOS fetches at install time (online), so runtime latency is acceptable",
    ],
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
    mitigation:
      "Cache-Control: public, max-age=31536000, immutable set on every response",
  },
  {
    name: "Hardcoded primary color #10687E",
    severity: "info" as const,
    mitigation:
      "Necessary because Satori (next/og renderer) cannot read CSS variables",
  },
  {
    name: "Loose size parsing (extra path segments)",
    severity: "ok" as const,
    mitigation:
      "Accepted — worst case is a valid registered image returned; non-security",
  },
];

export const toc = [
  { title: "Approved Mockup", url: "#approved-mockup", depth: 2 },
  { title: "Decisions", url: "#decisions", depth: 2 },
  { title: "Risks", url: "#risks", depth: 2 },
  {
    title: "Implementation Contract",
    url: "#implementation-contract",
    depth: 2,
  },
];

export default function Design() {
  return (
    <div>
      <p>
        The app root layout registered nine hand-exported{" "}
        <code>appleWebApp.startupImage</code> PNGs from April 2024 whose
        background no longer matched the current <code>--primary</code> token.
        Next.js 16 ships <code>next/og</code> (<code>ImageResponse</code>), so
        launch screens can be generated at request time — no new dependency, no
        stored assets.
      </p>

      <h2 id="approved-mockup">Approved Mockup — Bare V on --primary</h2>
      <p>
        Approved draft: <strong>bareV</strong>. The `V` glyph path data is
        extracted from Saira Stencil One at 512 px scale via opentype.js. The
        stencil design naturally produces two separate sub-paths (left arm /
        right arm), coloured independently. No font loading at runtime.
      </p>
      <div className="my-4 flex flex-wrap gap-4">
        {SIZES.map((s) => (
          <PhoneFrame
            key={s.label}
            sizePx={s.px}
            label={s.label}
            selected={s.selected}
          />
        ))}
      </div>
      {/* div/span instead of dl/dt/dd to avoid prose margin-inline-start interference */}
      <div className="mb-6 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <span className="self-center text-[#9aa0ad]">Background</span>
        <span className="flex items-center gap-1.5 self-center font-mono">
          <span className="inline-block size-2.75 rounded-[3px] bg-[#10687E]" />
          --primary #10687E
        </span>
        <span className="self-center text-[#9aa0ad]">Left arm</span>
        <span className="flex items-center gap-1.5 self-center font-mono">
          <span className="inline-block size-2.75 rounded-[3px] border border-[#ccc] bg-[#F6F4F5]" />
          #F6F4F5
        </span>
        <span className="self-center text-[#9aa0ad]">Right arm</span>
        <span className="flex items-center gap-1.5 self-center font-mono">
          <span className="inline-block size-2.75 rounded-[3px] bg-[#FC7A56]" />
          #FC7A56 (--destructive)
        </span>
        <span className="self-center text-[#9aa0ad]">viewBox</span>
        <span className="self-center font-mono">-10 225 360 360</span>
      </div>

      <h2 id="decisions">Decisions</h2>
      <ApproachComparison approaches={decisions} />

      <h2 id="risks">Risks</h2>
      <RiskTable risks={risks} />

      <h2 id="implementation-contract">Implementation Contract</h2>
      <ul>
        <li>
          <strong>Route:</strong>{" "}
          <code>src/app/apple-splash/[size]/route.tsx</code> — returns an{" "}
          <code>ImageResponse</code> of exactly that width/height on success,
          404 on unsupported size.
        </li>
        <li>
          <strong>Shared config:</strong>{" "}
          <code>src/app/apple-splash/devices.ts</code> exports 15 device entries
          and <code>isSupportedSize(w, h)</code>.
        </li>
        <li>
          <strong>Layout:</strong> <code>src/app/layout.tsx</code> builds{" "}
          <code>appleWebApp.startupImage</code> from the shared list; no static
          PNG URLs.
        </li>
      </ul>
    </div>
  );
}
