"use client";
// PROTOTYPE (throwaway). Copied from prototype-v1 unchanged in behaviour; the
// v2 steps section and Points slot id are the only swaps.
// Sections 3-4 (record-demo approach A): the REAL recording components
// (GameCourt / GamePanel / GamePreview + useSubmitEntryDraft) on a landing-only
// Redux store and a private SWR cache seeded with the fixture game.
//  - store: makeStore() with a no-op storage, separate from the app singleton
//  - SWR:   own cache (provider) preloaded with the game + isPaused, so useGame
//           never fetches; mutate() from the real submit hook updates it
//  - queue: PendingWritesContext is a stub, so enqueue/flush never run and the
//           app's pending-writes queue is never touched
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { useSubmitEntryDraft } from "@/components/game/panel/moves/oppo";
import { GamePreview } from "@/components/game/preview";
import {
  DEMO_GAME_ID,
  SEED_COUNT,
  SENT_RALLY,
} from "@/components/landing/prototype-v1/demo-data";
import { demoGame } from "@/components/landing/prototype-v1/demo-game";
import { StatsPoints } from "@/components/landing/prototype-v2/stats-section";
import { POINTS_SLOT } from "@/components/landing/prototype-v2/copy";
import { StepsSection } from "@/components/landing/prototype-v2/steps-section";
import { useCounter } from "@/components/landing/prototype-v1/use-counter";
import { useGame } from "@/hooks/use-data";
import {
  PendingWritesContext,
  usePendingWritesContext,
  type PendingWritesApi,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { useLineup } from "@/lib/features/game/hooks/use-lineup";
import type { PendingWritesStorage } from "@/lib/features/game/pending-writes-storage";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";

const noStorage: PendingWritesStorage = {
  load: async () => undefined,
  save: async () => {},
  clear: async () => {},
  probe: async () => {},
};

const stubQueue: PendingWritesApi = {
  enqueue: () => {},
  flush: async () => ({ ok: true }),
  retry: async () => ({ ok: true }),
};

type Ctrl = { step: (n: number) => void; send: () => void };

// Headless: re-renders only on the slices it reads; the frame and sections are
// siblings, so a step change reaches them through the store, not through here.
const Driver = ({ ctrlRef }: { ctrlRef: { current: Ctrl | null } }) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.general.status);
  const draftId = useAppSelector(
    (s) => s.game.general.entryDraft.home.player?.id,
  );
  const { starting } = useLineup(DEMO_GAME_ID, 0, status);
  const { mutate } = useGame(DEMO_GAME_ID);
  const submit = useSubmitEntryDraft(DEMO_GAME_ID, usePendingWritesContext());
  const sent = useRef(false);
  const zone = useRef(4);
  useCounter("driver");

  // zone of the demo player while the lineup is still pristine
  useEffect(() => {
    if (status.entryIndex !== SEED_COUNT) return;
    const i = starting.findIndex((p) => p.id === SENT_RALLY.player);
    if (i >= 0) zone.current = i + 1;
  }, [starting, status.entryIndex]);

  useEffect(() => {
    const reset = () => {
      sent.current = false;
      void mutate(demoGame, { revalidate: false });
      dispatch(gameActions.initialize({ game: demoGame, setIndex: 0 }));
      // initialize leaves the draft alone, and a stale player would make the
      // replayed setEntryDraftPlayer toggle it off
      dispatch(gameActions.resetEntryDraft());
    };
    const step = (n: number) => {
      reset();
      if (n >= 1)
        dispatch(
          gameActions.setEntryDraftPlayer({
            id: SENT_RALLY.player,
            zone: zone.current,
          }),
        );
      if (n >= 2)
        dispatch(
          gameActions.setEntryDraftHomeMove(scoringMoves[SENT_RALLY.home]!),
        );
      if (n >= 3)
        dispatch(
          gameActions.setEntryDraftAwayMove(scoringMoves[SENT_RALLY.away]!),
        );
    };
    ctrlRef.current = {
      step,
      send: () => {
        if (sent.current || !draftId) return;
        sent.current = true;
        void submit();
      },
    };
  });

  return null;
};

const Frame = () => {
  useCounter("frame");
  return (
    <div className="flex size-full flex-col gap-1 bg-background">
      <div className="w-full shrink-0 overflow-hidden rounded-lg">
        <GameCourt gameId={DEMO_GAME_ID} mode="general" />
      </div>
      <GamePanel
        gameId={DEMO_GAME_ID}
        mode="general"
        className="min-h-0 flex-1"
      />
      <GamePreview gameId={DEMO_GAME_ID} mode="general" />
    </div>
  );
};

const Stats = ({ ctrlRef }: { ctrlRef: { current: Ctrl | null } }) => {
  const { game } = useGame(DEMO_GAME_ID);
  const [slot] = useState(() => document.getElementById(POINTS_SLOT));
  useCounter("stats");
  return (
    slot && (
      <StatsPoints
        game={game!}
        slot={slot}
        onEnter={() => ctrlRef.current?.send()}
      />
    )
  );
};

const Sections = () => {
  const ctrlRef = useRef<Ctrl | null>(null);
  const [frame] = useState(() => <Frame />);
  return (
    <>
      <Driver ctrlRef={ctrlRef} />
      <StepsSection onStep={(n) => ctrlRef.current?.step(n)}>
        {frame}
      </StepsSection>
      <Stats ctrlRef={ctrlRef} />
    </>
  );
};

export const RecordDemo = () => {
  const [store] = useState(() => {
    const s = makeStore(noStorage);
    s.dispatch(gameActions.initialize({ game: demoGame, setIndex: 0 }));
    return s;
  });
  const [cache] = useState(
    () => new Map([[`/api/games/${DEMO_GAME_ID}`, { data: demoGame }]]),
  );

  return (
    <Provider store={store}>
      <SWRConfig
        value={{
          provider: () => cache as never,
          isPaused: () => true,
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          revalidateIfStale: false,
        }}
      >
        <PendingWritesContext.Provider value={stubQueue}>
          <Sections />
        </PendingWritesContext.Provider>
      </SWRConfig>
    </Provider>
  );
};
