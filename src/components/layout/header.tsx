"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine } from "react-icons/ri";

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
        "fixed top-0 left-0 z-50 flex h-[calc(env(safe-area-inset-top)+3rem)] w-full flex-row items-center justify-center gap-4 overscroll-none bg-accent px-3 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
        "md:pl-16",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-160 items-center justify-center gap-3">
        {backHref ? (
          <Button
            onClick={handleBack}
            variant="outline"
            size="icon"
            className="size-8 shrink-0 rounded-full text-foreground shadow-sm [&>svg]:size-6"
          >
            <RiArrowLeftLine />
          </Button>
        ) : (
          <div aria-hidden className="size-8 shrink-0" />
        )}
        <div className="flex flex-1 items-center justify-center">
          {children ?? <h1 className="m-0 text-center text-xl">{title}</h1>}
        </div>
        <div className="size-8 shrink-0" />
      </div>
    </header>
  );
};
