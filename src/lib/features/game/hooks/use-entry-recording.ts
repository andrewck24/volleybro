import type { EntryIdentity, InvalidEntryWrite } from "@/entities/game";
import { useGame } from "@/hooks/use-data";
import {
  usePendingWritesContext,
  type FlushResult,
} from "@/hooks/use-pending-writes";
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

export type RecordResult<C extends EntryContent> =
  | { status: "recorded"; entry: RecordedEntry<C> }
  | {
      status: "invalid";
      invalid: InvalidEntryWrite;
      entry: RecordedEntry<C>;
    };

export type EditResult<C extends EntryContent> =
  | { status: "edited"; entry: RecordedEntry<C> }
  | { status: "failed"; error: unknown }
  | {
      status: "invalid";
      invalid: InvalidEntryWrite;
      entry: RecordedEntry<C>;
    };

export const useEntryRecording = (gameId: string) => {
  const { game, mutate } = useGame(gameId);
  const { enqueue, flush } = usePendingWritesContext();
  const store = useAppStore();

  const stage = <C extends EntryContent>(
    content: C,
    identity: EntryIdentity,
    apply: ApplyEntry<C>,
  ): RecordResult<C> => {
    const entry: RecordedEntry<C> = Object.assign({}, content, identity, {
      at: new Date().toISOString(),
    });
    const checked = apply(game!, entry);
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
  ): RecordResult<C> => {
    const result = stage(
      content,
      {
        id: crypto.randomUUID(),
        seq: store.getState().game.general.status.entryIndex,
      },
      apply,
    );
    if (result.status === "recorded") void flush();
    return result;
  };

  const edit = async <C extends EntryContent>(
    content: C,
    apply: ApplyEntry<C>,
  ): Promise<EditResult<C>> => {
    const { id, seq } = store.getState().game.editing.entryDraft;
    const result = stage(content, { id, seq }, apply);
    if (result.status === "invalid") return result;
    const flushed: FlushResult = await flush();
    if (!flushed.ok) return { status: "failed", error: flushed.error };
    return { status: "edited", entry: result.entry };
  };

  return { record, edit };
};
