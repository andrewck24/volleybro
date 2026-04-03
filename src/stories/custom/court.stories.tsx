import type { Meta, StoryObj } from "@storybook/nextjs";
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
  parameters: { layout: "centered" },
  tags: ["autodocs"],
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

export const Default: Story = {
  render: () => (
    <div className="w-80">
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
              onClick={() => {}}
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
              onClick={() => {}}
            />
          ))}
        </Inside>
      </Court>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="w-80">
      <LoadingCourt />
    </div>
  ),
};

export const EmptySlots: Story = {
  render: () => (
    <div className="w-80">
      <Court>
        <Outside>
          <AdjustButton />
          <PlayerCard
            player={null}
            toggled={false}
            list="libero"
            zone={0}
            onClick={() => {}}
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
              onClick={() => {}}
            />
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <PlayerCard
              key={`empty-${i}`}
              player={null}
              toggled={false}
              list="starting"
              zone={i + 4}
              onClick={() => {}}
            />
          ))}
        </Inside>
      </Court>
    </div>
  ),
};
