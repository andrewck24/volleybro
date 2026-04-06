import {
  AdjustButton,
  Court,
  Inside,
  LoadingCourt,
  Outside,
  PlaceholderCard,
  PlayerCard,
} from "@/components/custom/court";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

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
  { id: "1", name: "Alice", number: 1, position: "S" },
  { id: "2", name: "Bob", number: 5, position: "OH" },
  { id: "3", name: "Carol", number: 9, position: "MB" },
  { id: "4", name: "Dave", number: 11, position: "MB" },
  { id: "5", name: "Eve", number: 7, position: "OH" },
  { id: "6", name: "Frank", number: 3, position: "L" },
];

const liberos = [
  { id: "7", name: "Grace", number: 2, position: "L" },
  { id: "8", name: "Henry", number: 4, position: "L" },
];

const emptyZones = [0, 1, 2];

export const Default: Story = {
  render: () => (
    <Court>
      <Outside>
        <AdjustButton />
        {liberos.map((p) => (
          <PlayerCard
            key={p.id}
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
            key={p.id}
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
            key={p.id}
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
