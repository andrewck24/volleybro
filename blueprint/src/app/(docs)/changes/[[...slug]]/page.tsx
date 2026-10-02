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
import { ChangeTabs } from "@/components/ChangeTabs";
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
import { changeTabFiles } from "@/lib/change-tab-files";
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

function assertPage(page: SourcePage): asserts page is NonNullable<SourcePage> {
  if (!page) notFound();
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
  const Design = changeDesigns[slug];
  const components = {
    ...mdxComponents,
    DesignMockup: () => (Design ? <MockupFrame Mockup={Design} /> : null),
  };
  const facts = readFacts(slug);
  const { Proposal, reviews } = changeTabFiles(slug);
  const shardFacts = new Map(
    (facts.shards?.items ?? []).map((item) => [item.shard, item]),
  );
  return (
    <TreeContextProvider tree={createChangesBreadcrumbTree(changesTree())}>
      {/* One TOC cannot follow two tabs, and only the open tab is rendered. */}
      <DocsPage
        tableOfContent={{ enabled: false }}
        breadcrumb={{ includeRoot: { url: "/changes" }, includePage: true }}
      >
        <DocsBody>
          <ChangeHeader
            title={page.data.title}
            capabilities={readCapabilities(slug)}
            facts={facts}
          />
          <ChangeTabs
            Proposal={Proposal}
            reviews={reviews.map((review) => ({
              ...review,
              facts:
                review.shard === undefined
                  ? undefined
                  : shardFacts.get(review.shard),
            }))}
            components={components}
          />
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
