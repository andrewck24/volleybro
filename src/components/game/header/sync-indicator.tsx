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
  unsent: {
    icon: (className) => <RiCloudOffLine className={className} />,
    warning: false,
    showsCount: true,
  },
  syncing: {
    icon: (className) => (
      <Spinner className={className} data-testid="sync-spinner" />
    ),
    warning: false,
    showsCount: false,
  },
};

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

export const SyncIndicator = ({ gameId }: { gameId: string }) => {
  const [open, setOpen] = useState(false);
  const { retry } = usePendingWritesContext();
  const online = useIsOnline();

  const pendingWrites = useAppSelector((state) => state.pendingWrites);
  const pending = pendingWrites.pending.filter((p) => p.gameId === gameId);
  const status = deriveSyncStatus(pendingWrites, gameId);
  const pendingCount = pending.length;

  const { icon, warning, showsCount } = STATUS_STYLE[status];
  const othersPending = pendingWrites.pending.some((p) => p.gameId !== gameId);
  const { title, detail } = copyFor(
    status,
    pendingCount,
    online,
    othersPending,
  );
  const label = detail ? `${title}，${detail}` : title;

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

  const [retrying, setRetrying] = useState(false);
  const handleRetry = () => {
    setRetrying(true);
    void retry().finally(() => {
      setRetrying(false);
      setOpen(false);
    });
  };

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
            "touch-target flex size-6 items-center justify-center rounded-md text-muted-foreground",
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

          {status === "unsent" && online && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="mt-1 inline-flex h-(--control-size) shrink-0 items-center justify-center gap-1 self-start rounded-md px-3 text-sm ring-1 ring-border disabled:opacity-60"
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
