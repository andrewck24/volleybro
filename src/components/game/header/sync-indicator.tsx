"use client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePendingWrites } from "@/hooks/use-pending-writes";
import { deriveSyncStatus } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { RiCheckLine, RiErrorWarningLine, RiRefreshLine } from "react-icons/ri";

/**
 * D4: SyncIndicator is a pure projection of the pending-write queue, scoped
 * to this game -- it stores no status of its own. It sits in the header's
 * middle column, in normal flow, below the volleyball mark.
 */
export const SyncIndicator = ({ gameId }: { gameId: string }) => {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const currentSetIndex = useAppSelector((state) => state.game.setIndex);
  const { flush } = usePendingWrites(gameId, currentSetIndex);

  const pending = useAppSelector((state) =>
    state.pendingWrites.pending.filter((p) => p.gameId === gameId),
  );
  const flushing = useAppSelector((state) => state.pendingWrites.flushing);
  const status = deriveSyncStatus({ pending, flushing });
  const unsyncedCount = pending.filter((p) => p.nextAttemptAt === null).length;

  const label =
    status === "synced"
      ? "已同步"
      : status === "syncing"
        ? "同步中"
        : `${unsyncedCount} 筆未同步`;

  const handleRetry = () => {
    setOpen(false);
    dispatch(pendingWritesActions.retryRequested());
    void flush();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative flex size-6 items-center justify-center rounded-md text-muted-foreground",
            status === "unsynced" && "text-warning ring-1 ring-warning/30",
          )}
        >
          {status === "synced" && (
            <RiCheckLine className="size-4 text-success" />
          )}
          {status === "syncing" && (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {status === "unsynced" && (
            <>
              <RiErrorWarningLine className="size-4" />
              <span className="absolute top-0 right-0 flex size-3 items-center justify-center rounded-full bg-warning text-[7px] font-bold text-warning-foreground">
                {unsyncedCount}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto rounded-md p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex h-8 items-center gap-2 overflow-hidden px-2.5 text-xs whitespace-nowrap">
          {status === "synced" && (
            <>
              <RiCheckLine className="size-4 shrink-0 text-success" />
              已同步
            </>
          )}
          {status === "syncing" && (
            <>
              <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
              同步中
            </>
          )}
          {status === "unsynced" && (
            <>
              <RiErrorWarningLine className="size-4 shrink-0 text-warning" />
              <span className="text-warning">{unsyncedCount} 筆未同步</span>
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ring-1 ring-border"
              >
                <RiRefreshLine className="size-3 shrink-0" />
                重試
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
