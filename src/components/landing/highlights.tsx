"use client";
import { cn } from "@/lib/utils";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import {
  RiBarChartLine,
  RiRecordCircleLine,
  RiSmartphoneLine,
  RiTeamLine,
} from "react-icons/ri";

const iconMap = {
  record: RiRecordCircleLine,
  chart: RiBarChartLine,
  team: RiTeamLine,
  device: RiSmartphoneLine,
} as const;

type IconKey = keyof typeof iconMap;

const highlights = [
  {
    id: 1,
    title: "提供簡單易用的賽事記錄工具",
    description: "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
    icon: "record" as const,
  },
  {
    id: 2,
    title: "透過強大的數據分析功能",
    description: "深入了解球隊表現，以數據驅動戰術改進",
    icon: "chart" as const,
  },
  {
    id: 3,
    title: "有效掌握球員資訊與表現變化",
    description: "協助陣容安排，讓每場比賽都有最佳配置",
    icon: "team" as const,
  },
  {
    id: 4,
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
    <motion.section
      ref={targetRef}
      data-testid="highlights-section"
      className="relative h-[400vh] bg-gradient-to-b from-primary/5 via-background to-muted"
      style={{
        // Force a new stacking context to contain sticky positioning
        isolation: "isolate",
        // Ensure proper containing block
        contain: "layout style paint",
      }}
    >
      {/* Sticky container with proper height and positioning */}
      <div
        data-testid="sticky-container"
        className="sticky top-0 flex h-screen items-center overflow-hidden"
        style={{
          // Create a stable containing block for transforms
          willChange: "auto",
          // Force GPU acceleration to prevent janky animations
          transform: "translateZ(0)",
        }}
      >
        {/* Title positioned within the sticky container */}
        <motion.div
          className="absolute top-20 left-1/2 z-10 -translate-x-1/2 transform text-center"
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="mb-4 text-4xl font-bold text-foreground md:text-6xl">
            四大核心特色
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            從即時記錄到數據分析，全方位滿足您的排球管理需求
          </p>
        </motion.div>

        {/* Scrolling cards container */}
        <motion.div
          data-testid="highlights-cards-container"
          style={{ x: springX }}
          className="flex gap-6 pl-[15%] will-change-transform md:gap-8"
        >
          {highlights.map((highlight, index) => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              index={index}
            />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

interface HighlightCardProps {
  highlight: {
    id: number;
    title: string;
    description: string;
    icon: IconKey;
  };
  index: number;
}

const HighlightCard = ({ highlight, index }: HighlightCardProps) => {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-100px" });
  const IconComponent = iconMap[highlight.icon];

  return (
    <motion.div
      ref={cardRef}
      data-testid="highlight-card"
      className={cn(
        "relative aspect-[1/2.17] h-[65vh] overflow-hidden",
        "flex flex-col items-center justify-between rounded-3xl shadow-2xl",
        "bg-gradient-to-t from-background via-background/95 to-primary/20",
        "md:aspect-auto md:w-[55vw] lg:w-[45vw]",
        "border border-border/50 backdrop-blur-sm",
      )}
    >
      {/* Header section */}
      <div className="flex w-full flex-col items-center justify-center p-6 text-center">
        <div
          data-testid={`highlight-badge-${highlight.id}`}
          className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <span className="text-2xl font-bold">{highlight.id}</span>
        </div>

        <h3 className="mb-3 text-3xl font-bold text-foreground">
          {highlight.title}
        </h3>

        <motion.p
          className="leading-relaxed text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: index * 0.2 + 0.4 }}
        >
          {highlight.description}
        </motion.p>
      </div>

      {/* Icon section */}
      <div className="relative flex items-center justify-center p-6">
        {IconComponent && (
          <IconComponent className="h-32 w-32 text-primary/60" />
        )}
      </div>
    </motion.div>
  );
};
