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

/**
 * How long the check mark stays up after a queue recovers from exhausted.
 * The acknowledgement is the point -- a retry that silently vanishes reads
 * as the app having dropped the request rather than completed it.
 */
export const SYNCED_ACK_MS = 1500;

const STATUS_ICON: Record<SyncStatus, (className: string) => React.ReactNode> =
  {
    synced: (className) => (
      <RiCheckLine className={cn(className, "text-success")} />
    ),
    syncing: (className) => <Spinner className={className} />,
    unsynced: (className) => <RiErrorWarningLine className={className} />,
  };

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

  // A queue that recovers from exhausted gets an acknowledgement; a routine
  // send does not, since every rally would otherwise leave a check mark on
  // screen for longer than the send itself took.
  const [acknowledging, setAcknowledging] = useState(false);
  const previousStatus = useRef(status);
  useEffect(() => {
    const recovered = previousStatus.current === "unsynced";
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

  // Nothing to report reports nothing. The slot keeps its 24px either way:
  // the middle column centres its children, so an indicator that came and
  // went would drag the volleyball mark up and down with it. `open` holds
  // the trigger mounted so a popover cannot outlive its own anchor.
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
            // The touch target is 44px; the mark stays 24px. A transparent
            // pseudo-element takes no layout space and leaves the border box
            // -- and so the popover's anchor -- at the visible size. The
            // header's middle column has 20px of free width either side, so
            // only the 16px of extra height is borrowed: 10px over the
            // volleyball mark, 6px past the header's edge. Both regions
            // otherwise open the overview, which the scores also open.
            "after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            status === "unsynced" && "text-warning ring-1 ring-warning/30",
          )}
        >
          {STATUS_ICON[status]("size-4")}
          {status === "unsynced" && (
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
            className={cn("contents", status === "unsynced" && "text-warning")}
          >
            {STATUS_ICON[status]("size-4 shrink-0")}
          </span>
          <span className={status === "unsynced" ? "text-warning" : undefined}>
            {label}
          </span>
          {status === "unsynced" && (
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
