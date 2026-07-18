import type { ReactElement, ReactNode } from "react";

export type SvgLikeElement = ReactElement<{
  children?: ReactNode;
  viewBox?: string;
  transform?: string;
  fill?: string;
  d?: string;
  width?: number;
  height?: number;
}>;

/** Collect every element of a given `type` (e.g. "svg", "path", "g") from the tree. */
export function collect(
  node: ReactNode,
  type: string,
  found: SvgLikeElement[] = [],
): SvgLikeElement[] {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => collect(child, type, found));
    return found;
  }
  const el = node as SvgLikeElement;
  if (el.type === type) found.push(el);
  if (el.props?.children) collect(el.props.children, type, found);
  return found;
}
