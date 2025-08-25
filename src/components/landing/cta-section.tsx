"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";

export const CTASection = () => {
  return (
    <LazyMotion features={domAnimation} strict>
      <m.section
        data-testid="cta-section"
        className="relative mx-6 overflow-hidden rounded-lg bg-card px-4 py-24 text-center lg:mx-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <CTABackgroundImage />
        <CTABackgroundEffects />

        <div
          data-testid="cta-main-container"
          className="relative z-20 container mx-auto max-w-4xl text-center"
        >
          <CTAContent />
        </div>
      </m.section>
    </LazyMotion>
  );
};

const CTABackgroundImage = () => {
  return (
    <Image
      data-testid="cta-background-image"
      src="/landing/hero.svg"
      alt="VolleyBro App Interface"
      fill
      className="object-contain object-center opacity-10 dark:invert"
    />
  );
};

const CTABackgroundEffects = () => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    // Static background alternative - preserves visual effect without animation
    return (
      <div
        data-testid="cta-background-effects"
        className="pointer-events-none absolute inset-0 z-10 size-full"
      >
        <div
          data-testid="cta-floating-1-static"
          className="absolute top-10 left-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          data-testid="cta-floating-2-static"
          className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-secondary/30 blur-3xl"
        />
        <div
          data-testid="cta-floating-3-static"
          className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-2xl"
        />
      </div>
    );
  }

  // 動畫背景效果
  return (
    <div
      data-testid="cta-background-effects"
      className="pointer-events-none absolute inset-0 z-10 size-full"
    >
      <m.div
        data-testid="cta-floating-1"
        className="absolute top-10 left-10 h-64 w-64 rounded-full bg-primary/30 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <m.div
        data-testid="cta-floating-2"
        className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-secondary/40 blur-3xl"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.7, 0.4],
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5,
        }}
      />
      <m.div
        data-testid="cta-floating-3"
        className="absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/10 blur-2xl"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 10, 0],
          y: [0, -10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
};

const CTAContent = () => {
  return (
    <m.div
      data-testid="cta-content-container"
      className="flex flex-col items-center gap-12"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      viewport={{ once: true }}
    >
      <h2 className="max-w-3xl text-3xl leading-tight font-bold text-foreground md:text-4xl lg:text-5xl">
        準備好革新你的排球管理方式了嗎？
      </h2>
      <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
        立即體驗 VolleyBro 的強大功能，讓數據驅動你的每一個戰術決策
      </p>
      <CTAButton
        size="lg"
        className="hover:shadow-3xl h-14 px-12 py-4 text-xl font-bold shadow-2xl transition-shadow"
        data-testid="cta-section-button"
      >
        立即開始使用
      </CTAButton>
    </m.div>
  );
};
