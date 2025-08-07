"use client";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { RiArrowLeftLine, RiNotification2Line } from "react-icons/ri";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const pathArr = pathname.split("/").filter(Boolean);
  const isIndex = pathArr.length <= 1;

  return (
    <header className="fixed w-full h-[calc(env(safe-area-inset-top)+3rem)] px-[5%] flex flex-row items-center justify-center gap-4 overscroll-none bg-card border-accent border-b-2 z-50 top-0 left-0 pt-[env(safe-area-inset-top)]">
      {isIndex || (
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className="[&>svg]:size-8"
        >
          <RiArrowLeftLine />
        </Button>
      )}
      <h1
        className={cn(
          "flex-1 text-[1.625rem] text-primary font-medium text-left m-0 dark:text-foreground",
          isIndex || "text-center"
        )}
      >
        VolleyBro
      </h1>
      <Button variant="ghost" size="icon" className="[&>svg]:size-8">
        <RiNotification2Line />
        <span className="sr-only">notifications</span>
      </Button>
    </header>
  );
};
