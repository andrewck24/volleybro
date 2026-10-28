import { EntryRow } from "@/components/game/entry";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

const players: GamePlayerView[] = [
  { id: "p1", name: "選手一", number: 4 },
  { id: "p2", name: "選手二", number: 7 },
];

const entry: EntryView = {
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 1,
    type: MoveType.SERVING,
    num: 0,
    player: { id: "p1", zone: 1 },
  },
  away: { score: 0, type: MoveType.SERVING, num: 1 },
} as unknown as EntryView;

const meta = {
  title: "Design System/Game/EntryRow",
  component: EntryRow,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    entry,
    players,
    onEdit: fn(),
    onDelete: fn(),
    onRollbackToHere: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Latest entry, at rest: not expanded yet.
export const Collapsed: Story = {
  args: { isLatest: true },
};

// Tap inline-expands the row in place to show the entry detail + actions,
// without leaving the list (`entry-ui` change, scenario "Tap inline-expands
// the row in place"). Runs a real click via Storybook's play function to
// reach the expanded state.
export const TapExpandedLatest: Story = {
  args: { isLatest: true },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector(
      '[data-testid="entry-row"]',
    ) as HTMLElement | null;
    row?.click();
  },
};
