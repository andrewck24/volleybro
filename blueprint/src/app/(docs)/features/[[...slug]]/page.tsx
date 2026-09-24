import { notFound } from "next/navigation";
import { featuresSource } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { DecisionTimeline } from "@/components/DecisionTimeline";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { StatusBadge } from "@/components/StatusBadge";
import { decisionsFor } from "@/lib/decisions-index";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

// A Feature page writes `<DecisionTimeline />` with no props: which records it
// shows is its own capability, which is its slug. Binding that here keeps the
// page from naming itself, and the cache keeps the component identity stable
// across the pages that share a capability, which a fresh object per render
// would not.
const componentsByCapability = new Map<
  string,
  ReturnType<typeof buildComponents>
>();

function buildComponents(capability: string) {
  return {
    ...defaultMdxComponents,
    DecisionTimeline: () => (
      <DecisionTimeline decisions={decisionsFor(capability)} />
    ),
    InteractiveFlowchart,
    StatusBadge,
  };
}

function mdxComponentsFor(capability: string) {
  const cached = componentsByCapability.get(capability);
  if (cached) return cached;

  const components = buildComponents(capability);
  componentsByCapability.set(capability, components);
  return components;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = featuresSource.getPage(slug);
  if (!page) notFound();

  const mdxComponents = mdxComponentsFor((slug ?? []).join("/"));

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
  return featuresSource.generateParams();
}
