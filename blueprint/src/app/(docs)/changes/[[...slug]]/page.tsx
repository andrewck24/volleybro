import Link from "next/link";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { listChanges } from "@/lib/changes-index";
import { proposalMockups } from "@/lib/proposal-mockups";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
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
  const loadMockup =
    slug.at(-1) === "proposal" ? proposalMockups[slug[0]] : undefined;
  if (!page && !loadMockup) notFound();

  const Mdx = page?.data.body;
  const Mockup = loadMockup ? (await loadMockup()).default : null;

  return (
    <DocsPage toc={page?.data.toc}>
      <DocsBody>
        <h1>{page?.data.title ?? slug[0]}</h1>
        {Mdx && <Mdx components={mdxComponents} />}
        {Mockup && <Mockup />}
      </DocsBody>
    </DocsPage>
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
