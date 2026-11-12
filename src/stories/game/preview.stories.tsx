import { PreviewCard } from "@/components/game/preview";
import { EntryType, MoveType } from "@/entities/game";
import type {
  EntryView,
  GamePlayerView,
  ReduxEntryDraft,
} from "@/lib/features/game/types";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

const players: GamePlayerView[] = [{ id: "p1", name: "選手一", number: 7 }];

const previousEntry: EntryView = {
  type: EntryType.RALLY,
  id: "entry-previous",
  seq: 0,
  win: true,
  home: {
    score: 12,
    type: MoveType.ATTACK,
    num: 4,
    player: { id: "p1", zone: 4 },
  },
  away: { score: 10, type: MoveType.DEFENSE, num: 7 },
};

const undecidedEntry: ReduxEntryDraft = {
  id: "entry-undecided",
  seq: 1,
  win: false,
  home: {
    score: 12,
    type: null,
    num: 0,
    player: { id: "p1", zone: 4 },
  },
  away: { score: 10, type: null, num: 0 },
};

const decidedEntry: EntryView = {
  type: EntryType.RALLY,
  id: "entry-decided",
  seq: 1,
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
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    players,
    previousEntry,
    onSubmit: fn(),
    onExpand: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    entry: previousEntry,
    isEditing: false,
  },
};

export const Undecided: Story = {
  args: {
    entry: {
      type: EntryType.RALLY,
      ...undecidedEntry,
    } as unknown as EntryView,
    isEditing: true,
    isPulsing: true,
  },
};

export const Decided: Story = {
  args: {
    entry: decidedEntry,
    isEditing: true,
    isComplete: true,
  },
};
