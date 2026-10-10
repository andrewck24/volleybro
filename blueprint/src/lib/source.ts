import { getCollection, type CollectionEntry } from "astro:content";
import { structure, type StructuredData } from "fumadocs-core/mdx-plugins";
import {
  loader,
  type MetaData,
  type PageData,
  type StaticSource,
} from "fumadocs-core/source";
import path from "node:path";

type PageEntry =
  CollectionEntry<"changePage"> | CollectionEntry<"featurePages">;

type MetaEntry = CollectionEntry<"featureMeta">;
type DesignPage = CollectionEntry<"designMeta">["data"]["pages"][number];
type SourceRaw = PageEntry | DesignPage;

type SourceConfig = {
  pageData: PageData & { structuredData: StructuredData; _raw: SourceRaw };
  metaData: MetaData;
};

function buildContentSource(
  pages: PageEntry[],
  metas: MetaEntry[],
  contentRoot: string,
): StaticSource<SourceConfig> {
  const files: StaticSource<SourceConfig>["files"] = [];
  for (const entry of pages) {
    if (!entry.filePath) continue;
    files.push({
      type: "page",
      path: path.relative(contentRoot, entry.filePath).replace(/\\/g, "/"),
      absolutePath: entry.filePath,
      data: {
        ...entry.data,
        _raw: entry,
        structuredData: structure(entry.body ?? ""),
      },
    });
  }
  for (const entry of metas) {
    if (!entry.filePath) continue;
    files.push({
      type: "meta",
      path: path.relative(contentRoot, entry.filePath).replace(/\\/g, "/"),
      absolutePath: entry.filePath,
      data: entry.data,
    });
  }
  return { files };
}

function buildDesignSource(pages: DesignPage[]): StaticSource<SourceConfig> {
  const ordered = pages.map((page) => page.slug || "index");
  const files: StaticSource<SourceConfig>["files"] = [
    {
      type: "meta",
      path: "meta.json",
      data: { title: "Design System", pages: ordered },
    },
    ...pages.map((page) => ({
      type: "page" as const,
      path: `${page.slug ? `${page.slug}/` : ""}index.mdx`,
      data: {
        title: page.title,
        description: page.description,
        structuredData: { headings: [], contents: [] },
        _raw: page,
      },
    })),
  ];
  return { files };
}

export async function createBlueprintSources() {
  const [changes, features, featureMetas, designMetas] = await Promise.all([
    getCollection("changePage"),
    getCollection("featurePages"),
    getCollection("featureMeta"),
    getCollection("designMeta"),
  ]);
  const designDocument = (await getCollection("designDocument"))[0];
  if (!designDocument) throw new Error("DESIGN.md is required by Blueprint");
  const designPages = designMetas.flatMap((entry) => entry.data.pages);
  const changesRoot = path.resolve("content/changes");
  const featuresRoot = path.resolve("content/features");

  const changesSource = loader({
    baseUrl: "/changes",
    source: buildContentSource(changes, [], changesRoot),
  });
  const featuresSource = loader({
    baseUrl: "/features",
    source: buildContentSource(features, featureMetas, featuresRoot),
  });
  const designSystemSource = loader({
    baseUrl: "/design-system",
    source: buildDesignSource(designPages),
  });

  return {
    changes: changesSource,
    features: featuresSource,
    designSystem: designSystemSource,
    designPages,
    designDocument,
  };
}

export type BlueprintSources = Awaited<
  ReturnType<typeof createBlueprintSources>
>;
