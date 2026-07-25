import {
  composeEntryActions,
  type EntryAction,
} from "@/components/game/entry/last-entry-rule";
import { Rally } from "@/components/game/entry/rally";
import { Substitution } from "@/components/game/entry/substitution";
import { EntryType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { cn } from "@/lib/utils";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const Entry = ({
  entry,
  players,
  onClick,
  className,
}: {
  entry?: EntryView;
  players: GamePlayerView[];
  onClick?: () => void;
  className?: string;
}) => {
  if (!entry?.type) return null;

  return (
    <EntryContainer onClick={onClick} className={className}>
      {entry.type === EntryType.RALLY ? (
        <Rally data={entry} players={players} />
      ) : entry.type === EntryType.SUBSTITUTION ? (
        <Substitution data={entry} players={players} />
      ) : null}
    </EntryContainer>
  );
};

export const EntryContainer = ({
  onClick,
  className,
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "flex w-full flex-none basis-8 flex-row items-center justify-start gap-1 rounded-md p-1",
      className,
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

export const EntryText = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <p
    className={cn(
      "flex h-6 flex-1 flex-row items-center gap-1 px-1 text-[1.375rem]",
      "max-w-[calc(100%-9rem)] border-l-2",
      "stroke-[3px] [&>svg]:size-6",
      className,
    )}
  >
    {children}
  </p>
);

export const EntryPlayerNumber = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <span className="flex size-6 items-center justify-center text-[1.375rem] font-semibold">
    {children}
  </span>
);

// keep in sync with panel/progress-bar.tsx
const SWIPE_THRESHOLD_PX = 40;

const actionLabel: Record<EntryAction, string> = {
  edit: "編輯",
  delete: "刪除",
  rollbackToHere: "回溯並重新記錄至此",
};

const EntryRowActions = ({
  actions,
  onEdit,
  onDelete,
  onRollbackToHere,
}: {
  actions: EntryAction[];
  onEdit?: () => void;
  onDelete?: () => void;
  onRollbackToHere?: () => void;
}) => (
  <>
    {actions.map((action) => (
      <button
        key={action}
        type="button"
        data-testid={`entry-action-${action}`}
        onClick={(e) => {
          e.stopPropagation();
          if (action === "edit") onEdit?.();
          else if (action === "delete") onDelete?.();
          else onRollbackToHere?.();
        }}
        className="shrink-0 rounded px-2 py-1 text-sm text-muted-foreground"
      >
        {actionLabel[action]}
      </button>
    ))}
  </>
);

export const EntryRow = ({
  entry,
  players,
  isLatest,
  onEdit,
  onDelete,
  onRollbackToHere,
  expanded: expandedProp,
  onToggleExpand,
  swipeRevealed: swipeRevealedProp,
  onSwipeReveal,
  className,
}: {
  entry: EntryView;
  players: GamePlayerView[];
  isLatest: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRollbackToHere?: () => void;
  // optional controlled state; falls back to local when uncontrolled
  expanded?: boolean;
  onToggleExpand?: () => void;
  swipeRevealed?: boolean;
  onSwipeReveal?: (revealed: boolean) => void;
  className?: string;
}) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [localSwipeRevealed, setLocalSwipeRevealed] = useState(false);
  const expanded = expandedProp ?? localExpanded;
  const swipeRevealed = swipeRevealedProp ?? localSwipeRevealed;
  const toggleExpand = onToggleExpand ?? (() => setLocalExpanded((v) => !v));
  const revealSwipe = onSwipeReveal ?? setLocalSwipeRevealed;

  const dragRef = useRef<{ startX: number; triggered: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, triggered: false };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.triggered) return;

    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;

    drag.triggered = true;
    // suppress the synthetic tap after a swipe so it doesn't also toggle expand
    suppressClickRef.current = true;
    if (dx < 0) {
      revealSwipe(true);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const handleRowClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    toggleExpand();
  };

  // only edit is wired yet; delete/rollback await sync-recording reducers
  const actions = composeEntryActions(isLatest).filter((a) => a === "edit");

  return (
    <div
      data-testid="entry-row"
      data-swipe-revealed={swipeRevealed}
      data-expanded={expanded}
      className={cn("flex w-full flex-col", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClick={handleRowClick}
    >
      <div className="flex w-full flex-row items-center">
        <Entry entry={entry} players={players} className="flex-1" />
        {swipeRevealed && (
          <div
            data-testid="entry-row-swipe-actions"
            className="flex flex-none flex-row gap-1"
          >
            <EntryRowActions
              actions={actions}
              onEdit={onEdit}
              onDelete={onDelete}
              onRollbackToHere={onRollbackToHere}
            />
          </div>
        )}
      </div>
      <div
        data-testid="entry-row-expanded"
        data-open={expanded}
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-row flex-wrap items-center gap-2 py-2">
            <EntryRowActions
              actions={actions}
              onEdit={onEdit}
              onDelete={onDelete}
              onRollbackToHere={onRollbackToHere}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
