import { GameHeader } from "@/components/game/header";
import { EntryType, MoveType } from "@/entities/game";
import { pendingWritesActions } from "@/lib/features/game/pending-writes-slice";
import { gameActions } from "@/lib/features/game/game-slice";
import type { GameView } from "@/lib/features/game/types";
import { makeStore } from "@/lib/redux/store";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { Provider } from "react-redux";
import { SWRConfig } from "swr";
import { fn } from "storybook/test";

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
  parameters: { layout: "fullscreen" },
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
          <Story />
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

// The unsynced state: a failed write left in the queue, retry offered.
export const Unsynced: Story = {
  decorators: [
    (Story) => {
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
      store.dispatch(
        pendingWritesActions.flushFailed({
          ids: ["pending-1"],
          retryable: false,
        }),
      );
      return <Story />;
    },
  ],
};
