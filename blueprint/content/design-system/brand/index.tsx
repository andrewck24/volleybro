import { LogoSymbol, LogoType } from "@/components/brand";

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
      <h2 id="logo-symbol">Logo-symbol</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
        {grounds.map((g) => (
          <Tile key={`symbol-${g.label}`} ground={g}>
            <LogoSymbol variant={g.variant} className="h-16" />
          </Tile>
        ))}
      </div>

      <h2 id="logo-type">Logo-type</h2>
      <div className="my-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {grounds.map((g) => (
          <Tile key={`type-${g.label}`} ground={g}>
            <LogoType variant={g.variant} className="h-10" />
          </Tile>
        ))}
      </div>
    </div>
  );
}

export const toc = [
  { title: "Logo-symbol", url: "#logo-symbol", depth: 2 },
  { title: "Logo-type", url: "#logo-type", depth: 2 },
];
