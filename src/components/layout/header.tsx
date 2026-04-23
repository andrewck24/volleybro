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
    if (backHref && history.length <= 1) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 z-50 flex h-[calc(env(safe-area-inset-top)+3rem)] w-full flex-row items-center justify-center gap-4 overscroll-none bg-accent px-3 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
        "md:w-screen md:pl-15",
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
          {children ?? (
            <h1 className="m-0 text-center text-xl">{title}</h1>
          )}
        </div>
        <div className="size-8 shrink-0" />
      </div>
    </header>
  );
};
