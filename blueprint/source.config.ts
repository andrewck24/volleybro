import {
  applyMdxPreset,
  defineCollections,
  defineDocs,
  defineConfig,
} from "fumadocs-mdx/config";
import { z } from "zod";
import { designSections } from "./src/lib/design-sections";

// A meta collection matches every JSON under its directory by default, which
// would index each decision and implementation-slice record as navigation
// metadata. Those records are read directly — by the slice loader and by MDX
// imports — so restricting the collection keeps their directories out of the
// page tree, where they would otherwise appear as empty folders and shadow the
// sibling page of the same name.
const metaFiles = { files: ["**/meta.json"] };

// A docs collection also globs plain `.md`, so any prose file a Change happens
// to carry becomes a page and fails the whole build on its missing frontmatter.
const mdxOnly = { files: ["**/*.mdx"] };

// ADR-0094: a Change is one page, index.mdx; its tabs are files of their own,
// compiled here without becoming pages, so the sidebar keeps one entry.
export const { docs, meta } = defineDocs({
  dir: "content/changes",
  docs: { files: ["**/index.mdx"] },
  meta: metaFiles,
});

export const changeTabs = defineCollections({
  type: "doc",
  dir: "content/changes",
  files: ["**/proposal.mdx", "**/review.mdx", "**/review-s*.mdx"],
  schema: z.object({}),
});

export const { docs: featureDocs, meta: featureMeta } = defineDocs({
  dir: "content/features",
  docs: mdxOnly,
  meta: metaFiles,
});

export const designDocument = defineCollections({
  type: "doc",
  dir: "..",
  files: ["DESIGN.md"],
  schema: z.object({}),
  mdxOptions: applyMdxPreset({ remarkPlugins: [designSections] }),
});

export default defineConfig();
