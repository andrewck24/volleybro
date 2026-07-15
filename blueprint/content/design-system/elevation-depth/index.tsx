// Elevation & Depth reference — the three background layers and the
// overlay-replaces-ring rule, rendered live from the shared tokens via the
// .light/.dark scopes. The open Drawer-layer question and its interactive
// comparison live in the elevation-depth-system change's design page.

const layers = [
  {
    name: "Level 0 · Page",
    token: "--background",
    body: "The app body. Overlay-backed modals (Dialog, AlertDialog, Drawer) also sit here — their dimming overlay, not a lighter surface, separates them from the page.",
  },
  {
    name: "Level 0.5 · Floating",
    token: "--popover",
    body: "Non-overlay floating surfaces (Popover, Select) that open over live content. A distinct value + shadow-md keeps them raised with no overlay to help.",
  },
  {
    name: "Level 1 · Card",
    token: "--card",
    body: "Cards and items — the topmost surface, sitting on any layer beneath with ring + shadow.",
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
          className={`absolute right-3.5 bottom-3.5 left-3.5 rounded-lg bg-background p-3 text-xs text-foreground ${
            ring ? "border border-border" : ""
          }`}
        >
          overlay surface · bg-background{ring ? " · ring" : " · no ring"}
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
        by elevation. Second — <strong>overlay replaces ring</strong>: a surface
        signals its depth with a dimming overlay <em>or</em> a ring, never both.
      </p>

      <h2>A · Background layers</h2>
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

      <h2>B · Overlay replaces ring</h2>
      <p>
        Overlay-backed surfaces (Dialog, AlertDialog, Drawer — anything with a{" "}
        <code>bg-black/80</code> scrim) drop the ring; the scrim is the depth
        cue. Non-overlay floats (Popover, Select) keep <code>ring</code> +{" "}
        <code>shadow-md</code>, since with no scrim the ring is their only edge.
        This makes the <code>entry-ui</code> observation (removing the ring
        looked better) a contract, so nothing silently re-adds one.
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

      <h2>Open question · Drawer layer</h2>
      <p>
        The vaul Drawer currently sits on <code>bg-card</code>, but the overlay
        rule says overlay-backed → layer 0 (<code>bg-background</code>). The
        interactive, real-screen comparison that decides this lives in the{" "}
        <a href="/changes/in-progress/elevation-depth-system/design">
          elevation-depth-system change&apos;s design page
        </a>
        .
      </p>
    </div>
  );
}
