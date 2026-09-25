import Link from "next/link";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/features",
    title: "Features",
    description:
      "VolleyBro 現在能做什麼：依 capability 整理的行為、限制與決策紀錄。",
  },
  {
    href: "/changes",
    title: "Changes",
    description:
      "每一次交付的 Proposal 與 Review：做了什麼、為什麼這樣做、怎麼驗證。",
  },
  {
    href: "/design-system",
    title: "Design System",
    description: "介面共用的色彩、層次、元件與互動規則。",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">VolleyBro Blueprint</p>
        <h1 className="text-3xl font-semibold text-balance">
          排球隊管理與比賽紀錄 PWA 的設計與交付紀錄
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          Blueprint 記錄 VolleyBro 目前的功能與決策，以及每個 Change
          從提案到交付的經過。從下面三個入口開始。
        </p>
      </header>
      <nav aria-label="Blueprint sections" className="flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="block text-inherit no-underline!"
          >
            <Card className="gap-2 border-l-4 border-l-primary py-4 transition-colors hover:bg-muted/30">
              <CardHeader className="gap-1 px-4">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription className="leading-snug">
                  {section.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </nav>
    </main>
  );
}
