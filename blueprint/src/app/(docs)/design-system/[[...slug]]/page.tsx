import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

// ponytail: static list for now; expand to dynamic discovery when the section grows
const designSystemModules: Record<
  string,
  () => Promise<{ default: ComponentType }>
> = {
  "": () => import("../../../../../content/design-system/index"),
  brand: () => import("../../../../../content/design-system/brand/index"),
  color: () => import("../../../../../content/design-system/color/index"),
  typography: () =>
    import("../../../../../content/design-system/typography/index"),
  spacing: () => import("../../../../../content/design-system/spacing/index"),
  radius: () => import("../../../../../content/design-system/radius/index"),
  "elevation-depth": () =>
    import("../../../../../content/design-system/elevation-depth/index"),
  components: () =>
    import("../../../../../content/design-system/components/index"),
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const key = slug?.join("/") ?? "";
  const loader = designSystemModules[key];
  if (!loader) notFound();

  const { default: Showcase } = await loader();
  return (
    <DocsPage>
      <DocsBody>
        <Showcase />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(designSystemModules).map((key) => ({
    slug: key ? key.split("/") : [],
  }));
}
