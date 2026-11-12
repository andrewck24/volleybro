"use client";

import { useLayoutEffect } from "react";

type StatusBarColorProps = {
  color: string;
};

export const StatusBarColor = ({ color }: StatusBarColorProps) => {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const previousHtml = html.style.backgroundColor;
    const previousBody = document.body.style.backgroundColor;
    html.style.backgroundColor = color;
    document.body.style.backgroundColor = color;

    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.prepend(meta);

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
