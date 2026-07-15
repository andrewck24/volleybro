import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ChangeOverview } from "@/components/ChangeOverview";
import { ChangeCard } from "@/components/ChangeCard";

interface TocItem {
  title: string;
  url: string;
  depth: number;
}

interface DesignModule {
  default: ComponentType;
  toc?: TocItem[];
}

const designModules: Record<string, () => Promise<DesignModule>> = {
  "in-progress/elevation-depth-system/design": () =>
    import("../../../../../content/changes/in-progress/elevation-depth-system/design"),
  "discussing/sync-recording/design": () =>
    import("../../../../../content/changes/discussing/sync-recording/design"),
  "archive/2026-07-12-entry-ui/design": () =>
    import("../../../../../content/changes/archive/2026-07-12-entry-ui/design"),
  "archive/2026-06-28-apple-splash-dynamic/design": () =>
    import("../../../../../content/changes/archive/2026-06-28-apple-splash-dynamic/design"),
  "archive/2026-06-16-contextual-edit-pages/design": () =>
    import("../../../../../content/changes/archive/2026-06-16-contextual-edit-pages/design"),
  "archive/2026-06-16-api-objectid-guards/design": () =>
    import("../../../../../content/changes/archive/2026-06-16-api-objectid-guards/design"),
  "archive/2026-06-16-team-routes-clean-architecture/design": () =>
    import("../../../../../content/changes/archive/2026-06-16-team-routes-clean-architecture/design"),
};

const mdxComponents = { ...defaultMdxComponents, ChangeOverview, ChangeCard };

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const key = slug?.join("/") ?? "";

  // Check TSX design modules first so they get breadcrumbs from the MDX stub
  const loader = designModules[key];
  if (loader) {
    const page = source.getPage(slug);
    const { default: Design, toc: designToc } = await loader();
    return (
      <DocsPage toc={designToc ?? page?.data.toc ?? []}>
        <DocsBody>
          <h1>{page?.data.title}</h1>
          <Design />
        </DocsBody>
      </DocsPage>
    );
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  const Mdx = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  const mdxParams = source.generateParams();
  const designParams = Object.keys(designModules).map((key) => ({
    slug: key.split("/"),
  }));
  return [...mdxParams, ...designParams];
}
