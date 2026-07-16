"use client";

import { useLayoutEffect } from "react";

type BodyBackdropProps = {
  color: string;
};

/**
 * Sets the body backdrop used behind translucent system chrome in standalone
 * PWA contexts. Page and surface backgrounds still come from CSS tokens.
 */
export const BodyBackdrop = ({ color }: BodyBackdropProps) => {
  // Update before paint so standalone system chrome never exposes the prior route color.
  useLayoutEffect(() => {
    const previousHtml = document.documentElement.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    return () => {
      document.documentElement.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
    };
  }, [color]);

  return null;
};
