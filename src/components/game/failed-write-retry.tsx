import { cn } from "@/lib/utils";

export const FailedWriteRetry = ({
  onRetry,
  testId,
  passThroughPointerEvents = false,
}: {
  onRetry?: () => void;
  testId?: string;
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
        "touch-target rounded px-2 py-0.5 text-xs text-error-text ring-1 ring-error/50",
        passThroughPointerEvents && "pointer-events-auto",
      )}
    >
      重試
    </button>
  </span>
);
