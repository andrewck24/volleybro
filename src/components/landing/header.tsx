"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

export const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  const SCROLL_THRESHOLD = 0;

  // 使用原生 Web API 和 throttle 機制避免性能問題
  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > SCROLL_THRESHOLD);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      data-testid="header"
      className="sticky top-0 left-0 z-50 flex w-full flex-row"
    >
      <div
        data-testid="header-glassmorphism-container"
        className={cn(
          "mx-2 mt-1 flex flex-1 items-center justify-between p-3 text-foreground md:mx-4 md:mt-2",
          "rounded-2xl border border-transparent",
          "transition-all duration-300 ease-out",
          isScrolled && [
            "border border-white/20 bg-white/10 backdrop-blur-sm",
            "shadow-lg shadow-black/5",
            "dark:border-white/10 dark:bg-black/10",
          ],
        )}
      >
        <div
          className="flex h-8 items-center justify-start gap-3 pl-4 md:h-9"
          data-testid="logo-container"
        >
          <Image
            src="/logo.svg"
            alt="VolleyBro"
            width={100}
            height={20}
            priority={true}
            data-testid="logo-image"
            className="md:h-[30px] md:w-[140px]"
          />
          <Badge variant="outline" data-testid="preview-badge">
            Preview
          </Badge>
        </div>
        <CTAButton data-testid="cta-button" className="h-8 md:h-9" />
      </div>
    </header>
  );
};
