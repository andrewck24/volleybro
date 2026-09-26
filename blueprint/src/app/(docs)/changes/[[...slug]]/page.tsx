import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { changesTree, listChanges } from "@/lib/changes-index";
import { changeDesigns } from "@/lib/change-designs";
import { createChangesBreadcrumbTree } from "@/lib/changes-tree";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { TLDR } from "@/components/TLDR";
import { Scenario } from "@/components/Scenario";
import { RiskTable } from "@/components/RiskTable";
import { AnnotatedDiff } from "@/components/AnnotatedDiff";
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
import { hasChangePage, readCapabilities, readFacts } from "@/lib/change-meta";
import { decisionsById } from "@/lib/decisions-index";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { MockupFrame } from "@/components/MockupFrame";

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

function ChangePage({ slug }: { slug: string }) {
  const page = source.getPage([slug]);
  assertPage(page);
  const Mdx = page.data.body;
  const Design = changeDesigns[slug];
  const components = {
    ...mdxComponents,
    DesignMockup: () => (Design ? <MockupFrame Mockup={Design} /> : null),
  };
  return (
    <TreeContextProvider tree={createChangesBreadcrumbTree(changesTree())}>
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

  if (slug.length === 1 && hasChangePage(slug[0])) {
    return <ChangePage slug={slug[0]} />;
  }

  notFound();
}

export function generateStaticParams() {
  // The index route has no content page of its own (it is a plain generated
  // list), so it needs an explicit empty-slug entry for static export.
  return [{ slug: [] }, ...source.generateParams()];
}
