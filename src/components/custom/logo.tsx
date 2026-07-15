import { LogoType } from "@/components/brand";
import { cn } from "@/lib/utils";

export const Logo = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex h-auto w-full flex-1 items-center justify-center",
      className,
    )}
  >
    {/* Inline wordmark (not the all-white /logo.svg) so it follows the theme
        foreground and stays legible on light surfaces such as the auth pages. */}
    <LogoType className="h-[50px] w-auto" />
  </div>
);
