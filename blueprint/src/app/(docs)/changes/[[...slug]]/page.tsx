import Link from "next/link";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { listChanges } from "@/lib/changes-index";
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
  // The index route has no content page of its own (it is a plain generated
  // list), so it needs an explicit empty-slug entry for static export.
  return [{ slug: [] }, ...source.generateParams()];
}
