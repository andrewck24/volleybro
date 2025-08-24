"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

export const FlipWords = ({
  words,
  duration = 2000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) => {
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isAnimating) {
      const timeoutId = setTimeout(() => {
        startAnimation();
      }, duration);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAnimating, duration, startAnimation, mounted]);

  // SSR placeholder - show first word without animation
  if (!mounted) {
    return (
      <div
        className={cn(
          "z-10 inline-block relative text-left text-neutral-900 dark:text-neutral-100",
          className
        )}
      >
        {words[0].split(" ").map((word, wordIndex) => (
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
            "z-10 inline-block relative text-left text-neutral-900 dark:text-neutral-100",
            className
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
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  const startAnimation = useCallback(() => {
    const word = words[words.indexOf(currentWord) + 1] || words[0];
    setCurrentWord(word);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isAnimating) {
      const timeoutId = setTimeout(() => {
        startAnimation();
      }, duration);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAnimating, duration, startAnimation, mounted]);

  // SSR placeholder - show first word without animation
  if (!mounted) {
    return (
      <div
        className={cn(
          "z-10 inline-block relative text-left text-neutral-900 dark:text-neutral-100",
          className
        )}
      >
        {words[0].split(" ").map((word, wordIndex) => (
          <span
            key={word + wordIndex}
            className="inline-block whitespace-nowrap"
          >
            {word.split("").map((letter, letterIndex) => (
              <span
                key={word + letterIndex}
                className="inline-block"
              >
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
            "z-10 inline-block relative text-left text-neutral-900 dark:text-neutral-100",
            className
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
