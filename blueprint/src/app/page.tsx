import Link from "next/link";
import { Layers, ListTree, Palette, type LucideIcon } from "lucide-react";

import { ChangeCardList } from "@/components/ChangeCard";
import { listChanges } from "@/lib/changes-index";
import { featuresSource } from "@/lib/source";

const LATEST_CHANGES = 3;

type Section = {
  href: string;
  title: string;
  description: string;
  figure: string;
  Icon: LucideIcon;
};

function Tile({ href, title, description, figure, Icon }: Section) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 text-inherit no-underline! transition-colors duration-200 hover:border-primary/60 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <Icon aria-hidden="true" className="size-5 text-primary" />
        <span className="text-xs text-muted-foreground tabular-nums">
          {figure}
        </span>
      </div>
      <h2 className="m-0 text-lg font-semibold">{title}</h2>
      <p className="m-0 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export default function Home() {
  const changes = listChanges();
  // Every Feature page is a capability or a sub-capability.
  const capabilities = featuresSource
    .getPages()
    .filter((page) => page.slugs.length > 0).length;

  const sections: Section[] = [
    {
      href: "/features",
      title: "Features",
      description:
        "VolleyBro 現在能做什麼：依 capability 整理的行為、限制與決策紀錄。",
      figure: `${capabilities} capabilities`,
      Icon: ListTree,
    },
    {
      href: "/changes",
      title: "Changes",
      description:
        "每一次交付的 Proposal 與 Review：做了什麼、為什麼、怎麼驗證。",
      figure: `${changes.length} changes`,
      Icon: Layers,
    },
    {
      href: "/design-system",
      title: "Design System",
      description: "介面共用的色彩、層次、間距、字體與元件規則。",
      figure: "tokens & components",
      Icon: Palette,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-16 md:py-24">
      <header className="flex max-w-2xl flex-col gap-4">
        <p className="m-0 text-sm font-medium text-primary">
          VolleyBro Blueprint
        </p>
        <h1 className="m-0 text-3xl font-semibold break-keep md:text-4xl">
          排球隊管理與比賽紀錄 PWA 的設計與交付紀錄
        </h1>
        <p className="m-0 leading-relaxed text-muted-foreground">
          這裡記錄 VolleyBro 目前的功能與決策，以及每個 Change
          從提案到交付的經過。
        </p>
      </header>

      <nav aria-label="Blueprint sections">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {sections.map((section) => (
            <li key={section.href} className="m-0 flex p-0 [&>a]:flex-1">
              <Tile {...section} />
            </li>
          ))}
        </ul>
      </nav>

      {changes.length > 0 && (
        <section aria-labelledby="latest-changes" className="flex flex-col">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="latest-changes" className="m-0 text-lg font-semibold">
              最近的 Change
            </h2>
            <Link
              href="/changes"
              className="text-sm text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              全部 Change
            </Link>
          </div>
          <ChangeCardList changes={changes.slice(0, LATEST_CHANGES)} />
        </section>
      )}
    </main>
  );
}
