import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const changePage = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./content/changes" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
  }),
});

const changeTabs = defineCollection({
  loader: glob({
    pattern: ["**/proposal.mdx", "**/review.mdx", "**/review-s*.mdx"],
    base: "./content/changes",
  }),
  schema: z.object({}),
});

const featurePages = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./content/features" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const featureMeta = defineCollection({
  loader: glob({ pattern: "**/meta.json", base: "./content/features" }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    root: z.union([z.boolean(), z.string()]).optional(),
    pages: z.array(z.string()).optional(),
    pagesIndex: z.string().optional(),
    defaultOpen: z.boolean().optional(),
    collapsible: z.boolean().optional(),
  }),
});

const designMeta = defineCollection({
  loader: glob({ pattern: "meta.json", base: "./content/design-system" }),
  schema: z.object({
    title: z.string(),
    pages: z.array(
      z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string(),
        sections: z.array(z.string()),
        showcase: z.string(),
        interactive: z.boolean().optional(),
        searchTerms: z.array(z.string()).optional(),
      }),
    ),
  }),
});

const designDocument = defineCollection({
  loader: glob({ pattern: "DESIGN.md", base: ".." }),
});

export const collections = {
  changePage,
  changeTabs,
  featurePages,
  featureMeta,
  designMeta,
  designDocument,
};
