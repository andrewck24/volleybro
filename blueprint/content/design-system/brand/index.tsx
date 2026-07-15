// Brand assets, rendered with the real shared components from
// src/components/brand — the same code the app and the apple-splash route
// consume — on the shared tokens (light / dark / teal grounds).

import {
  LogoSymbol,
  LogoType,
  V_CORAL,
  V_IVORY,
} from "../../../../src/components/brand";

type Ground = {
  label: string;
  scope: string; // theme scope class from tokens.css
  bgClass: string;
  variant: "adaptive" | "brand";
};

const grounds: Ground[] = [
  {
    label: "Light",
    scope: "light",
    bgClass: "bg-background text-foreground",
    variant: "adaptive",
  },
  {
    label: "Dark",
    scope: "dark",
    bgClass: "bg-background text-foreground",
    variant: "adaptive",
  },
  {
    label: "Teal",
    scope: "light",
    bgClass: "bg-primary text-primary-foreground",
    variant: "brand",
  },
];

function Tile({
  ground,
  children,
}: {
  ground: Ground;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`${ground.scope} ${ground.bgClass} flex h-30 items-center justify-center rounded-lg border border-border p-6`}
      >
        {children}
      </div>
      <span className="text-xs text-muted-foreground">
        {ground.label} · {ground.variant}
      </span>
    </div>
  );
}

export default function BrandPage() {
  return (
    <div>
      <h1>Brand</h1>
      <p>
        Two marks share one identity. The <strong>logo-symbol</strong> is the
        standalone V; the <strong>logo-type</strong> is the full{" "}
        <em>VolleyBro</em> wordmark. Both are built from the same two arms: a{" "}
        <strong>neutral</strong> left arm and a fixed <strong>coral</strong>{" "}
        right arm (<code>{V_CORAL}</code>). The specimens below render the real{" "}
        <code>src/components/brand</code> components.
      </p>

      <h2>Adaptive coloring</h2>
      <p>
        The neutral parts (left arm, and the letters in the wordmark) use{" "}
        <code>currentColor</code>, so the mark inverts with its ground — black
        on light, near-white on dark — while the coral right arm stays fixed as
        the constant brand accent. On the teal brand ground the neutral parts
        switch to ivory (<code>{V_IVORY}</code>), the <code>brand</code>{" "}
        variant. This is what fixed the invisible-white-logo problem on light
        surfaces.
      </p>

      <h2>Logo-symbol</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {grounds.map((g) => (
          <Tile key={`symbol-${g.label}`} ground={g}>
            <LogoSymbol variant={g.variant} className="h-16" />
          </Tile>
        ))}
      </div>

      <h2>Logo-type</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {grounds.map((g) => (
          <Tile key={`type-${g.label}`} ground={g}>
            <LogoType variant={g.variant} className="h-10" />
          </Tile>
        ))}
      </div>

      <h2>Source</h2>
      <ul>
        <li>
          <code>src/components/brand/logo-symbol.tsx</code> — the V, with{" "}
          <code>adaptive</code> / <code>brand</code> variants; also the path
          source for the apple-splash route.
        </li>
        <li>
          <code>src/components/brand/logo-type.tsx</code> — the wordmark;
          rendered by <code>src/components/custom/logo.tsx</code>.
        </li>
        <li>
          <code>public/brand/logo-symbol.svg</code> /{" "}
          <code>public/brand/logo-type.svg</code> — layered SVGs (ivory + coral,
          transparent) for Icon Composer / maskable icons.
        </li>
      </ul>
    </div>
  );
}
