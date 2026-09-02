import type { MetadataRoute } from "next";

/**
 * Crawl budget, not access control. Everything disallowed here either
 * redirects to sign-in or serves a machine artefact, so crawling it yields
 * nothing; the splash route is the one that would actually spend the budget,
 * generating an image per device size.
 *
 * The test deployment keeps these same rules rather than disallowing
 * everything: it is kept out of the index by an `X-Robots-Tag` header, and a
 * crawler blocked here would never get to read that header.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/game/", "/apple-splash/", "/serwist/"],
    },
  };
}
