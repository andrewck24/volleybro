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

const STATUS_ICON: Record<SyncStatus, (className: string) => React.ReactNode> =
  {
    unwritable: (className) => <RiErrorWarningLine className={className} />,
    synced: (className) => (
      <RiCheckLine className={cn(className, "text-success")} />
    ),
    failed: (className) => <RiErrorWarningLine className={className} />,
    // Cloud, not wifi: the wifi bars on the recorder's phone can be full
    // while nothing reaches the server, and an icon arguing with the status
    // bar reads as the app being wrong rather than the connection.
    unsent: (className) => <RiCloudOffLine className={className} />,
    // Test id for the same reason the popover icon has one: "is it still
    // spinning" is the assertion this Change exists to make, and a spinner
    // has no role or text to query it by.
    syncing: (className) => (
      <Spinner className={className} data-testid="sync-spinner" />
    ),
  };

/**
 * Warning tone is for the two conditions the recorder has to act on, not for
 * work that is merely waiting: an entry that will never send, and a store that
 * will not keep what is unsent. Everything else is neutral.
 */
const isWarning = (status: SyncStatus): boolean =>
  status === "unwritable" || status === "failed";

/** The count belongs to the conditions where the queue has stopped draining. */
const showsCount = (status: SyncStatus): boolean =>
  status === "failed" || status === "unsent";

/**
 * What the indicator says, as a heading and the sentence under it. The
 * sentence is the point: the queue being unsent is not news to anyone
 * watching a spinner, but whether the rallies are safe is, and nothing in
 * this component said so before.
 *
 * `online` is read only inside the unsent case, and only to choose between
 * two sentences that are both true. `false` is the one answer that signal
 * can be trusted on, so it can promise an automatic send; `true` promises
 * only continued attempts, because what is actually known there is that the
 * writes are failing, which came from the queue and not from the browser.
 */
const copyFor = (
  status: SyncStatus,
  count: number,
  online: boolean,
): { title: string; detail?: string } => {
  switch (status) {
    case "unwritable":
      return {
        title: "無法保存到本機",
        detail: "關閉 app 會遺失未送出的紀錄，請保持開啟直到同步完成",
      };
    case "failed":
      return {
        title: `${count} 筆送不出去`,
        detail: "重試無法解決，請在紀錄列表中處理",
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

  const { title, detail } = copyFor(status, pendingCount, online);
  // Screen reader users have no "open it to see more" step, so the trigger
  // carries the whole sentence rather than only its heading.
  const label = detail ? `${title}，${detail}` : title;

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

  // Pressing retry changes no queue state -- attempts is left alone so a
  // failure exhausts the table again immediately -- so without a pending
  // state of its own the button looks like it did nothing. Kept local: a
  // global in-flight signal would flash the spinner on every background
  // retry too, which is exactly what the failure threshold exists to stop.
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
            isWarning(status) && "text-warning ring-1 ring-warning/30",
          )}
        >
          {STATUS_ICON[status]("size-4")}
          {showsCount(status) && (
            <span
              className={cn(
                "absolute top-0 right-0 flex size-3 items-center justify-center rounded-full text-[7px] font-bold",
                isWarning(status)
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
        <div className="flex flex-col gap-1 px-2.5 py-2 text-xs">
          <div className="flex items-center gap-2">
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
              {title}
            </span>
          </div>
          {detail && (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {detail}
            </p>
          )}
          {/* Offline the button is certain to fail, and the recorder already
              knows the network is off -- offering it would only suggest that
              pressing it might help. Online it is the only recourse there is:
              nothing detects the server coming back, because no `online`
              event fires when the device never left the network. */}
          {status === "unsent" && online && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="mt-1 inline-flex shrink-0 items-center justify-center gap-1 self-start rounded px-1.5 py-0.5 text-[11px] ring-1 ring-border disabled:opacity-60"
            >
              {retrying ? (
                <Spinner className="size-3 shrink-0" />
              ) : (
                <RiRefreshLine className="size-3 shrink-0" />
              )}
              重試
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
