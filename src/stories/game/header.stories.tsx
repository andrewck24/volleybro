import { GameHeader } from "@/components/game/header";
import { EntryType, MoveType } from "@/entities/game";
import {
  PendingWritesContext,
  usePendingWrites,
} from "@/hooks/use-pending-writes";
import { PENDING_WRITE_UNSENT_ATTEMPTS } from "@/lib/features/game/pending-writes";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore } from "@/lib/redux/store";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { fn } from "storybook/test";

// SyncIndicator reads enqueue/flush/retry from context now that
// usePendingWrites mounts once in Game -- this decorator stands in for
// that single owner so the story can render GameHeader on its own.
const PendingWritesDecorator = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pendingWrites = usePendingWrites(gameId, 2);
  return (
    <PendingWritesContext.Provider value={pendingWrites}>
      {children}
    </PendingWritesContext.Provider>
  );
};

const gameId = "game-1";

const lineup = {
  options: { liberoReplaceMode: 0 as const, liberoReplacePosition: "" },
  starting: [],
  liberos: [],
  substitutes: [],
};

// Two sets already decided (home won set 1, away won set 2) and the third
// set in progress at 6:3 -- matches the design's 375px layout mockup.
const game: GameView = {
  id: gameId,
  win: null,
  teamId: "team-1",
  info: {
    scoring: { setCount: 5, decidingSetPoints: 15 },
  },
  teams: {
    home: { id: "team-1", name: "我方", players: [], staffs: [] },
    away: { id: "team-2", name: "對手", players: [], staffs: [] },
  },
  sets: [
    {
      win: true,
      lineups: { home: lineup },
      options: { serve: "home" },
      entries: [],
    },
    {
      win: false,
      lineups: { home: lineup },
      options: { serve: "home" },
      entries: [],
    },
    {
      win: null,
      lineups: { home: lineup },
      options: { serve: "home" },
      entries: [
        {
          type: EntryType.RALLY,
          id: "e1",
          seq: 0,
          win: true,
          home: { score: 6, type: MoveType.ATTACK, num: 4 },
          away: { score: 3, type: MoveType.DEFENSE, num: 7 },
        },
      ],
    },
  ],
} as unknown as GameView;

const store = makeStore();
store.dispatch(gameActions.initialize({ game, setIndex: 2 }));

const meta = {
  title: "Design System/Game/Header",
  component: GameHeader,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["autodocs"],
  args: {
    gameId,
    handleOptionOpen: fn(),
  },
  decorators: [
    (Story) => (
      <SWRConfig
        value={{
          provider: () => new Map([[`/api/games/${gameId}`, { data: game }]]),
        }}
      >
        <Provider store={store}>
          <PendingWritesDecorator>
            <Story />
          </PendingWritesDecorator>
        </Provider>
      </SWRConfig>
    ),
  ],
} satisfies Meta<typeof GameHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// 375px viewport: the design's arithmetic for the header's three equal
// columns plus SyncIndicator in the middle column, in flow.
export const Width375: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

// 320px: the narrowest supported width -- must not overflow either.
export const Width320: Story = {
  parameters: {
    viewport: {
      viewports: {
        narrow: {
          name: "320px",
          styles: { width: "320px", height: "568px" },
        },
      },
      defaultViewport: "narrow",
    },
  },
};

const queueRally = () =>
  store.dispatch(
    pendingWritesActions.enqueued({
      entry: {
        id: "pending-1",
        seq: 1,
        win: true,
        home: { score: 7, type: MoveType.ATTACK, num: 4 },
        away: { score: 3, type: MoveType.DEFENSE, num: 7 },
      },
      gameId,
      setIndex: 2,
    }),
  );

const transient = {
  code: "TRANSIENT",
  reason: "NETWORK_ERROR",
  status: 503,
} as const;

export const Unsent: Story = {
  decorators: [
    (Story) => {
      queueRally();
      for (let i = 0; i < PENDING_WRITE_UNSENT_ATTEMPTS; i++) {
        store.dispatch(
          pendingWritesActions.flushFailed({
            ids: ["pending-1"],
            retryable: true,
            lastError: transient,
          }),
        );
      }
      return <Story />;
    },
  ],
};

// Lost: a 4xx, which waiting does not improve. The only state that still
// wears the warning tone, and the only one carrying a count in that colour.
export const Failed: Story = {
  decorators: [
    (Story) => {
      queueRally();
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["pending-1"],
          retryable: false,
          lastError: { code: "VALIDATION", reason: "BAD_REQUEST", status: 400 },
        }),
      );
      return <Story />;
    },
  ],
};

// The one state that does not come from the queue at all: this device
// cannot keep what is unsent, so it shows even with nothing pending.
export const StorageUnavailable: Story = {
  decorators: [
    (Story) => {
      store.dispatch(pendingWritesActions.storageUnavailable());
      return <Story />;
    },
  ],
};
