"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { Header } from "@/components/landing/header";
import { Badge } from "@/components/ui/badge";
import { FlipWords } from "@/components/ui/flip-words";
import Image from "next/image";
import { useRef } from "react";
import { RiDeviceLine, RiGlobalLine, RiSpeedLine } from "react-icons/ri";

export const Hero = () => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const words: string[] = ["簡單", "快速", "專業"];

  return (
    <>
      <Header observerRef={observerRef} />
      <section
        ref={heroRef}
        data-testid="hero-section"
        className="relative flex h-[calc(100vh-3.25rem)] w-full flex-col items-start justify-start overflow-hidden pt-10 md:px-[5%]"
      >
        <BackgroundDecorations />
        <GradientOverlay />
        <div className="relative z-10 flex size-full flex-1 flex-col items-start justify-center gap-6 px-4">
          <HeroBadge />
          <HeroTitle words={words} />
          <HeroDescription content="專為排球教練與管理者設計的數位化解決方案，讓您告別紙筆記錄，擁抱智慧化團隊管理。" />
          <div
            ref={observerRef}
            className="flex w-full flex-col items-center justify-start gap-4 py-6 md:flex-row md:gap-6"
          >
            <CTAButton
              className="h-12 w-full border-0 bg-gradient-to-r from-primary-foreground to-primary-foreground/90 px-8 text-lg font-bold text-primary shadow-2xl md:w-auto"
              size="lg"
            />
            <HeroFeatures />
          </div>
        </div>
        <HeroImage />
      </section>
    </>
  );
};

const BackgroundDecorations = () => {
  return (
    <div
      data-testid="background-decorations"
      className="pointer-events-none absolute inset-0 z-[1]"
    >
      <div className="animate-float absolute top-20 right-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div
        className="animate-float absolute bottom-20 left-20 h-80 w-80 rounded-full bg-destructive/20 blur-3xl"
        style={{ animationDelay: "1s" }}
      />
    </div>
  );
};

const GradientOverlay = () => {
  return (
    <div
      data-testid="gradient-overlay"
      className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-primary/50 to-transparent"
    />
  );
};

const HeroBadge = () => {
  return <Badge variant="outline">Preview</Badge>;
};

interface HeroTitleProps {
  words: string[];
  duration?: number;
}

const HeroTitle = ({ words, duration = 2500 }: HeroTitleProps) => {
  return (
    <h1 className="text-5xl leading-[1.1] font-bold tracking-wide text-foreground md:text-7xl lg:text-8xl">
      <span className="inline-block">讓排球賽事紀錄</span>
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
  className = "object-contain object-right dark:invert",
}: HeroImageProps) => {
  return (
    <div
      data-testid="hero-image-container"
      className="pointer-events-none absolute top-0 right-0 h-full w-1/2 overflow-hidden"
      style={{ zIndex: 3 }}
    >
      <Image src={src} alt={alt} fill={true} className={className} priority />
    </div>
  );
};
