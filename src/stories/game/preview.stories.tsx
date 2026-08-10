import { PreviewCard } from "@/components/game/preview";
import { EntryType, MoveType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

const players: GamePlayerView[] = [{ id: "p1", name: "選手一", number: 7 }];

const previousEntry: EntryView = {
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 12,
    type: MoveType.ATTACK,
    num: 4,
    player: { id: "p1", zone: 4 },
  },
  away: { score: 10, type: MoveType.DEFENSE, num: 7 },
};

const undecidedEntry: EntryView = {
  type: EntryType.RALLY,
  // A draft mid-input: the player is chosen but no outcome has been picked
  // yet, so home/away type stay null and <Rally> renders the muted Figures.
  win: false,
  home: {
    score: 12,
    type: null as unknown as MoveType,
    num: 0,
    player: { id: "p1", zone: 4 },
  },
  away: { score: 10, type: null as unknown as MoveType, num: 0 },
};

const decidedEntry: EntryView = {
  type: EntryType.RALLY,
  win: true,
  home: {
    score: 13,
    type: MoveType.ATTACK,
    num: 4,
    player: { id: "p1", zone: 4 },
  },
  away: { score: 10, type: MoveType.DEFENSE, num: 7 },
};

const meta = {
  title: "Design System/Game/Preview",
  component: PreviewCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { players, previousEntry, onSubmit: fn(), onExpand: fn() },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Idle: nothing in progress, the Preview simply shows the previous entry.
export const Idle: Story = {
  args: {
    entry: previousEntry,
    isEditing: false,
  },
};

// Undecided: input in progress but the outcome isn't picked yet -- the
// current score stays muted and the card pulses (no ring/send icon).
export const Undecided: Story = {
  args: {
    entry: undecidedEntry,
    isEditing: true,
    isPulsing: true,
  },
};

// Decided + complete: every step is done, so the winner-colored Figures show
// alongside the ring + send icon. Click the card to see the submit-freeze
// (one-time background flash + demote to the previous entry in place).
export const Decided: Story = {
  args: {
    entry: decidedEntry,
    isEditing: true,
    isComplete: true,
  },
};
