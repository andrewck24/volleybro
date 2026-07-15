import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Section landing page for /design-system. The rendered source of truth for
// VolleyBro's visual language — supersedes the prose in docs/design-system.md.
const sections = [
  {
    href: "/design-system/brand",
    title: "Brand",
    body: "The V logo-symbol and VolleyBro logo-type, their adaptive coloring, and safe grounds (light / dark / teal).",
  },
  {
    href: "/design-system/color",
    title: "Color",
    body: "Surface, brand, feedback, and chart tokens with light and dark values, including the three-layer elevation model.",
  },
  {
    href: "/design-system/typography",
    title: "Typography",
    body: "Type roles named by application context (score, heading, entry, label, meta), each with its Tailwind class and font.",
  },
  {
    href: "/design-system/spacing",
    title: "Spacing",
    body: "The Tailwind v4 0.25rem scale, pure-number utilities, and the notable app-specific spacings.",
  },
  {
    href: "/design-system/radius",
    title: "Radius",
    body: "One --radius base token with sm/md/lg/xl derived steps.",
  },
  {
    href: "/design-system/elevation-depth",
    title: "Elevation & Depth",
    body: "The three background layers and the overlay-replaces-ring rule, with a live Dialog / AlertDialog / Drawer variant comparison.",
  },
  {
    href: "/design-system/components",
    title: "Components",
    body: "The blueprint component library showcase — cards, tables, badges, flowcharts, and more.",
  },
];

export default function DesignSystemOverview() {
  return (
    <>
      <h1>VolleyBro Design System</h1>
      <p className="text-muted-foreground">
        The shared visual language and building blocks behind VolleyBro. Every
        surface is driven by design tokens, so colors, spacing, and typography
        stay consistent across light and dark themes. This section renders the
        real app tokens and rules — it is the source of truth that supersedes
        the prose in <code>docs/design-system.md</code>.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="block text-inherit no-underline"
          >
            <Card className="h-full gap-2 border-l-4 border-l-primary py-4 transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.body}</CardDescription>
              </CardHeader>
            </Card>
          </a>
        ))}
      </div>
    </>
  );
}
