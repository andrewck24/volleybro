import { navigate } from "astro:transitions/client";
import type { AstroProviderProps } from "fumadocs-core/framework/astro";
import type { Root } from "fumadocs-core/page-tree";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsPage,
  type DocsPageProps,
} from "fumadocs-ui/layouts/docs/page";
import { RootProvider } from "fumadocs-ui/provider/astro";
import type { ReactNode } from "react";

export function Docs({
  children,
  tree,
  pathname,
  params,
  page,
  hasChanges,
}: {
  children: ReactNode;
  tree: Root;
  pathname: string;
  params: AstroProviderProps["params"];
  page?: DocsPageProps;
  hasChanges: boolean;
}) {
  return (
    <RootProvider
      pathname={pathname}
      params={params}
      navigate={navigate}
      search={{ options: { type: "static" } }}
    >
      <DocsLayout
        tree={tree}
        nav={{ title: "Blueprint" }}
        sidebar={{
          tabs: [
            { title: "Changes", url: "/changes", unlisted: !hasChanges },
            { title: "Features", url: "/features" },
            { title: "Design System", url: "/design-system" },
          ],
        }}
      >
        <DocsPage {...page}>
          <DocsBody>{children}</DocsBody>
        </DocsPage>
      </DocsLayout>
    </RootProvider>
  );
}
