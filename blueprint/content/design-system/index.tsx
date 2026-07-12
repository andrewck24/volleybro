import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Section landing page for /design-system. Keep this as the overview entry and
// add cards below as future pages land (design tokens, color/typography scales).
export default function DesignSystemOverview() {
  return (
    <>
      <h1>VolleyBro Design System</h1>
      <p className="text-muted-foreground">
        The shared visual language and building blocks behind VolleyBro&apos;s
        blueprint docs. Every surface is driven by design tokens, so colors,
        spacing, and typography stay consistent across light and dark themes.
        Explore the sections below.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a
          href="/design-system/components"
          className="block text-inherit no-underline"
        >
          <Card className="h-full gap-2 border-l-4 border-l-primary py-4 transition-colors hover:bg-accent">
            <CardHeader>
              <CardTitle>Components</CardTitle>
              <CardDescription>
                The component library showcase — cards, tables, badges,
                flowcharts, and more, all composed on shadcn primitives.
              </CardDescription>
            </CardHeader>
          </Card>
        </a>
      </div>
    </>
  );
}
