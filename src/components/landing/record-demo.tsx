"use client";
// The real recording components (GameCourt / GamePanel / GamePreview) on a
// landing-only Redux store and a private SWR cache seeded with the demo game,
// with a stub pending-writes queue: nothing fetches and the app's queue is
// never touched.
import { GameCourt } from "@/components/game/court";
import { GamePanel } from "@/components/game/panel";
import { GamePreview } from "@/components/game/preview";
import {
  DEMO_GAME_ID,
  HOME_PLAYERS,
  SEED_COUNT,
  SENT_RALLY,
} from "@/components/landing/demo-data";
import { demoGame } from "@/components/landing/demo-game";
import { StepsSection } from "@/components/landing/steps-section";
import { useIsFingerDotEnabled } from "@/components/landing/use-walkthrough";
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

const makeDemoStore = () => {
  const store = makeStore(noStorage);
  store.dispatch(gameActions.initialize({ game: demoGame, setIndex: 0 }));
  return store;
};

type DemoController = { step: (tapCount: number) => void };

// Headless: re-renders only on the slices it reads; the frame and sections are
// siblings, so a step change reaches them through the store, not through here.
const Driver = ({
  controllerRef,
}: {
  controllerRef: { current: DemoController | null };
}) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.game.general.status);
  const { starting } = useLineup(DEMO_GAME_ID, 0, status);
  const { mutate } = useGame(DEMO_GAME_ID);
  const zone = useRef(4);

  useEffect(() => {
    if (status.entryIndex !== SEED_COUNT) return;
    const index = starting.findIndex(
      (player) => player.id === SENT_RALLY.player,
    );
    if (index >= 0) zone.current = index + 1;
  }, [starting, status.entryIndex]);

  useEffect(() => {
    const reset = () => {
      void mutate(demoGame, { revalidate: false });
      dispatch(gameActions.initialize({ game: demoGame, setIndex: 0 }));
      // initialize leaves the draft alone, and a stale player would make the
      // replayed setEntryDraftPlayer toggle it off
      dispatch(gameActions.resetEntryDraft());
    };
    const step = (tapCount: number) => {
      reset();
      playTo(dispatch, tapCount, zone.current);
    };
    controllerRef.current = { step };
  });

  return null;
};

const playTo = (
  dispatch: (
    a: Parameters<ReturnType<typeof makeStore>["dispatch"]>[0],
  ) => unknown,
  tapCount: number,
  zone: number,
) => {
  if (tapCount >= 1)
    dispatch(gameActions.setEntryDraftPlayer({ id: SENT_RALLY.player, zone }));
  if (tapCount >= 2)
    dispatch(gameActions.setEntryDraftHomeMove(scoringMoves[SENT_RALLY.home]!));
  if (tapCount >= 3)
    dispatch(gameActions.setEntryDraftAwayMove(scoringMoves[SENT_RALLY.away]!));
};

const MirrorDriver = ({ step }: { step: number }) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.game.general.status);
  const { starting } = useLineup(DEMO_GAME_ID, 0, status);
  const hasPlayed = useRef(false);
  useEffect(() => {
    if (hasPlayed.current) return;
    const index = starting.findIndex(
      (player) => player.id === SENT_RALLY.player,
    );
    if (index < 0) return;
    hasPlayed.current = true;
    playTo(dispatch, step, index + 1);
  }, [starting, dispatch, step]);
  return null;
};

const MirrorPanel = ({ step }: { step: number }) => {
  const [store] = useState(makeDemoStore);
  return (
    <div
      aria-hidden
      data-mirror={step}
      className="pointer-events-none invisible absolute inset-0 flex flex-col"
    >
      <Provider store={store}>
        <MirrorDriver step={step} />
        <GamePanel
          gameId={DEMO_GAME_ID}
          mode="general"
          className="min-h-0 flex-1"
        />
      </Provider>
    </div>
  );
};

const Frame = () => {
  // the mirrors exist only to aim the finger dot
  const isDotEnabled = useIsFingerDotEnabled();
  return (
    // The app objects sit on one tray in the free-zone teal. Concentric radius:
    // tray p-2 (8) + card 12 = rounded-[20px]. The court's 35vh cap is lifted:
    // the frame is zoomed to fit instead.
    <div className="flex size-full flex-col gap-2 rounded-[20px] bg-(--free-zone) p-2 shadow-lg [&_.max-h-\[35vh\]]:max-h-none">
      <div className="w-full shrink-0 overflow-hidden rounded-xl shadow-lg">
        <GameCourt gameId={DEMO_GAME_ID} mode="general" />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl shadow-lg">
        <GamePanel
          gameId={DEMO_GAME_ID}
          mode="general"
          className="min-h-0 flex-1"
        />
        {isDotEnabled && (
          <>
            <MirrorPanel step={1} />
            <MirrorPanel step={2} />
          </>
        )}
      </div>
      <div className="shrink-0 overflow-hidden rounded-xl bg-card shadow-lg">
        <GamePreview gameId={DEMO_GAME_ID} mode="general" />
      </div>
    </div>
  );
};

const FRAME = <Frame />;

const locate = (tap: number, frame: HTMLElement): Element | null => {
  if (tap === 1) {
    const number = String(
      HOME_PLAYERS.find((player) => player.id === SENT_RALLY.player)!.number,
    );
    return (
      [...frame.querySelectorAll("p")]
        .find(
          (paragraph) =>
            paragraph.textContent === number && paragraph.closest(".border-4"),
        )
        ?.closest(".border-4") ?? null
    );
  }
  // taps 2 and 3 are measured in the hidden mirror holding the step before
  // them; its moves body (the progress label also slides in, from below)
  const body = frame
    .querySelector(`[data-mirror="${tap - 1}"]`)
    ?.querySelector(
      '[class*="slide-in-from-right"], [class*="slide-in-from-left"]',
    );
  const buttons = [...(body?.querySelectorAll("button") ?? [])];
  if (tap === 2) {
    const move = scoringMoves[SENT_RALLY.home]!;
    return (
      buttons.find(
        (button) =>
          button.textContent?.trim() === move.text &&
          button.className.includes(move.win ? "bg-primary" : "bg-away"),
      ) ?? null
    );
  }
  const away = scoringMoves[SENT_RALLY.away]!;
  return (
    buttons.find((button) => button.textContent?.includes(away.text)) ?? null
  );
};

const Sections = ({ intro }: { intro: ReactNode }) => {
  const controllerRef = useRef<DemoController | null>(null);
  return (
    <>
      <Driver controllerRef={controllerRef} />
      <StepsSection
        intro={intro}
        locate={locate}
        onStep={(step) => controllerRef.current?.step(step)}
      >
        {FRAME}
      </StepsSection>
    </>
  );
};

export const RecordDemo = ({ intro }: { intro: ReactNode }) => {
  const [store] = useState(makeDemoStore);
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
