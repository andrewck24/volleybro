"use client";
import { useRef } from "react";
import { Header } from "@/components/landing/header";
import { Badge } from "@/components/ui/badge";
import { FlipWords } from "@/components/ui/flip-words";
import { CTAButton } from "@/components/landing/cta-button";
import { SquaresStack } from "@/components/landing/animation";

export const Hero = () => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const words: string[] = ["簡單", "快速", "一目瞭然"];
  return (
    <>
      <Header observerRef={observerRef} />
      <section className="flex flex-col items-start justify-start w-full h-[calc(100vh-3.25rem)] pt-10 md:px-[5%] bg-primary">
        <div className="flex flex-col items-start justify-center flex-1 size-full gap-4 px-4">
          <Badge variant="destructive">Beta</Badge>
          <h1 className="text-5xl font-medium leading-[1.1] tracking-wider text-white text-nowrap md:text-7xl">
            讓排球賽事紀錄
            <br />
            更加
            <FlipWords words={words} className="text-primary-foreground" />
          </h1>
          <div
            ref={observerRef}
            className="flex flex-col items-start justify-start w-full gap-2 py-6 md:flex-row"
          >
            <CTAButton
              className="w-full h-10 px-4 text-lg md:w-auto"
              size="lg"
            />
          </div>
        </div>
        <SquaresStack />
      </section>
    </>
  );
};
