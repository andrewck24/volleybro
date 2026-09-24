import {
  SummaryDrawerCard,
  type IndexedEntry,
} from "@/components/game/summary-drawer";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

const players: GamePlayerView[] = [
  { id: "p1", name: "選手一", number: 4 },
  { id: "p2", name: "選手二", number: 7 },
];

const rawEntries: EntryView[] = [
  {
    type: EntryType.RALLY,
    id: "entry-0",
    seq: 0,
    win: true,
    home: {
      score: 1,
      type: MoveType.SERVING,
      num: 0,
      player: { id: "p1", zone: 1 },
    },
    away: { score: 0, type: MoveType.SERVING, num: 1 },
  },
  {
    type: EntryType.RALLY,
    id: "entry-1",
    seq: 1,
    win: false,
    home: {
      score: 1,
      type: MoveType.DEFENSE,
      num: 5,
      player: { id: "p2", zone: 4 },
    },
    away: {
      score: 1,
      type: MoveType.ATTACK,
      num: 4,
      player: { id: "p2", zone: 4 },
    },
  },
];

const entries: IndexedEntry[] = rawEntries.map((entry, index) => ({
  entry,
  index,
}));

const meta = {
  title: "Design System/Game/SummaryDrawer",
  component: SummaryDrawerCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    entries,
    totalEntries: entries.length,
    players,
    onToggle: fn(),
    onEntryClick: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SummaryDrawerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Idle: the drawer anchored above the Preview shows only the handle and the
// latest entry (`entry-ui` change, scenario "Idle drawer shows handle and
// latest entry").
export const Idle: Story = {
  args: {
    state: "idle",
  },
};

// Expanded: the latest entry rises with the top edge and becomes the first
// row of the full list, in place (`entry-ui` change, scenario "Expanding
// promotes the latest entry to the first row").
export const Expanded: Story = {
  args: {
    state: "expanded",
  },
};

// Audit: an empty entry list must not crash the drawer -- only the handle
// renders.
export const EmptyIdle: Story = {
  args: {
    entries: [],
    state: "idle",
  },
};
