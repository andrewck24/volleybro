import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { listChanges } from "@/lib/changes-index";
import { singlePageDesigns } from "@/lib/change-designs";
import { createChangesBreadcrumbTree } from "@/lib/changes-tree";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { TLDR } from "@/components/TLDR";
import { Scenario } from "@/components/Scenario";
import { RiskTable } from "@/components/RiskTable";
import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import { FileTour } from "@/components/FileTour";
import { ChangeCardList } from "@/components/ChangeCard";
import { ChangeHeader } from "@/components/ChangeHeader";
import { ChangeTabs, Proposal, Review } from "@/components/ChangeTabs";
import { DecisionCards } from "@/components/DecisionCards";
import {
  ActionItems,
  AfterRelease,
  Deviations,
  ReviewDetails,
  ReviewFocus,
} from "@/components/ReviewSections";
import {
  ScenarioResults,
  Scenarios,
  TestPlan,
} from "@/components/ScenarioCards";
import { DecisionTimeline } from "@/components/DecisionTimeline";
import {
  isSinglePageChange,
  readCapabilities,
  readFacts,
} from "@/lib/change-meta";
import { decisionsById } from "@/lib/decisions-index";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { MockupFrame } from "@/components/MockupFrame";
import { isLegacySlug, loadChangeMetadata } from "@/legacy/change-catalog";
import { changeArtifacts } from "@/legacy/change-artifacts";
import { loadImplementationPlan } from "@/legacy/implementation-plan-loader";
import { ChangeOverview } from "@/legacy/ChangeOverview";
import { ImplementationSlices } from "@/legacy/ImplementationSlices";
import { designMockups } from "@/legacy/design-mockups";
import { LegacyDecisionsProvider } from "@/legacy/legacy-decisions-context";

// A superseded card links to its replacement: on this page when the page
// cites it too, otherwise on the Feature page of its first capability.
function ChangeDecisionCards({ ids }: { ids: string[] }) {
  const onPage = new Set(ids);
  const cards = decisionsById(ids).map((record) => {
    const replacement = record.supersededBy;
    if (!replacement) return { record };
    if (onPage.has(replacement)) {
      return { record, supersededHref: `#adr-${replacement}` };
    }
    const [capability] = decisionsById([replacement])[0]?.capabilities ?? [];
    return {
      record,
      supersededHref: capability
        ? `/features/${capability}#adr-${replacement}`
        : undefined,
    };
  });
  return <DecisionCards cards={cards} />;
}

const mdxComponents = {
  ...defaultMdxComponents,
  TLDR,
  Scenario,
  RiskTable,
  AnnotatedDiff,
  FileTour,
  DecisionTimeline,
  DecisionCards: ChangeDecisionCards,
  ChangeTabs,
  Proposal,
  Review,
  Scenarios,
  ScenarioResults,
  TestPlan,
  ActionItems,
  ReviewFocus,
  Deviations,
  AfterRelease,
  ReviewDetails,
  InteractiveFlowchart,
};

const changesBreadcrumbTree = createChangesBreadcrumbTree(source.pageTree);

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

type SourcePage = ReturnType<typeof source.getPage>;

// Shared by every branch below that renders a page's MDX body directly:
// 404s when the page is missing. An assertion function rather than one
// that returns the body itself, so `Mdx` stays a plain `page.data.body`
// property read at each call site — react-hooks/static-components flags a
// component read through an extra function call as "created during
// render", even though this one is as stable as the property it wraps.
function assertPage(page: SourcePage): asserts page is NonNullable<SourcePage> {
  if (!page) notFound();
}

// A Change page's body is MDX pulled from the shared `blueprint-changes` store
// branch, published at its own gate — so it can reference a record, prop or
// schema this checkout does not have. A React error boundary does not catch
// that: under `output: "export"` the export worker treats any throw as fatal to
// the route, and `getDerivedStateFromError` never runs. Calling the compiled
// body as a function puts its render on this call stack, where a try/catch can
// reach it.
function renderChangeBody(
  Mdx: NonNullable<NonNullable<SourcePage>["data"]["body"]>,
  title: string,
  components: typeof mdxComponents = mdxComponents,
) {
  try {
    return Mdx({ components });
  } catch (error) {
    console.error(`Change page "${title}" failed to render:`, error);
    return (
      <p className="text-sm text-destructive">
        此頁面（{title}）在此 checkout 中無法顯示：
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }
}

function ChangesIndex() {
  const changes = listChanges();
  return (
    <DocsPage>
      <DocsBody>
        <h1>Changes</h1>
        {changes.length === 0 ? (
          <p>
            No Change pages right now — none are published or pulled yet. Run{" "}
            <code>pnpm blueprint:changes:pull</code>.
          </p>
        ) : (
          <ChangeCardList changes={changes} />
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
    assertPage(page);
    const Mdx = page.data.body;
    const change = await loadChangeMetadata(slug[0]);
    return (
      <LegacyShell page={page}>
        <ChangeOverview
          date={change.startedAt}
          lifecycle={change.lifecycle}
          artifacts={changeArtifacts(source.pageTree, page.url)}
        />
        {renderChangeBody(Mdx, page.data.title)}
      </LegacyShell>
    );
  }

  if (slug.length === 2 && slug[1] === "implementation") {
    assertPage(page);
    const Mdx = page.data.body;
    const slices = await loadImplementationPlan(slug[0]);
    return (
      <LegacyShell page={page}>
        {renderChangeBody(Mdx, page.data.title)}
        <ImplementationSlices slices={slices} />
      </LegacyShell>
    );
  }

  if (slug.length === 2 && slug[1] === "design") {
    const mockup = designMockups[slug[0]];
    if (!page && !mockup) notFound();
    if (mockup) {
      // Isolated by MockupFrame rather than renderChangeBody: a mockup is
      // pulled from the store branch like any other Change page and carries
      // the same staleness, but every one of them holds hooks, so it cannot
      // be called as a plain function.
      const { default: Design, toc } = mockup;
      return (
        <LegacyShell
          page={page}
          toc={toc ?? page?.data.toc ?? []}
          title={page?.data.title ?? "Design"}
        >
          <MockupFrame Mockup={Design} />
        </LegacyShell>
      );
    }
    assertPage(page);
    const Mdx = page.data.body;
    return (
      <LegacyShell page={page}>
        {renderChangeBody(Mdx, page.data.title)}
      </LegacyShell>
    );
  }

  // review.mdx, tasks.mdx, specs/**, and anything else render as plain MDX.
  assertPage(page);
  const Mdx = page.data.body;
  return (
    <LegacyShell page={page}>
      {renderChangeBody(Mdx, page.data.title)}
    </LegacyShell>
  );
}

function LegacyShell({
  page,
  toc = page?.data.toc,
  title = page?.data.title,
  children,
}: {
  page: SourcePage;
  toc?: React.ComponentProps<typeof DocsPage>["toc"];
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TreeContextProvider tree={changesBreadcrumbTree}>
      <DocsPage
        toc={toc}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      >
        <DocsBody>
          <h1>{title}</h1>
          <LegacyDecisionsProvider>{children}</LegacyDecisionsProvider>
        </DocsBody>
      </DocsPage>
    </TreeContextProvider>
  );
}

function SinglePageChange({ slug }: { slug: string }) {
  const page = source.getPage([slug]);
  assertPage(page);
  const Mdx = page.data.body;
  const Design = singlePageDesigns[slug];
  const components = {
    ...mdxComponents,
    DesignMockup: () => (Design ? <MockupFrame Mockup={Design} /> : null),
  };
  return (
    <TreeContextProvider tree={changesBreadcrumbTree}>
      <DocsPage
        toc={page.data.toc}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      >
        <DocsBody>
          <ChangeHeader
            title={page.data.title}
            capabilities={readCapabilities(slug)}
            facts={readFacts(slug)}
          />
          {renderChangeBody(Mdx, page.data.title, components)}
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

  if (slug.length === 1 && isSinglePageChange(slug[0])) {
    return <SinglePageChange slug={slug[0]} />;
  }

  notFound();
}

export function generateStaticParams() {
  // The index route has no content page of its own (it is a plain generated
  // list), so it needs an explicit empty-slug entry for static export.
  return [{ slug: [] }, ...source.generateParams()];
}
