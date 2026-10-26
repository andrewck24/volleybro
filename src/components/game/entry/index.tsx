import {
  composeEntryActions,
  type EntryAction,
} from "@/components/game/entry/last-entry-rule";
import { Rally } from "@/components/game/entry/rally";
import { Substitution } from "@/components/game/entry/substitution";
import { FailedWriteRetry } from "@/components/game/failed-write-retry";
import { EntryType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
        className="touch-target shrink-0 rounded px-2 py-1 text-sm text-muted-foreground"
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
  failed,
  onRetry,
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
  // hasFailedWrite: matched to the queue by entry id. Not a toast -- it
  // persists until the entry leaves the queue, which a retry achieves only
  // once whatever the server rejected has changed.
  failed?: boolean;
  onRetry?: () => void;
  className?: string;
}) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = expandedProp ?? localExpanded;
  const toggleExpand = onToggleExpand ?? (() => setLocalExpanded((v) => !v));

  // only edit is wired yet; delete/rollback await sync-recording reducers
  const actions = composeEntryActions(isLatest).filter((a) => a === "edit");

  return (
    <div
      data-testid="entry-row"
      data-expanded={expanded}
      className={cn("flex w-full flex-col", className)}
      onClick={toggleExpand}
    >
      <div className="flex w-full flex-row items-center">
        <div className="relative flex-1">
          <Entry
            entry={entry}
            players={players}
            className={cn(
              failed &&
                "ring-1 ring-error pointer-coarse:min-h-(--control-size)",
            )}
          />
          {failed && (
            <FailedWriteRetry
              onRetry={onRetry}
              testId="entry-row-retry"
              passThroughPointerEvents
            />
          )}
        </div>
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
