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
  "logo-v-splash-redesign/design": () =>
    import("../../../../../content/changes/logo-v-splash-redesign/design"),
  "sync-recording/design": () =>
    import("../../../../../content/changes/sync-recording/design"),
  "game-positional-writes/design": () =>
    import("../../../../../content/changes/game-positional-writes/design"),
  "elevation-depth-system/design": () =>
    import("../../../../../content/changes/elevation-depth-system/design"),
  "entry-ui/design": () =>
    import("../../../../../content/changes/entry-ui/design"),
  "apple-splash-dynamic/design": () =>
    import("../../../../../content/changes/apple-splash-dynamic/design"),
  "contextual-edit-pages/design": () =>
    import("../../../../../content/changes/contextual-edit-pages/design"),
  "api-objectid-guards/design": () =>
    import("../../../../../content/changes/api-objectid-guards/design"),
  "team-routes-clean-architecture/design": () =>
    import("../../../../../content/changes/team-routes-clean-architecture/design"),
};

const mdxComponents = { ...defaultMdxComponents, ChangeCard };
const changesBreadcrumbTree = createChangesBreadcrumbTree(source.pageTree);

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

  if (slug?.length === 2 && slug[1] === "implementation") {
    const page = source.getPage(slug);
    if (!page) notFound();
    const Mdx = page.data.body;
    const slices = await loadImplementationPlan(slug[0]);
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
  // artifact links from the page tree; the MDX below is narrative only. The
  // change's summary is the catalog card's text and stays there -- repeating
  // it above the MDX gave every Overview two openings saying the same thing.
  if (slug?.length === 1) {
    const change = await loadChangeMetadata(slug[0]);
    return (
      <ChangeDocsPage toc={page.data.toc}>
        <DocsBody>
          <h1>{page.data.title}</h1>
          <ChangeOverview
            date={change.startedAt}
            lifecycle={change.lifecycle}
            artifacts={changeArtifacts(source.pageTree, page.url)}
          />
          <Mdx components={mdxComponents} />
        </DocsBody>
      </ChangeDocsPage>
    );
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
