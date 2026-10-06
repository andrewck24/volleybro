"use client";
// PROTOTYPE (throwaway). Copied from prototype-v1; v2 keeps only the
// walkthrough (steps 0-3 drive the real draft). The v1 "send on reaching the
// stats" continuation is gone: v2's stats follow the hero's rally clock
// (live-stats.tsx). The section intro arrives as `intro` and is set inside
// the sticky stage. The REAL recording components
// (GameCourt / GamePanel / GamePreview) on a landing-only
// Redux store and a private SWR cache seeded with the fixture game.
//  - store: makeStore() with a no-op storage, separate from the app singleton
//  - SWR:   own cache (provider) preloaded with the game + isPaused, so useGame
//           never fetches; each step resets it to the fixture
//  - queue: PendingWritesContext is a stub, so enqueue/flush never run and the
//           app's pending-writes queue is never touched
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { GamePreview } from "@/components/game/preview";
import {
  DEMO_GAME_ID,
  SEED_COUNT,
  SENT_RALLY,
} from "@/components/landing/prototype-v1/demo-data";
import { demoGame } from "@/components/landing/prototype-v1/demo-game";
import { StepsSection } from "@/components/landing/prototype-v2/steps-section";
import { useCounter } from "@/components/landing/prototype-v1/use-counter";
import { useGame } from "@/hooks/use-data";
import {
  PendingWritesContext,
  type PendingWritesApi,
} from "@/hooks/use-pending-writes";
import { gameActions } from "@/lib/features/game/game-slice";
import { useLineup } from "@/lib/features/game/hooks/use-lineup";
import type { PendingWritesStorage } from "@/lib/features/game/pending-writes-storage";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { makeStore } from "@/lib/redux/store";
import { scoringMoves } from "@/lib/scoring-moves";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

type Ctrl = { step: (n: number) => void };

// Headless: re-renders only on the slices it reads; the frame and sections are
// siblings, so a step change reaches them through the store, not through here.
const Driver = ({ ctrlRef }: { ctrlRef: { current: Ctrl | null } }) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.game.general.status);
  const { starting } = useLineup(DEMO_GAME_ID, 0, status);
  const { mutate } = useGame(DEMO_GAME_ID);
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
    ctrlRef.current = { step };
  });

  return null;
};

const Frame = () => {
  useCounter("frame");
  return (
    // the app court's 35vh cap would squeeze its 11:9 box (and clip the
    // player cards) inside the frame; the frame is zoomed to fit instead
    <div className="flex size-full flex-col gap-1 bg-background [&_.max-h-\[35vh\]]:max-h-none">
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

const Sections = ({ intro }: { intro: ReactNode }) => {
  const ctrlRef = useRef<Ctrl | null>(null);
  const [frame] = useState(() => <Frame />);
  return (
    <>
      <Driver ctrlRef={ctrlRef} />
      <StepsSection intro={intro} onStep={(n) => ctrlRef.current?.step(n)}>
        {frame}
      </StepsSection>
    </>
  );
};

export const RecordDemo = ({ intro }: { intro: ReactNode }) => {
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
          <Sections intro={intro} />
        </PendingWritesContext.Provider>
      </SWRConfig>
    </Provider>
  );
};
