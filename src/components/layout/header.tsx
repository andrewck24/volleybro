"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { RiArrowLeftSLine } from "react-icons/ri";

interface HeaderProps {
  title?: string;
  backHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Header = ({
  title,
  backHref,
  children,
  className,
}: HeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (!backHref) {
      router.back();
      return;
    }

    const referrer = document.referrer;
    if (!referrer) {
      router.push(backHref);
      return;
    }

    try {
      const referrerUrl = new URL(referrer);
      if (referrerUrl.origin !== window.location.origin) {
        router.push(backHref);
        return;
      }
    } catch {
      router.push(backHref);
      return;
    }

    router.back();
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-50 flex h-[calc(env(safe-area-inset-top)+var(--header-height))] w-full flex-row items-center justify-center gap-4 overscroll-none bg-background pt-[env(safe-area-inset-top)]",
        className,
      )}
    >
      <div className="mx-auto flex h-(--header-height) w-full max-w-page items-center justify-center gap-3 pr-(--page-gutter) pl-[calc(var(--page-inset-start)+var(--page-gutter))]">
        {backHref ? (
          <Button
            onClick={handleBack}
            variant="glass"
            size="icon"
            className="shrink-0"
          >
            <RiArrowLeftSLine />
          </Button>
        ) : (
          <div aria-hidden className="size-(--control-size) shrink-0" />
        )}
        <div className="flex flex-1 items-center justify-center">
          {children ?? <h1 className="m-0 text-center text-xl">{title}</h1>}
        </div>
        <div aria-hidden className="size-(--control-size) shrink-0" />
      </div>
    </header>
  );
};
