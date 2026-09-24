import { cn } from "@/lib/utils";

/** Floating retry affordance overlaid on an entry whose write exhausted its attempts. */
export const FailedWriteRetry = ({
  onRetry,
  testId,
  passThroughPointerEvents = false,
}: {
  onRetry?: () => void;
  testId?: string;
  /** Lets clicks on the empty overlay area reach the row underneath. */
  passThroughPointerEvents?: boolean;
}) => (
  <span
    className={cn(
      "absolute inset-0 flex items-center justify-end pr-1.5",
      passThroughPointerEvents && "pointer-events-none",
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
        passThroughPointerEvents && "pointer-events-auto",
      )}
    >
      重試
    </button>
  </span>
);
