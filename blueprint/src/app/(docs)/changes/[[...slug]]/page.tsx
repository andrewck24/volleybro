import { Suspense, type ComponentProps, type ComponentType } from "react";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { ChangeOverview } from "@/components/ChangeOverview";
import { ChangeCard } from "@/components/ChangeCard";
import { ChangesCatalog } from "@/components/ChangesCatalog";
import { ImplementationSlices } from "@/components/ImplementationSlices";
import { loadChangeCatalog, loadChangeMetadata } from "@/lib/change-catalog";
import { changeArtifacts } from "@/lib/change-artifacts";
import { loadImplementationPlan } from "@/lib/implementation-plan-loader";
import { createChangesBreadcrumbTree } from "@/lib/changes-tree";

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
  "archive/2026-08-16-game-positional-writes/design": () =>
    import("../../../../../content/changes/archive/2026-08-16-game-positional-writes/design"),
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

const mdxComponents = { ...defaultMdxComponents, ChangeCard };
const changesBreadcrumbTree = createChangesBreadcrumbTree(
  source.pageTree,
  source.getPages().map((page) => ({
    name: page.data.title ?? page.slugs.at(-1) ?? "Change page",
    url: page.url,
  })),
);

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

function ChangeDocsPage(props: ComponentProps<typeof DocsPage>) {
  return (
    <TreeContextProvider tree={changesBreadcrumbTree}>
      <DocsPage
        {...props}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      />
    </TreeContextProvider>
  );
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
      <ChangeDocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <Mdx components={mdxComponents} />
          <Suspense fallback={<p>Loading changes…</p>}>
            <ChangesCatalog changes={changes} />
          </Suspense>
        </DocsBody>
      </ChangeDocsPage>
    );
  }

  // Check TSX design modules first so they get breadcrumbs from the MDX stub
  const loader = designModules[key];
  if (loader) {
    const page = source.getPage(slug);
    const { default: Design, toc: designToc } = await loader();
    return (
      <ChangeDocsPage toc={designToc ?? page?.data.toc ?? []}>
        <DocsBody>
          <h1>{page?.data.title}</h1>
          <Design />
        </DocsBody>
      </ChangeDocsPage>
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
      <ChangeDocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <Mdx components={mdxComponents} />
          <ImplementationSlices slices={slices} />
        </DocsBody>
      </ChangeDocsPage>
    );
  }

  const page = source.getPage(slug);
  if (!page) notFound();

  const Mdx = page.data.body;

  // Change Overview pages take their metadata from change.json and their
  // artifact links from the page tree; the MDX below is narrative only.
  if (slug?.length === 2) {
    const change = await loadChangeMetadata(slug[0], slug[1]);
    if (change) {
      return (
        <ChangeDocsPage toc={page.data.toc}>
          <DocsBody>
            <h1>{page.data.title}</h1>
            <ChangeOverview
              date={change.startedAt}
              status={change.status}
              lifecycle={change.lifecycle}
              summary={change.summary}
              artifacts={changeArtifacts(changesBreadcrumbTree, page.url)}
            />
            <Mdx components={mdxComponents} />
          </DocsBody>
        </ChangeDocsPage>
      );
    }
  }

  return (
    <ChangeDocsPage toc={page.data.toc}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </ChangeDocsPage>
  );
}

export function generateStaticParams() {
  const mdxParams = source.generateParams();
  const designParams = Object.keys(designModules).map((key) => ({
    slug: key.split("/"),
  }));
  return [...mdxParams, ...designParams];
}
