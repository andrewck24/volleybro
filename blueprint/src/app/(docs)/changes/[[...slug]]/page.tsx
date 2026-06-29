import type { ComponentType } from "react";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";

const designModules: Record<string, () => Promise<{ default: ComponentType }>> =
  {
    "archive/2026-06-28-apple-splash-dynamic/design": () =>
      import(
        "../../../../../content/changes/archive/2026-06-28-apple-splash-dynamic/design"
      ),
    "archive/2026-06-16-contextual-edit-pages/design": () =>
      import(
        "../../../../../content/changes/archive/2026-06-16-contextual-edit-pages/design"
      ),
    "archive/2026-06-16-api-objectid-guards/design": () =>
      import(
        "../../../../../content/changes/archive/2026-06-16-api-objectid-guards/design"
      ),
    "archive/2026-06-16-team-routes-clean-architecture/design": () =>
      import(
        "../../../../../content/changes/archive/2026-06-16-team-routes-clean-architecture/design"
      ),
  };

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (page) {
    const Mdx = page.data.body;
    return (
      <DocsPage toc={page.data.toc}>
        <DocsBody>
          <Mdx components={defaultMdxComponents} />
        </DocsBody>
      </DocsPage>
    );
  }

  const key = slug?.join("/") ?? "";
  const loader = designModules[key];
  if (!loader) notFound();
  const { default: Design } = await loader();
  return (
    <DocsPage>
      <DocsBody>
        <Design />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  const mdxParams = source.generateParams();
  const designParams = Object.keys(designModules).map((key) => ({
    slug: key.split("/"),
  }));
  return [...mdxParams, ...designParams];
}
