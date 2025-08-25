"use client";
import { cn } from "@/lib/utils";
import {
  LazyMotion,
  domAnimation,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import {
  RiBarChartBoxAiFill,
  RiDeviceFill,
  RiPencilFill,
  RiTeamFill,
} from "react-icons/ri";

const iconMap = {
  record: RiPencilFill,
  chart: RiBarChartBoxAiFill,
  team: RiTeamFill,
  device: RiDeviceFill,
} as const;

type IconKey = keyof typeof iconMap;

const highlights = [
  {
    title: "提供簡單易用的賽事記錄工具",
    description: "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
    icon: "record" as const,
  },
  {
    title: "透過強大的數據分析功能",
    description: "深入了解球隊表現，以數據驅動戰術改進",
    icon: "chart" as const,
  },
  {
    title: "有效掌握球員資訊與表現變化",
    description: "協助陣容安排，讓每場比賽都有最佳配置",
    icon: "team" as const,
  },
  {
    title: "無論是手機、平板或電腦",
    description: "隨時隨地輕鬆使用，不受設備限制",
    icon: "device" as const,
  },
];

export const Highlights = () => {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
  });

  const x = useTransform(scrollYProgress, [0, 1], ["1%", "-75%"]);
  const springX = useSpring(x, { stiffness: 100, damping: 30 });

  return (
    <LazyMotion features={domAnimation} strict>
      <section
        ref={targetRef}
        data-testid="highlights-section"
        className="relative isolate bg-gradient-to-b from-primary/50 to-transparent py-16 md:h-[300vh] md:[contain:layout_style_paint]"
      >
        {/* Mobile: Static vertical layout */}
        <div className="container mx-auto px-4 md:hidden">
          <div
            data-testid="highlights-cards-container-mobile"
            className="grid grid-cols-1 gap-6"
          >
            {highlights.map((highlight, index) => (
              <HighlightCard key={index} highlight={highlight} />
            ))}
          </div>
        </div>

        {/* Desktop: Sticky horizontal scroll layout */}
        <div
          data-testid="sticky-container"
          className="sticky top-0 hidden h-screen translate-z-0 items-center overflow-hidden will-change-auto md:flex"
        >
          <m.div
            data-testid="highlights-cards-container"
            style={{ x: springX }}
            className="flex gap-6 pl-[15%] will-change-transform md:gap-8"
          >
            {highlights.map((highlight, index) => (
              <HighlightCard key={index} highlight={highlight} />
            ))}
          </m.div>
        </div>
      </section>
    </LazyMotion>
  );
};

interface HighlightCardProps {
  highlight: {
    title: string;
    description: string;
    icon: IconKey;
  };
}

const HighlightCard = ({
  highlight: { title, description, icon },
}: HighlightCardProps) => {
  const Icon = iconMap[icon];

  return (
    <div
      data-testid="highlight-card"
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-2xl",
        "flex flex-col items-center justify-center",
        "bg-gradient-to-b from-primary/20 via-background/95 to-background",
        "border border-border p-8 backdrop-blur-sm",
        "aspect-[3/2] w-full", // Mobile: landscape ratio (w > h)
        "md:aspect-[1/2.17] md:h-[45vh] md:w-[55vw] lg:w-[45vw]", // Desktop: portrait ratio
      )}
    >
      <div
        data-testid={`highlight-badge-${icon}`}
        className="mb-4 inline-flex size-20 items-center justify-center rounded-full bg-primary"
      >
        {Icon && <Icon className="size-14 text-primary-foreground" />}
      </div>
      <h3 className="mb-3 text-center text-2xl font-bold text-foreground md:text-3xl">
        {title}
      </h3>
      <p className="text-center leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
};
