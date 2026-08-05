import { Suspense, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ChangeOverview } from "@/components/ChangeOverview";
import { ChangeCard } from "@/components/ChangeCard";
import { ChangesCatalog } from "@/components/ChangesCatalog";
import { ImplementationSlices } from "@/components/ImplementationSlices";
import { loadChangeCatalog } from "@/lib/change-catalog";
import { loadImplementationPlan } from "@/lib/implementation-plan-loader";

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
  "archive/2026-07-18-logo-v-splash-redesign/design": () =>
    import("../../../../../content/changes/archive/2026-07-18-logo-v-splash-redesign/design"),
  "discussing/sync-recording/design": () =>
    import("../../../../../content/changes/discussing/sync-recording/design"),
  "archive/2026-07-16-elevation-depth-system/design": () =>
    import("../../../../../content/changes/archive/2026-07-16-elevation-depth-system/design"),
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

  if (key === "") {
    const page = source.getPage(slug);
    if (!page) notFound();
    const Mdx = page.data.body;
    const changes = await loadChangeCatalog();
    return (
      <DocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <Mdx components={mdxComponents} />
          <Suspense fallback={<p>Loading changes…</p>}>
            <ChangesCatalog changes={changes} />
          </Suspense>
        </DocsBody>
      </DocsPage>
    );
  }

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

  if (
    slug?.length === 3 &&
    (slug[0] === "in-progress" || slug[0] === "archive") &&
    slug[2] === "implementation"
  ) {
    const page = source.getPage(slug);
    if (!page) notFound();
    const Mdx = page.data.body;
    const slices = await loadImplementationPlan(slug[0], slug[1]);
    return (
      <DocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <Mdx components={mdxComponents} />
          <ImplementationSlices slices={slices} />
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
