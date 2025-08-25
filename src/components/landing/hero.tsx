"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { FlipWords } from "@/components/ui/flip-words";
import Image from "next/image";
import { useRef } from "react";
import { RiDeviceLine, RiGlobalLine, RiSpeedLine } from "react-icons/ri";

export const Hero = () => {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const words: string[] = ["簡單", "快速", "專業"];

  return (
    <section
      ref={heroRef}
      data-testid="hero-section"
      className="relative flex h-[calc(100vh-3.25rem)] w-full flex-col items-start justify-start overflow-hidden bg-gradient-to-b from-transparent to-primary/50 pt-10 md:px-[5%]"
    >
      <BackgroundDecorations />
      <div className="relative z-10 flex size-full flex-1 flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start justify-center gap-6 md:flex-1">
          <HeroTitle words={words} />
          <HeroDescription content="專為排球教練與管理者設計的數位化解決方案，讓您告別紙筆記錄，擁抱智慧化團隊管理。" />
          <div className="flex w-full flex-col items-center justify-start gap-4 py-6 xl:flex-row xl:gap-6">
            <CTAButton
              className="h-12 w-full px-8 text-lg font-bold shadow-2xl xl:w-auto"
              size="lg"
            />
            <HeroFeatures />
          </div>
        </div>
        <HeroImage />
      </div>
    </section>
  );
};

const BackgroundDecorations = () => {
  return (
    <div
      data-testid="background-decorations"
      className="pointer-events-none absolute inset-0"
    >
      <div className="animate-float absolute top-20 right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="animate-float absolute bottom-20 left-20 h-80 w-80 rounded-full bg-destructive/20 blur-3xl"
        style={{ animationDelay: "1s" }}
      />
    </div>
  );
};

interface HeroTitleProps {
  words: string[];
  duration?: number;
}

const HeroTitle = ({ words, duration = 2500 }: HeroTitleProps) => {
  return (
    <h1 className="text-5xl leading-[1.1] font-bold tracking-wide text-foreground lg:text-6xl xl:text-7xl">
      <span className="inline-block">讓排球賽事記錄</span>
      <br />
      <span className="inline-block">更加</span>
      <FlipWords words={words} duration={duration} className="text-primary" />
    </h1>
  );
};

interface HeroDescriptionProps {
  content: string;
  maxWidth?: string;
}

const HeroDescription = ({
  content,
  maxWidth = "max-w-2xl",
}: HeroDescriptionProps) => {
  return (
    <p
      className={`${maxWidth} text-xl leading-relaxed font-medium text-muted-foreground`}
    >
      {content}
    </p>
  );
};

const HeroFeatures = () => {
  const features = [
    { label: "快速紀錄", icon: RiSpeedLine },
    { label: "即時同步", icon: RiGlobalLine },
    { label: "跨平台支援", icon: RiDeviceLine },
  ];

  return (
    <div
      data-testid="status-indicators"
      className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground md:justify-start"
    >
      {features.map((feature) => (
        <div
          key={feature.label}
          className="group flex cursor-pointer items-center gap-2"
        >
          <feature.icon className="text-lg text-primary transition-transform duration-200 group-hover:scale-110" />
          <span className="text-sm font-medium">{feature.label}</span>
        </div>
      ))}
    </div>
  );
};

interface HeroImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

const HeroImage = ({
  src = "/landing/hero.svg",
  alt = "VolleyBro App Interface",
  className = "object-contain object-center dark:invert",
}: HeroImageProps) => {
  return (
    <div
      data-testid="hero-image-container"
      className="pointer-events-none relative h-64 w-full overflow-hidden md:h-full md:w-1/2 md:flex-1"
    >
      <Image src={src} alt={alt} fill={true} className={className} priority />
    </div>
  );
};
