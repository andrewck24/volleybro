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
  entry: EntryView;
  players: GamePlayerView[];
  onClick?: () => void;
  className?: string;
}) => {
  // Shared guard for every caller (Preview, summary-drawer rows, etc.): a
  // nullish or type-less entry can reach here via the recording Preview
  // (entryIndex 0 -> previousEntry === entries[-1]) or an optimistic-mutate
  // rollback. Render nothing rather than dereferencing `.type` and crashing.
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
      // Uniform entry box: p-1 + rounded so every entry (committed rows and the
      // Preview) shares one shape. On the drawer's bg-card the rounding is only
      // visible once a background is applied -- e.g. the Preview's primary fill
      // when it becomes the send button.
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

// Minimum horizontal pointer travel (px) before a drag is recognized as a
// swipe rather than a tap -- mirrors panel/progress-bar.tsx's capture-on-
// intent gesture so the two don't diverge on feel.
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

/**
 * Interactive row wrapper around <Entry> (D12 group 5): left-swipe reveals
 * the row's action buttons, and tapping the row inline-expands it as an
 * accordion showing the entry's detail + actions, without leaving the list.
 *
 * ponytail: EntryView has no `recordedBy` field yet -- it's populated once
 * the sync-recording change adds authorship. The expanded content shows the
 * entry's existing score/type detail (via <Entry>) plus the composed
 * actions; there's no timestamp field on the model to show either.
 */
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
  // Optional controlled expand/swipe state: when the list owns these (single
  // open at a time -- tapping another row collapses this one) it passes them
  // in; standalone usage falls back to local state.
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
    // Any recognized swipe suppresses the tap the browser synthesizes on
    // pointerup, so a horizontal drag never also toggles the accordion --
    // mirrors panel/progress-bar.tsx. Only a left-swipe reveals the actions.
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

  // ponytail: delete/rollback are still computed by the last-entry rule, but
  // hidden until the sync-recording change wires their reducers -- rendering
  // inert buttons would be misleading.
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
