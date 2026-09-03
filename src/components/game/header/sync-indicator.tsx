"use client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useIsOnline } from "@/hooks/use-is-online";
import { usePendingWritesContext } from "@/hooks/use-pending-writes";
import {
  deriveSyncStatus,
  type SyncStatus,
} from "@/lib/features/game/pending-writes";
import { useAppSelector } from "@/lib/redux/hooks";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import {
  RiCheckLine,
  RiCloudOffLine,
  RiErrorWarningLine,
  RiRefreshLine,
} from "react-icons/ri";

export const SYNCED_ACK_MS = 1500;

/**
 * One table rather than a switch per question, so a new condition cannot be
 * added to some of them and not others. Warning is for the two conditions the
 * recorder has to act on; waiting is not one of them.
 */
const STATUS_STYLE: Record<
  SyncStatus,
  {
    icon: (className: string) => React.ReactNode;
    warning: boolean;
    showsCount: boolean;
  }
> = {
  unwritable: {
    icon: (className) => <RiErrorWarningLine className={className} />,
    warning: true,
    showsCount: false,
  },
  synced: {
    icon: (className) => (
      <RiCheckLine className={cn(className, "text-success")} />
    ),
    warning: false,
    showsCount: false,
  },
  failed: {
    icon: (className) => <RiErrorWarningLine className={className} />,
    warning: true,
    showsCount: true,
  },
  // Cloud, not wifi: the phone's bars can be full while nothing gets through.
  unsent: {
    icon: (className) => <RiCloudOffLine className={className} />,
    warning: false,
    showsCount: true,
  },
  syncing: {
    // Test id because a spinner has no role or text to query it by.
    icon: (className) => (
      <Spinner className={className} data-testid="sync-spinner" />
    ),
    warning: false,
    showsCount: false,
  },
};

/**
 * `online` is read only in the unsent case, and only to choose between two
 * sentences that are both true: `false` can promise an automatic send, `true`
 * can promise only further attempts. `othersPending` likewise only names the
 * way out of a full store when there is one to name.
 */
const copyFor = (
  status: SyncStatus,
  count: number,
  online: boolean,
  othersPending: boolean,
): { title: string; detail?: string } => {
  switch (status) {
    case "unwritable":
      return {
        title: "本機空間已滿",
        detail: othersPending
          ? "請回到其他尚未同步的比賽完成同步，以釋出空間"
          : "未送出的紀錄無法保存，請清除瀏覽器的網站資料或改用其他裝置",
      };
    case "failed":
      return {
        title: `${count} 筆送不出去`,
        detail: "請在紀錄列表中查看這幾筆",
      };
    case "unsent":
      return online
        ? {
            title: "連線有問題",
            detail: `${count} 筆已保存，會持續嘗試送出`,
          }
        : {
            title: "離線中",
            detail: `${count} 筆已保存，恢復連線後自動送出`,
          };
    case "syncing":
      return { title: "同步中" };
    case "synced":
      return { title: "已同步" };
  }
};

/**
 * SyncIndicator projects the pending-write queue for one game, plus whether
 * this device can keep what is unsent. It stores no status of its own. It sits
 * in the header's middle column, in normal flow, below the volleyball mark.
 */
export const SyncIndicator = ({ gameId }: { gameId: string }) => {
  const [open, setOpen] = useState(false);
  const { retry } = usePendingWritesContext();
  const online = useIsOnline();

  // Select the raw slice, not a filtered copy: `.filter` inside a selector
  // returns a new array reference on every action, tripping the store's
  // selector-identity warning even for actions this component doesn't care
  // about. `state.pendingWrites` itself is reference-stable unless this
  // slice's own reducer ran.
  const pendingWrites = useAppSelector((state) => state.pendingWrites);
  const pending = pendingWrites.pending.filter((p) => p.gameId === gameId);
  const status = deriveSyncStatus(pendingWrites, gameId);
  const pendingCount = pending.length;

  const { icon, warning, showsCount } = STATUS_STYLE[status];
  // The queue is the only thing this app puts in localStorage, and it is not
  // scoped per game while sending is -- so a full store is usually unsent
  // rallies from a game nobody has reopened. Only say so when there are some.
  const othersPending = pendingWrites.pending.some((p) => p.gameId !== gameId);
  const { title, detail } = copyFor(
    status,
    pendingCount,
    online,
    othersPending,
  );
  // No "open it to see more" step for a screen reader, so carry the sentence.
  const label = detail ? `${title}，${detail}` : title;

  // Only a recovery: every rally passes through syncing, and a check mark
  // there would outlast the send it acknowledges.
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

  // Retry changes no queue state, so the button needs its own pending mark.
  // Local, not global: a shared in-flight signal would flash the spinner on
  // every background retry too.
  const [retrying, setRetrying] = useState(false);
  const handleRetry = () => {
    setRetrying(true);
    void retry().finally(() => {
      setRetrying(false);
      setOpen(false);
    });
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
            warning && "text-warning ring-1 ring-warning/30",
          )}
        >
          {icon("size-4")}
          {showsCount && (
            <span
              className={cn(
                "absolute top-0 right-0 flex size-3 items-center justify-center rounded-full text-[7px] font-bold",
                warning
                  ? "bg-warning text-warning-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        className="w-auto max-w-[16rem] rounded-md p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1.5 px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            {/* `contents` keeps this span out of layout -- it exists only so
                the warning color (explicit here, not inherited from the
                trigger button) is a queryable, testable element. */}
            <span
              data-testid="sync-popover-icon"
              className={cn("contents", warning && "text-warning")}
            >
              {icon("size-4 shrink-0")}
            </span>
            <span className={warning ? "text-warning" : undefined}>
              {title}
            </span>
          </div>
          {detail && (
            <p className="text-xs leading-snug text-muted-foreground">
              {detail}
            </p>
          )}
          {/* Offline it can only fail; online it is the only recourse, since
              no `online` event fires for a device that never left the
              network. */}
          {status === "unsent" && online && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="mt-1 inline-flex h-9 shrink-0 items-center justify-center gap-1 self-start rounded-md px-3 text-sm ring-1 ring-border disabled:opacity-60"
            >
              {retrying ? (
                <Spinner className="size-3.5 shrink-0" />
              ) : (
                <RiRefreshLine className="size-3.5 shrink-0" />
              )}
              重試
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
