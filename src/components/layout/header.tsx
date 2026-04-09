"use client";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { RiArrowLeftLine } from "react-icons/ri";

export const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const pathArr = pathname.split("/").filter(Boolean);
  const isIndex = pathArr.length <= 1;

  return (
    <header className="fixed top-0 left-0 z-50 flex h-[calc(env(safe-area-inset-top)+3rem)] w-full flex-row items-center justify-center gap-4 overscroll-none bg-accent px-3 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-12 w-full max-w-160 items-center justify-center gap-3">
        {isIndex ? (
          <div aria-hidden className="size-8 shrink-0" />
        ) : (
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="icon"
            className="size-8 rounded-full text-foreground shadow-sm backdrop-blur-sm [&>svg]:size-6"
          >
            <RiArrowLeftLine />
          </Button>
        )}
        <h1 className="m-0 flex-1 text-center text-xl font-medium text-primary dark:text-foreground">
          VolleyBro
        </h1>
        <div className="size-8 shrink-0" />
      </div>
    </header>
  );
};
