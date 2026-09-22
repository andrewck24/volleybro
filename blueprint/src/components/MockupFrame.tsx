"use client";

import {
  Component,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";

class MockupBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <p className="text-sm text-destructive">
        此設計稿在此 checkout 中無法顯示：{this.state.message}
      </p>
    );
  }
}

// A mockup is a React component pulled from the `blueprint-changes` store
// branch like any other Change page, so it can reference a component or a
// record shape this checkout no longer has. It cannot use the isolation a
// Change page's MDX body gets — that one calls the body as a plain function,
// and every mockup in the store holds hooks. An error boundary does catch a
// hook-bearing component, but not while the page is being prerendered: under
// `output: "export"` a throw during prerender is fatal to the route and
// `getDerivedStateFromError` never runs. So the mockup is rendered in the
// browser only, where the boundary works and a broken one costs its own page
// instead of the build.
export function MockupFrame({ Mockup }: { Mockup: ComponentType }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted)
    return <p className="text-fd-muted-foreground text-sm">載入設計稿…</p>;

  return (
    <MockupBoundary>
      <Mockup />
    </MockupBoundary>
  );
}
