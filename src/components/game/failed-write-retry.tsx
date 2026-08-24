import { cn } from "@/lib/utils";

/** Floating retry affordance overlaid on an entry whose write exhausted its attempts. */
export const FailedWriteRetry = ({
  onRetry,
  testId,
  interactive = false,
}: {
  onRetry?: () => void;
  testId?: string;
  /** Wraps a row where sibling content outside the button stays clickable. */
  interactive?: boolean;
}) => (
  <span
    className={cn(
      "absolute inset-0 flex items-center justify-end pr-1.5",
      interactive && "pointer-events-none",
    )}
  >
    <button
      type="button"
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onRetry?.();
      }}
      className={cn(
        "rounded px-2 py-0.5 text-xs text-destructive ring-1 ring-destructive/50",
        interactive && "pointer-events-auto",
      )}
    >
      重試
    </button>
  </span>
);
