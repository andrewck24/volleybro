import {
  createSearchAPI,
  type AdvancedIndex,
} from "fumadocs-core/search/server";

import { allDecisions } from "@/lib/decisions-index";
import { featuresSource, source } from "@/lib/source";

// A static export has no server, so the index is built once at export time.
export const revalidate = false;

type Page = ReturnType<typeof source.getPages>[number];

const pageIndex = (page: Page, withText: boolean): AdvancedIndex => ({
  id: page.url,
  title: page.data.title,
  description: page.data.description,
  url: page.url,
  structuredData: withText
    ? page.data.structuredData
    : { headings: page.data.structuredData.headings, contents: [] },
});

// The whole index downloads on the first search; Change pages' full text alone
// would make it megabytes, so they are found by title and headings.
const pageIndexes = [
  ...source.getPages().map((page) => pageIndex(page, false)),
  ...featuresSource.getPages().map((page) => pageIndex(page, true)),
];

// Records render through a component, so page text never carries them.
const decisionIndexes = allDecisions().map((record): AdvancedIndex => ({
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

export const { staticGET: GET } = createSearchAPI("advanced", {
  indexes: [...pageIndexes, ...decisionIndexes],
});
