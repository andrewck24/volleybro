"use client";

import { useLayoutEffect } from "react";

type StatusBarColorProps = {
  color: string;
};

/** Colours the opaque standalone status bar from a route's surface token. See ADR-0068. */
export const StatusBarColor = ({ color }: StatusBarColorProps) => {
  // Update before paint so standalone system chrome never exposes the prior route color.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previousHtml = html.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    html.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    // Next.js re-renders the viewport's theme-color metas on navigation, so
    // own a separate one; the first matching theme-color in <head> wins.
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.prepend(meta);

    // theme-color takes a literal colour, so read what the token resolves to —
    // from <html>, because body's transition-colors reports mid-fade values.
    const writeThemeColor = () => {
      meta.content = getComputedStyle(html).backgroundColor;
    };
    writeThemeColor();

    const observer = new MutationObserver(writeThemeColor);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      meta.remove();
      html.style.backgroundColor = previousHtml;
      document.body.style.backgroundColor = previousBody;
    };
  }, [color]);

  return null;
};
