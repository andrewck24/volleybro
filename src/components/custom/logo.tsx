import { LogoType } from "@/components/brand";
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex h-auto w-full flex-1 items-center justify-center",
      className,
    )}
  >
    <LogoType className="h-12.5 w-auto" />
  </div>
);
