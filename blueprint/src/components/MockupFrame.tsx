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
      <p className="text-sm text-error-text">
        此設計稿在此 checkout 中無法顯示：{this.state.message}
      </p>
    );
  }
}

function MountedMockup({ Mockup }: { Mockup: ComponentType }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted)
    return <p className="text-fd-muted-foreground text-sm">載入設計稿…</p>;

  return (
    <MockupBoundary>
      <span hidden data-blueprint-mockup-mounted="true" />
      <Mockup />
    </MockupBoundary>
  );
}

export function MockupFrame({ Mockup }: { Mockup?: ComponentType }) {
  if (!Mockup)
    return <p className="text-fd-muted-foreground text-sm">載入設計稿…</p>;
  return <MountedMockup Mockup={Mockup} />;
}
