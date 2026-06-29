import { notFound } from "next/navigation";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

// ponytail: static list for now; expand to dynamic discovery when features grow
const featureModules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  "game-recording": () => import("../../../../../content/features/game-recording/index"),
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const key = slug?.join("/") ?? "";
  const loader = featureModules[key];
  if (!loader) notFound();

  const { default: Feature } = await loader();
  return (
    <DocsPage>
      <DocsBody>
        <Feature />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(featureModules).map((key) => ({
    slug: key.split("/"),
  }));
}
