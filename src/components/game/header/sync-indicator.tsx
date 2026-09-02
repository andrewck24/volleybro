"use client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { usePendingWritesContext } from "@/hooks/use-pending-writes";
import {
  deriveSyncStatus,
  type SyncStatus,
} from "@/lib/features/game/pending-writes";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { RiCheckLine, RiErrorWarningLine, RiRefreshLine } from "react-icons/ri";

export const SYNCED_ACK_MS = 1500;

const STATUS_ICON: Record<SyncStatus, (className: string) => React.ReactNode> =
  {
    unwritable: (className) => <RiErrorWarningLine className={className} />,
    synced: (className) => (
      <RiCheckLine className={cn(className, "text-success")} />
    ),
    failed: (className) => <RiErrorWarningLine className={className} />,
    unsent: (className) => <RiErrorWarningLine className={className} />,
    syncing: (className) => <Spinner className={className} />,
  };

/**
 * Warning tone is for the two conditions the recorder has to act on, not for
 * work that is merely waiting: an entry that will never send, and a store that
 * will not keep what is unsent. Everything else is neutral.
 */
const isWarning = (status: SyncStatus): boolean =>
  status === "unwritable" || status === "failed";

/**
 * SyncIndicator is a pure projection of the pending-write queue, scoped to
 * this game -- it stores no status of its own. It sits in the header's
 * middle column, in normal flow, below the volleyball mark.
 */
export const SyncIndicator = ({ gameId }: { gameId: string }) => {
  const [open, setOpen] = useState(false);
  const { retry } = usePendingWritesContext();

  // Select the raw slice, not a filtered copy: `.filter` inside a selector
  // returns a new array reference on every action, tripping the store's
  // selector-identity warning even for actions this component doesn't care
  // about. `state.pendingWrites` itself is reference-stable unless this
  // slice's own reducer ran.
  const pendingWrites = useAppSelector((state) => state.pendingWrites);
  const pending = pendingWrites.pending.filter((p) => p.gameId === gameId);
  const status = deriveSyncStatus(pendingWrites, gameId);
  // The count reflects everything the queue holds for this game, not only
  // the items that have exhausted their backoff -- syncing shows the count
  // too, just wearing the syncing style rather than the unsynced one.
  const pendingCount = pending.length;

  const label = status === "synced" ? "已同步" : `${pendingCount} 筆未同步`;

  // Only a recovery is acknowledged: every rally passes through syncing,
  // and a check mark there would outlast the send it acknowledges. Both
  // conditions that stop reading as progress count as something to recover
  // from -- an entry that could not be sent, and a queue that gave up waiting.
  const [acknowledging, setAcknowledging] = useState(false);
  const previousStatus = useRef(status);
  useEffect(() => {
    const recovered =
      previousStatus.current === "failed" ||
      previousStatus.current === "unsent";
    previousStatus.current = status;
    if (!recovered || status !== "synced") return;
    setAcknowledging(true);
    const timer = setTimeout(() => setAcknowledging(false), SYNCED_ACK_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleRetry = () => {
    setOpen(false);
    void retry();
  };

  // The slot keeps its size so the volleyball mark above it never shifts.
  // `open` keeps the trigger mounted so a popover cannot outlive its anchor.
  if (status === "synced" && !acknowledging && !open) {
    return (
      <div
        data-testid="sync-indicator-slot"
        className="size-6 shrink-0"
        aria-hidden="true"
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative flex size-6 items-center justify-center rounded-md text-muted-foreground",
            // 44px touch target, 24px mark: the pseudo-element takes no
            // layout space, so the popover still anchors to the visible box.
            "after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            isWarning(status) && "text-warning ring-1 ring-warning/30",
          )}
        >
          {STATUS_ICON[status]("size-4")}
          {isWarning(status) && (
            <span className="absolute top-0 right-0 flex size-3 items-center justify-center rounded-full bg-warning text-[7px] font-bold text-warning-foreground">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto rounded-md p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex h-8 items-center gap-2 overflow-hidden px-2.5 text-xs whitespace-nowrap">
          {/* `contents` keeps this span out of layout -- it exists only so
              the warning color (explicit here, not inherited from the
              trigger button) is a queryable, testable element. */}
          <span
            data-testid="sync-popover-icon"
            className={cn("contents", isWarning(status) && "text-warning")}
          >
            {STATUS_ICON[status]("size-4 shrink-0")}
          </span>
          <span className={isWarning(status) ? "text-warning" : undefined}>
            {label}
          </span>
          {status === "unsent" && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ring-1 ring-border"
            >
              <RiRefreshLine className="size-3 shrink-0" />
              重試
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
