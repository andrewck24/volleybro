"use client";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { AnimatePresence, LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useState } from "react";

export const FlipWords = ({
  words,
  duration = 2000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(words[0] || "");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const mounted = useHydrated();

  const startAnimation = useCallback(() => {
    if (words.length === 0) return;

    const currentIndex = words.indexOf(currentWord);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % words.length;
    // nextIndex is modulo words.length, and length is non-zero here
    const word = words[nextIndex]!;
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (!mounted || words.length === 0) return;

    if (!isAnimating) {
      const timeoutId = setTimeout(() => {
        startAnimation();
      }, duration);

      return () => clearTimeout(timeoutId);
    }
  }, [isAnimating, duration, startAnimation, mounted, words.length]);

  // Guard against empty words array - after hooks are called
  if (words.length === 0) return null;

  // SSR placeholder - show first word without animation
  if (!mounted) {
    return (
      <div
        className={cn(
          "relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
          className,
        )}
      >
        {words[0]!.split(" ").map((word, wordIndex) => (
          <span
            key={word + wordIndex}
            className="inline-block whitespace-nowrap"
          >
            {word}
            <span className="inline-block">&nbsp;</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence
        onExitComplete={() => {
          setIsAnimating(false);
        }}
      >
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
          }}
          exit={{
            opacity: 0,
            y: 0,
            filter: "blur(8px)",
            position: "absolute",
          }}
          className={cn(
            "relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
            className,
          )}
          key={currentWord}
        >
          {currentWord.split(" ").map((word, wordIndex) => (
            <m.span
              key={word + wordIndex}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: wordIndex * 0.1,
                duration: 0.3,
              }}
              className="inline-block whitespace-nowrap"
            >
              {word}
              <span className="inline-block">&nbsp;</span>
            </m.span>
          ))}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
};

export const FlipLetters = ({
  words,
  duration = 2000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(words[0] || "");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const mounted = useHydrated();

  const startAnimation = useCallback(() => {
    if (words.length === 0) return;

    const currentIndex = words.indexOf(currentWord);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % words.length;
    // nextIndex is modulo words.length, and length is non-zero here
    const word = words[nextIndex]!;
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (!mounted || words.length === 0) return;

    if (!isAnimating) {
      const timeoutId = setTimeout(() => {
        startAnimation();
      }, duration);

      return () => clearTimeout(timeoutId);
    }
  }, [isAnimating, duration, startAnimation, mounted, words.length]);

  // Guard against empty words array - after hooks are called
  if (words.length === 0) return null;

  // SSR placeholder - show first word without animation
  if (!mounted) {
    return (
      <div
        className={cn(
          "relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
          className,
        )}
      >
        {words[0]!.split(" ").map((word, wordIndex) => (
          <span
            key={word + wordIndex}
            className="inline-block whitespace-nowrap"
          >
            {word.split("").map((letter, letterIndex) => (
              <span key={word + letterIndex} className="inline-block">
                {letter}
              </span>
            ))}
            <span className="inline-block">&nbsp;</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence
        onExitComplete={() => {
          setIsAnimating(false);
        }}
      >
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
          }}
          exit={{
            opacity: 0,
            y: 0,
            filter: "blur(8px)",
            position: "absolute",
          }}
          className={cn(
            "relative z-10 inline-block text-left text-neutral-900 dark:text-neutral-100",
            className,
          )}
          key={currentWord}
        >
          {currentWord.split(" ").map((word, wordIndex) => (
            <m.span
              key={word + wordIndex}
              initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                delay: wordIndex * 0.1,
                duration: 0.3,
              }}
              className="inline-block whitespace-nowrap"
            >
              {word.split("").map((letter, letterIndex) => (
                <m.span
                  key={word + letterIndex}
                  initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    delay: wordIndex * 0.1 + letterIndex * 0.05,
                    duration: 0.25,
                  }}
                  className="inline-block"
                >
                  {letter}
                </m.span>
              ))}
              <span className="inline-block">&nbsp;</span>
            </m.span>
          ))}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
};
