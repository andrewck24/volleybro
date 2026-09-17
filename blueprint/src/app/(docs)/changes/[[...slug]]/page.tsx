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
import { isLegacySlug, loadChangeMetadata } from "@/legacy/change-catalog";
import { changeArtifacts } from "@/legacy/change-artifacts";
import { loadImplementationPlan } from "@/legacy/implementation-plan-loader";
import { ChangeOverview } from "@/legacy/ChangeOverview";
import { ImplementationSlices } from "@/legacy/ImplementationSlices";
import { designMockups } from "@/legacy/design-mockups";
import { LegacyDecisionsProvider } from "@/legacy/legacy-decisions-context";

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

type SourcePage = ReturnType<typeof source.getPage>;

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

// Old-format Change pages (a directory with change.json) route through here
// instead of the two-gate proposal/delivery shell below. Every legacy page is
// wrapped in LegacyDecisionsProvider so a DecisionTimeline it renders (direct
// MDX import or design.tsx import, both bypass mdxComponents) tolerates the
// old decision records' `status` field.
async function LegacyPage({ slug }: { slug: string[] }) {
  const page = source.getPage(slug);

  if (slug.length === 1) {
    if (!page) notFound();
    const Mdx = page.data.body;
    const change = await loadChangeMetadata(slug[0]);
    return (
      <LegacyShell page={page}>
        <ChangeOverview
          date={change.startedAt}
          lifecycle={change.lifecycle}
          artifacts={changeArtifacts(source.pageTree, page.url)}
        />
        <Mdx components={mdxComponents} />
      </LegacyShell>
    );
  }

  if (slug.length === 2 && slug[1] === "implementation") {
    if (!page) notFound();
    const Mdx = page.data.body;
    const slices = await loadImplementationPlan(slug[0]);
    return (
      <LegacyShell page={page}>
        <Mdx components={mdxComponents} />
        <ImplementationSlices slices={slices} />
      </LegacyShell>
    );
  }

  if (slug.length === 2 && slug[1] === "design") {
    const mockup = designMockups[slug[0]];
    if (!page && !mockup) notFound();
    if (mockup) {
      const { default: Design, toc } = mockup;
      return (
        <TreeContextProvider tree={changesBreadcrumbTree}>
          <DocsPage
            toc={toc ?? page?.data.toc ?? []}
            breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
          >
            <DocsBody>
              <h1>{page?.data.title ?? "Design"}</h1>
              <LegacyDecisionsProvider>
                <Design />
              </LegacyDecisionsProvider>
            </DocsBody>
          </DocsPage>
        </TreeContextProvider>
      );
    }
    const Mdx = page!.data.body;
    return (
      <LegacyShell page={page}>
        <Mdx components={mdxComponents} />
      </LegacyShell>
    );
  }

  // review.mdx, tasks.mdx, specs/**, and anything else render as plain MDX.
  if (!page) notFound();
  const Mdx = page.data.body;
  return (
    <LegacyShell page={page}>
      <Mdx components={mdxComponents} />
    </LegacyShell>
  );
}

function LegacyShell({
  page,
  children,
}: {
  page: SourcePage;
  children: React.ReactNode;
}) {
  return (
    <TreeContextProvider tree={changesBreadcrumbTree}>
      <DocsPage
        toc={page?.data.toc}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      >
        <DocsBody>
          <h1>{page?.data.title}</h1>
          <LegacyDecisionsProvider>{children}</LegacyDecisionsProvider>
        </DocsBody>
      </DocsPage>
    </TreeContextProvider>
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    return <ChangesIndex />;
  }

  if (isLegacySlug(slug[0])) {
    return <LegacyPage slug={slug} />;
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
