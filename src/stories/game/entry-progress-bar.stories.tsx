import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

const steps: ProgressStep[] = [
  { key: "player", caption: "選擇球員或對方失誤" },
  { key: "home", caption: "我方得失分紀錄" },
  { key: "away", caption: "對方得失分紀錄" },
];

const meta = {
  title: "Design System/Game/EntryProgressBar",
  component: EntryProgressBar,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { steps, onStepChange: fn() },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlayerStep: Story = {
  args: {
    activeStep: 0,
    reachableSteps: [0],
  },
};

export const HomeStep: Story = {
  args: {
    activeStep: 1,
    reachableSteps: [0, 1],
  },
};

export const AwayStep: Story = {
  args: {
    activeStep: 2,
    reachableSteps: [0, 1, 2],
  },
};

// Opponent error (our move is UNFORCED): the flow collapses to two steps
// [select opponent error, confirm outcome], the outcome step active and
// submittable. Replaces the obsolete single-step away-error collapse.
export const OpponentErrorCollapsed: Story = {
  args: {
    steps: [
      { key: "player", caption: "選擇球員或對方失誤" },
      { key: "away", caption: "對方得失分紀錄" },
    ],
    activeStep: 1,
    reachableSteps: [0, 1],
  },
};
