// Elevation & Depth reference — the three background layers and the
// overlay-replaces-ring rule, rendered live from the shared tokens via the
// .light/.dark scopes. The open Drawer-layer question and its interactive
// comparison live in the elevation-depth-system change's design page.

import Link from "next/link";

const layers = [
  {
    name: "Level 0 · Page",
    token: "--background",
    body: "The app body — the page plane only.",
  },
  {
    name: "Level 0.5 · Floating",
    token: "--popover",
    body: "Non-overlay floating surfaces (Popover, Select) that open over live content. The background step + shadow-md keeps them raised — no ring, no overlay.",
  },
  {
    name: "Level 1 · Card",
    token: "--card",
    body: "Cards and items — the topmost surface, raised by the background step and shadow (no ring). All modal-class surfaces (Dialog, AlertDialog, Drawer) share this color: the scrim, not a color step, separates them from the page.",
  },
];

// A nested page→floating→card stack pinned to one theme via scope class.
function LayerStack({
  scope,
  label,
}: {
  scope: "light" | "dark";
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div
        className={`${scope} rounded-xl border border-border bg-background p-4 text-foreground`}
      >
        <span className="text-[0.7rem] opacity-70">--background</span>
        <div className="mt-2 rounded-lg bg-popover p-3.5 shadow-md">
          <span className="text-[0.7rem] opacity-70">--popover</span>
          <div className="mt-2 rounded-md border border-border bg-card p-3">
            <span className="text-[0.7rem] opacity-70">--card</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// One overlay surface over a dimmed scrim, with or without a ring.
function OverlayDemo({ ring, caption }: { ring: boolean; caption: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="light relative h-32 overflow-hidden rounded-lg bg-background">
        <div className="absolute inset-0 bg-black/80" />
        <div
          className={`absolute right-3.5 bottom-3.5 left-3.5 rounded-lg bg-card p-3 text-xs text-foreground ${
            ring ? "border border-border" : ""
          }`}
        >
          overlay surface · bg-card{ring ? " · ring" : " · no ring"}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{caption}</span>
    </div>
  );
}

export default function ElevationDepthPage() {
  return (
    <div>
      <h1>Elevation &amp; Depth</h1>
      <p>
        Two rules govern depth. First, three distinct background layers ordered
        by elevation. Second — <strong>no container carries a ring</strong>:
        depth is signaled by scrim, background step, and shadow only.
      </p>

      <h2 id="layers">A · Background layers</h2>
      <p>
        Elevation reads as a lighter surface in light theme, inverted in dark.
        The same nested stack in both themes, rendered from the live tokens:
      </p>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <LayerStack scope="light" label="Light theme" />
        <LayerStack scope="dark" label="Dark theme" />
      </div>
      <ul>
        {layers.map((l) => (
          <li key={l.token}>
            <strong>{l.name}</strong> (<code>{l.token}</code>) — {l.body}
          </li>
        ))}
      </ul>

      <h2 id="overlay-ring">B · No container carries a ring</h2>
      <p>
        Modal, popover, and card components are all content containers, so the
        ring rule is uniform: none carries a decorative ring. Overlay-backed
        surfaces (Dialog, AlertDialog, Drawer) rely on their{" "}
        <code>bg-black/80</code> scrim; non-overlay floats (Popover, Select) on
        the background step + <code>shadow-md</code>; cards/items on the
        background step + shadow. <code>--ring</code> is reserved for
        focus-visible states. This makes the <code>entry-ui</code> observation
        (removing the ring looked better) a contract, so nothing silently
        re-adds one.
      </p>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <OverlayDemo
          ring={false}
          caption="✓ Overlay-backed: no ring (correct)"
        />
        <OverlayDemo
          ring
          caption="✗ Overlay-backed with ring: double-bordered"
        />
      </div>

      <h2 id="drawer-question">Decided · all modals on bg-card</h2>
      <p>
        Every modal-class surface (Dialog, AlertDialog, Drawer) renders on{" "}
        <code>bg-card</code> — the scrim separates it from the page, and the
        Drawer peek stays continuous with the page&apos;s card surfaces. The
        interactive comparison that settled this lives in the{" "}
        <Link href="/changes/elevation-depth-system/design">
          elevation-depth-system change&apos;s design page
        </Link>
        .
      </p>

      <h2 id="pwa-backdrop">C · PWA body backdrop</h2>
      <p>
        Standalone PWA routes may set{" "}
        <code>document.body.style.backgroundColor</code> from their route layout
        so translucent system chrome stays visually continuous with the adjacent
        app chrome. This is only a body backdrop: it does not create another
        layer and does not replace content tokens. Page content still uses{" "}
        <code>bg-background</code>, raised recording chrome can align the
        backdrop to <code>bg-card</code>, auth can align it to{" "}
        <code>bg-primary</code>, and <code>accent</code> remains reserved for
        hover/highlight states. Overlay scrims are separate: they cover the full
        web content viewport with <code>inset-0</code> and leave any
        iOS-reserved status-bar region to system composition. They do not mutate
        the route backdrop while opening. The PWA manifest{" "}
        <code>background_color</code> matches the light-mode{" "}
        <code>--background</code> value so the launch fallback does not add a
        separate near-white layer. It does not replace Apple&apos;s{" "}
        <code>apple-touch-startup-image</code> handling.
      </p>
    </div>
  );
}

export const toc = [
  { title: "A · Background layers", url: "#layers", depth: 2 },
  { title: "B · No container carries a ring", url: "#overlay-ring", depth: 2 },
  {
    title: "Decided · all modals on bg-card",
    url: "#drawer-question",
    depth: 2,
  },
  { title: "C · PWA body backdrop", url: "#pwa-backdrop", depth: 2 },
];
