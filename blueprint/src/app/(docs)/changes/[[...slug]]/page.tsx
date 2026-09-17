import Link from "next/link";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { listChanges } from "@/lib/changes-index";
import { proposalMockups } from "@/lib/proposal-mockups";
import { createChangesBreadcrumbTree } from "@/lib/changes-tree";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { TLDR } from "@/components/TLDR";
import { Scenario } from "@/components/Scenario";
import { RiskTable } from "@/components/RiskTable";
import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import { FileTour } from "@/components/FileTour";
import { DecisionTimeline } from "@/components/DecisionTimeline";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";

const mdxComponents = {
  ...defaultMdxComponents,
  TLDR,
  Scenario,
  RiskTable,
  AnnotatedDiff,
  FileTour,
  DecisionTimeline,
  InteractiveFlowchart,
};

const changesBreadcrumbTree = createChangesBreadcrumbTree(source.pageTree);

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

function ChangesIndex() {
  const changes = listChanges();
  return (
    <DocsPage>
      <DocsBody>
        <h1>Changes</h1>
        {changes.length === 0 ? (
          <p>
            No Change pages right now — they are generated locally per gate and
            are not committed.
          </p>
        ) : (
          <ul>
            {changes.map((change) => (
              <li key={change.slug}>
                <Link href={change.href}>{change.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </DocsBody>
    </DocsPage>
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    return <ChangesIndex />;
  }

  const page = source.getPage(slug);
  const Mockup =
    slug.at(-1) === "proposal" ? proposalMockups[slug[0]] : undefined;
  if (!page && !Mockup) notFound();

  const Mdx = page?.data.body;

  return (
    <TreeContextProvider tree={changesBreadcrumbTree}>
      <DocsPage
        toc={page?.data.toc}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      >
        <DocsBody>
          <h1>{page?.data.title ?? slug[0]}</h1>
          {Mdx && <Mdx components={mdxComponents} />}
          {Mockup && <Mockup />}
        </DocsBody>
      </DocsPage>
    </TreeContextProvider>
  );
}

export function generateStaticParams() {
  const mdxParams = source.generateParams();
  const mdxSlugs = new Set(mdxParams.map((p) => p.slug.join("/")));

  // A proposal.tsx with no sibling proposal.mdx still needs its own static
  // route under `output: export`.
  const mockupOnlyParams = Object.keys(proposalMockups)
    .map((slug) => ({ slug: [slug, "proposal"] }))
    .filter((p) => !mdxSlugs.has(p.slug.join("/")));

  // The index route has no content page of its own (it is a plain generated
  // list), so it needs an explicit empty-slug entry for static export.
  return [{ slug: [] }, ...mdxParams, ...mockupOnlyParams];
}
