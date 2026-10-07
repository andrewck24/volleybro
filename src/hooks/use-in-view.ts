"use client";
import { useEffect, useState, type RefObject } from "react";

type InViewOptions = {
  rootMargin?: string;
  /** stop observing, and stay `true`, after the first intersection */
  once?: boolean;
  /** the answer before the observer first reports */
  initial?: boolean;
};

/** Whether the ref's element intersects the viewport. */
export const useInView = (
  ref: RefObject<Element | null>,
  { rootMargin, once = false, initial = false }: InViewOptions = {},
) => {
  const [isInView, setIsInView] = useState(initial);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry!.isIntersecting);
        if (once && entry!.isIntersecting) observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return isInView;
};
