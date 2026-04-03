import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";
import {
  Court,
  Outside,
  Inside,
  PlayerCard,
  LoadingCourt,
  PlaceholderCard,
  AdjustButton,
} from "@/components/custom/court";

const meta = {
  title: "Design System/Composites/Court",
  component: Court,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="flex size-full max-w-160 flex-col items-center justify-start p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Court>;

export default meta;
type Story = StoryObj<typeof meta>;

const players = [
  { _id: "1", name: "Alice", number: 1, position: "S" },
  { _id: "2", name: "Bob", number: 5, position: "OH" },
  { _id: "3", name: "Carol", number: 9, position: "MB" },
  { _id: "4", name: "Dave", number: 11, position: "MB" },
  { _id: "5", name: "Eve", number: 7, position: "OH" },
  { _id: "6", name: "Frank", number: 3, position: "L" },
];

const liberos = [
  { _id: "7", name: "Grace", number: 2, position: "L" },
  { _id: "8", name: "Henry", number: 4, position: "L" },
];

const emptyZones = [0, 1, 2];

export const Default: Story = {
  render: () => (
    <Court>
      <Outside>
        <AdjustButton />
        {liberos.map((p) => (
          <PlayerCard
            key={p._id}
            player={p}
            toggled={false}
            list="libero"
            zone={0}
            onClick={fn()}
          />
        ))}
      </Outside>
      <Inside>
        {players.map((p, i) => (
          <PlayerCard
            key={p._id}
            player={p}
            toggled={false}
            list="starting"
            zone={i + 1}
            onClick={fn()}
          />
        ))}
      </Inside>
    </Court>
  ),
};

export const Loading: Story = {
  render: () => <LoadingCourt />,
};

export const EmptySlots: Story = {
  render: () => (
    <Court>
      <Outside>
        <AdjustButton />
        <PlayerCard
          player={null}
          toggled={false}
          list="libero"
          zone={0}
          onClick={fn()}
        />
        <PlaceholderCard />
      </Outside>
      <Inside>
        {players.slice(0, 3).map((p, i) => (
          <PlayerCard
            key={p._id}
            player={p}
            toggled={false}
            list="starting"
            zone={i + 1}
            onClick={fn()}
          />
        ))}
        {emptyZones.map((_, i) => (
          <PlayerCard
            key={`empty-${i}`}
            player={null}
            toggled={false}
            list="starting"
            zone={i + 4}
            onClick={fn()}
          />
        ))}
      </Inside>
    </Court>
  ),
};
