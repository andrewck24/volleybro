import { render } from "astro:content";
import { structure } from "fumadocs-core/mdx-plugins";
import {
  createSearchAPI,
  type AdvancedIndex,
} from "fumadocs-core/search/server";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DesignSystemOverview from "../../../content/design-system/index";
import BrandPage from "../../../content/design-system/brand/index";
import ColorPage from "../../../content/design-system/color/index";
import ComponentLibraryShowcase, {
  flowchartDetails,
} from "../../../content/design-system/components/index";
import ElevationDepthPage from "../../../content/design-system/elevation-depth/index";
import RadiusPage from "../../../content/design-system/radius/index";
import SpacingPage from "../../../content/design-system/spacing/index";
import TypographyPage from "../../../content/design-system/typography/index";
import { allDecisions } from "../../lib/decisions-index";
import { visibleShowcaseText } from "../../lib/design-system-search";
import { createBlueprintSources } from "../../lib/source";

export const prerender = true;

const designShowcases = {
  index: DesignSystemOverview,
  brand: BrandPage,
  color: ColorPage,
  components: ComponentLibraryShowcase,
  "elevation-depth": ElevationDepthPage,
  radius: RadiusPage,
  spacing: SpacingPage,
  typography: TypographyPage,
};

export async function GET() {
  const sources = await createBlueprintSources();
  const changes: AdvancedIndex[] = sources.changes.getPages().map((page) => ({
    id: page.url,
    title: page.data.title ?? "",
    description: page.data.description,
    url: page.url,
    structuredData: {
      headings: page.data.structuredData?.headings ?? [],
      contents: [],
    },
  }));
  const features: AdvancedIndex[] = sources.features.getPages().map((page) => ({
    id: page.url,
    title: page.data.title ?? "",
    description: page.data.description,
    url: page.url,
    structuredData: page.data.structuredData ?? { headings: [], contents: [] },
  }));

  const { headings: designHeadings } = await render(sources.designDocument);
  const designContent = structure(sources.designDocument.body ?? "");
  const designIndexes: AdvancedIndex[] = sources.designPages.map((page) => {
    let isInSelectedSection = false;
    const selectedHeadingIds = new Set<string>();
    const headings = designHeadings.flatMap((heading) => {
      if (heading.depth === 2) {
        isInSelectedSection = page.sections.includes(heading.text);
      }
      if (!isInSelectedSection) return [];
      selectedHeadingIds.add(heading.slug);
      return [{ id: heading.slug, content: heading.text }];
    });
    const contents = designContent.contents.filter(
      (content) => content.heading && selectedHeadingIds.has(content.heading),
    );
    const Showcase =
      designShowcases[page.showcase as keyof typeof designShowcases];
    if (!Showcase)
      throw new Error(`Design System showcase not found: ${page.showcase}`);
    const showcaseText = [
      visibleShowcaseText(renderToStaticMarkup(React.createElement(Showcase))),
      ...(page.showcase === "components"
        ? Object.values(flowchartDetails).map(
            ({ title, body }) => `${title} ${body}`,
          )
        : []),
    ]
      .filter(Boolean)
      .join(" ");
    const extractedText = [
      page.title,
      page.description,
      ...headings.map((heading) => heading.content),
      ...contents.map((content) => content.content),
      showcaseText,
    ]
      .join("\n")
      .normalize("NFKC")
      .toLocaleLowerCase();
    const missingSearchTerms = (page.searchTerms ?? []).filter(
      (term) =>
        !extractedText.includes(term.normalize("NFKC").toLocaleLowerCase()),
    );
    return {
      id: page.slug ? `/design-system/${page.slug}` : "/design-system",
      title: page.title,
      description: page.description,
      url: page.slug ? `/design-system/${page.slug}` : "/design-system",
      structuredData: {
        headings,
        contents: [
          ...contents,
          ...(showcaseText
            ? [{ heading: undefined, content: showcaseText }]
            : []),
          ...missingSearchTerms.map((content) => ({
            heading: undefined,
            content,
          })),
        ],
      },
    };
  });

  const decisions: AdvancedIndex[] = allDecisions().map((record) => ({
    id: `adr-${record.id}`,
    title: `ADR-${record.id} ${record.title}`,
    url: `/features/${record.capabilities[0]}#adr-${record.id}`,
    structuredData: {
      headings: [],
      contents: [record.decision, record.context ?? ""]
        .filter(Boolean)
        .map((content) => ({ heading: undefined, content })),
    },
  }));

  return createSearchAPI("advanced", {
    indexes: [...changes, ...features, ...designIndexes, ...decisions],
  }).staticGET();
}
