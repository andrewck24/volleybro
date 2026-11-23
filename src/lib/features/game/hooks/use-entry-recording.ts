import type { EntryIdentity, InvalidEntryWrite } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import {
  usePendingWritesContext,
  type FlushResult,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameView, PendingEntryContent } from "@/lib/features/game/types";
import { useAppStore } from "@/lib/redux/hooks";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type EntryContent = DistributiveOmit<
  PendingEntryContent,
  keyof EntryIdentity | "at"
>;

type RecordedEntry<C extends EntryContent> = C & EntryIdentity & { at: string };

export type ApplyEntry<C extends EntryContent> = (
  game: GameView,
  entry: RecordedEntry<C>,
) => { game: GameView } | { invalid: InvalidEntryWrite };

type WriteFailed = { status: "failed"; error: unknown };

export type RecordResult<C extends EntryContent> =
  | { status: "recorded"; entry: RecordedEntry<C> }
  | WriteFailed
  | {
      status: "invalid";
      invalid: InvalidEntryWrite;
      entry: RecordedEntry<C>;
    };

export type EditResult<C extends EntryContent> =
  | { status: "edited"; entry: RecordedEntry<C> }
  | WriteFailed
  | {
      status: "invalid";
      invalid: InvalidEntryWrite;
      entry: RecordedEntry<C>;
    };

export const useEntryRecording = (gameId: string) => {
  const { game, error, mutate } = useGame(gameId);
  const { enqueue, flush } = usePendingWritesContext();
  const store = useAppStore();

  const stage = <C extends EntryContent>(
    content: C,
    identity: EntryIdentity,
    apply: ApplyEntry<C>,
  ): RecordResult<C> => {
    if (!game) return { status: "failed", error };
    const entry: RecordedEntry<C> = Object.assign({}, content, identity, {
      at: new Date().toISOString(),
    });
    const checked = apply(game, entry);
    if ("invalid" in checked)
      return { status: "invalid", invalid: checked.invalid, entry };
    mutate(
      (raw) => {
        const applied = apply(raw!, entry);
        return "game" in applied ? applied.game : raw;
      },
      { revalidate: false },
    );
    enqueue(entry);
    return { status: "recorded", entry };
  };

  const record = <C extends EntryContent>(
    content: C,
    apply: ApplyEntry<C>,
  ): RecordResult<C> =>
    stage(
      content,
      {
        id: crypto.randomUUID(),
        seq: store.getState().game.general.status.entryIndex,
      },
      apply,
    );

  const leaveWhenWritten = ({ id, at }: { id: string; at: string }) => {
    const unsubscribe = store.subscribe(() => {
      const { game, pendingWrites } = store.getState();
      if (game.mode !== "editing" || game.editing.entryDraft.id !== id)
        return unsubscribe();
      const queued = pendingWrites.pending.filter((p) => p.entry.id === id);
      if (queued.some((p) => p.entry.at === at)) return;
      unsubscribe();
      if (queued.length === 0)
        store.dispatch(gameActions.setGameMode("general"));
    });
  };

  const edit = async <C extends EntryContent>(
    content: C,
    apply: ApplyEntry<C>,
  ): Promise<EditResult<C>> => {
    const { id, seq } = store.getState().game.editing.entryDraft;
    const result = stage(content, { id, seq }, apply);
    if (result.status !== "recorded") return result;
    const flushed: FlushResult = await flush();
    if (!flushed.ok) {
      leaveWhenWritten(result.entry);
      return { status: "failed", error: flushed.error };
    }
    return { status: "edited", entry: result.entry };
  };

  return { record, edit };
};
