"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { cn } from "@/lib/utils";
import { useScroll } from "motion/react";
import Image from "next/image";
import { RefObject, useEffect, useState } from "react";

interface HeaderProps {
  observerRef: RefObject<HTMLDivElement | null>;
}

export const Header = ({ observerRef }: HeaderProps) => {
  const [isShowingCTA, setIsShowingCTA] = useState(false);
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  const SCROLL_THRESHOLD = 0;

  useEffect(() => {
    const targetElement = observerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setIsShowingCTA(!entry.isIntersecting),
      { threshold: 0.5 },
    );

    if (targetElement) {
      observer.observe(targetElement);
    }

    return () => {
      if (targetElement) {
        observer.unobserve(targetElement);
      }
    };
  }, [observerRef]);

  // 使用 throttle 機制避免性能問題
  useEffect(() => {
    let ticking = false;

    const updateScrollState = () => {
      const currentScrollY = scrollY.get();
      setIsScrolled(currentScrollY > SCROLL_THRESHOLD);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    };

    const unsubscribe = scrollY.on("change", handleScroll);

    return () => unsubscribe();
  }, [scrollY]);

  return (
    <header
      data-testid="header"
      className="sticky top-0 left-0 z-50 flex w-full flex-row"
    >
      <div
        data-testid="header-glassmorphism-container"
        className={cn(
          "mx-2 mt-1 flex flex-1 items-center justify-start px-3 py-2 text-foreground md:mx-4 md:mt-2 md:px-6 md:py-4",
          "rounded-2xl border border-transparent md:rounded-3xl",
          "transition-all duration-300 ease-out",
          isScrolled && [
            "backdrop-blur-sm border border-white/20 bg-white/10",
            "shadow-lg shadow-black/5",
            "dark:border-white/10 dark:bg-black/10",
          ],
        )}
      >
        <div
          className="flex h-8 flex-1 items-center justify-start md:h-9"
          data-testid="logo-container"
        >
          <Image
            src="/logo.svg"
            alt="VolleyBro"
            width={100}
            height={20}
            priority={true}
            data-testid="logo-image"
            className="md:w-[140px] md:h-[30px]"
          />
        </div>
        <CTAButton
          data-testid="cta-button"
          className={cn(
            "h-8 md:h-9",
            "transition-opacity ease-in-out",
            isShowingCTA ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </header>
  );
};
