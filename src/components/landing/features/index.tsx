"use client";
import { AnalyticsFeatures } from "@/components/landing/features/analytics";
import { RecordingFeatures } from "@/components/landing/features/recording";
import { TeamFeatures } from "@/components/landing/features/team";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";
import { useEffect, useState } from "react";

export const Features = () => {
  return (
    <section
      data-testid="features-section"
      className="flex w-full flex-col items-center justify-center gap-12 px-6 py-12 lg:px-12"
    >
      <RecordingFeatures />
      <AnalyticsFeatures />
      <TeamFeatures />
    </section>
  );
};

interface FeatureCardsContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FeatureCardsContainer = ({
  children,
  ...props
}: FeatureCardsContainerProps) => {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-10"
      {...props}
    >
      {children}
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
  gradientClass: string;
  children: React.ReactNode;
  testId: string;
  demoTestId: string;
  layout: "left-image" | "right-image";
}

export const FeatureCard = ({
  title,
  description,
  className,
  gradientClass,
  children,
  testId,
  demoTestId,
  layout,
}: FeatureCardProps) => {
  const layoutClass =
    layout === "right-image" ? "lg:flex-row" : "lg:flex-row-reverse";
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-6 lg:h-[70vh] lg:gap-8",
        layoutClass,
        className,
      )}
    >
      {/* Content section */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center lg:h-full">
        <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {/* Demo area with 1:1 aspect ratio and gradient background */}
      <div
        data-testid={demoTestId}
        className={cn(
          "flex aspect-[3/4] w-full flex-1 items-center justify-center rounded-lg p-2 md:aspect-square lg:aspect-auto lg:h-full",
          gradientClass,
        )}
      >
        {children}
      </div>
    </div>
  );
};

interface FeatureDemoImageProps {
  feature: "recording" | "team";
  number: number;
  alt: string;
}

export const FeatureDemoImage = ({
  feature,
  number,
  alt,
}: FeatureDemoImageProps) => {
  const { resolvedTheme: theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="relative aspect-[18/39] h-full overflow-hidden rounded-3xl bg-background">
        <div className="flex h-full w-full animate-pulse items-center justify-center bg-muted" />
      </div>
    );
  }

  const isDark = theme === "dark";
  const imageSrc = `/landing/features/${feature}-demo-${number}-${isDark ? "dark" : "light"}.png`;

  return (
    <div className="relative aspect-[18/39] h-full overflow-hidden rounded-3xl">
      <div
        className={cn(
          "absolute inset-0 flex size-full items-center justify-center transition-opacity duration-300",
          imageLoaded ? "opacity-0" : "animate-pulse opacity-100 bg-muted",
        )}
      />
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={cn(
          "object-contain transition-opacity duration-300",
          imageLoaded ? "opacity-100" : "opacity-0",
        )}
        data-testid={`${feature}-demo-image-${number}`}
        priority={false}
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
};
