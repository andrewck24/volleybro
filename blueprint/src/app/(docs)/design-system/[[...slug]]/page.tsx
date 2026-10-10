import type { ComponentProps, ComponentType, ReactNode } from "react";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { designDocument } from "../../../../../.source/server";
import { notFound } from "next/navigation";
import { DocsPage, DocsBody } from "fumadocs-ui/layouts/docs/page";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

interface TocItem {
  title: string;
  url: string;
  depth: number;
}

interface PageModule {
  default: ComponentType;
  toc?: TocItem[];
}

// ponytail: static list for now; expand to dynamic discovery when the section grows
const designSystemModules: Record<string, () => Promise<PageModule>> = {
  "": () => import("../../../../../content/design-system/index"),
  brand: () => import("../../../../../content/design-system/brand/index"),
  color: () => import("../../../../../content/design-system/color/index"),
  typography: () =>
    import("../../../../../content/design-system/typography/index"),
  spacing: () => import("../../../../../content/design-system/spacing/index"),
  radius: () => import("../../../../../content/design-system/radius/index"),
  "elevation-depth": () =>
    import("../../../../../content/design-system/elevation-depth/index"),
  components: () =>
    import("../../../../../content/design-system/components/index"),
};

const sectionsByRoute: Record<string, string[]> = {
  "": ["Overview", "Do's and Don'ts"],
  brand: ["Colors"],
  color: ["Colors"],
  typography: ["Typography"],
  spacing: ["Layout"],
  radius: ["Shapes"],
  "elevation-depth": ["Elevation & Depth"],
  components: ["Components"],
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const key = slug?.join("/") ?? "";
  const loader = designSystemModules[key];
  if (!loader) notFound();

  const { default: Showcase, toc } = await loader();
  const document = designDocument[0];
  const Mdx = document.body;
  const selected = sectionsByRoute[key];
  const selectedAnchors = selected.map(
    (name) =>
      `#${name
        .toLowerCase()
        .replace(/[^\w -]/g, "")
        .replace(/ /g, "-")}`,
  );
  const documentToc = document.toc.filter((_, index, items) =>
    selectedAnchors.includes(
      items.slice(0, index + 1).findLast((item) => item.depth === 2)?.url ?? "",
    ),
  );
  const MdxLink = defaultMdxComponents.a;
  const mdxComponents = {
    ...defaultMdxComponents,
    a: ({ href, ...props }: ComponentProps<"a">) => {
      const destination = href?.startsWith("blueprint/content/features/")
        ? href
            .replace("blueprint/content/features/", "/features/")
            .replace(/\/index\.mdx$/, "")
        : href?.startsWith(".impeccable/")
          ? `https://github.com/andrewck24/volleybro/blob/main/${href}`
          : href;
      return <MdxLink {...props} href={destination} />;
    },
    DesignSection: ({
      name,
      children,
    }: {
      name: string;
      children: ReactNode;
    }) => (selected.includes(name) ? children : null),
  };
  return (
    <DocsPage toc={[...documentToc, ...(toc ?? [])]}>
      <DocsBody>
        <h1>
          {key === ""
            ? "VolleyBro Design System"
            : key === "elevation-depth"
              ? "Elevation & Depth"
              : key.charAt(0).toUpperCase() + key.slice(1)}
        </h1>
        <Mdx components={mdxComponents} />
        <Showcase />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return Object.keys(designSystemModules).map((key) => ({
    slug: key ? key.split("/") : [],
  }));
}
