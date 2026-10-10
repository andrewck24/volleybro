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
      <h2 id="layers">A · Background layers</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <LayerStack scope="light" label="Light theme" />
        <LayerStack scope="dark" label="Dark theme" />
      </div>

      <h2 id="overlay-ring">B · Overlay edge comparison</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <OverlayDemo ring={false} caption="Overlay without decorative edge" />
        <OverlayDemo ring caption="Overlay with decorative edge" />
      </div>
    </div>
  );
}

export const toc = [
  { title: "A · Background layers", url: "#layers", depth: 2 },
  { title: "B · Overlay edge comparison", url: "#overlay-ring", depth: 2 },
];
