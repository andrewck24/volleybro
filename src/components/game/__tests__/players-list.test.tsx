import { PlayersList } from "@/components/game/new/players-list";
import type { LineupListPlayer } from "@/lib/features/game/types";
import { render, screen } from "@testing-library/react";

const player = (overrides: Partial<LineupListPlayer>): LineupListPlayer => ({
  id: "p1",
  name: "選手一",
  number: 4,
  list: "starting",
  ...overrides,
});

describe("PlayersList", () => {
  it.each([
    ["starting", "先發"],
    ["liberos", "自由"],
  ] as const)("labels a %s player %s", (list, label) => {
    render(<PlayersList players={[player({ list })]} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("leaves a substitute unlabelled", () => {
    render(<PlayersList players={[player({ list: "substitutes" })]} />);

    expect(screen.getByText("選手一")).toBeInTheDocument();
    expect(screen.queryByText(/先發|自由/)).not.toBeInTheDocument();
  });

  it("shows the shirt number with a leading hash, including zero", () => {
    render(
      <PlayersList
        players={[
          player({ id: "a", name: "甲", number: 7 }),
          player({ id: "b", name: "乙", number: 0 }),
        ]}
      />,
    );

    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("#0")).toBeInTheDocument();
  });

  it("shows no number for a player without one", () => {
    render(
      <PlayersList players={[player({ number: null as unknown as number })]} />,
    );

    expect(screen.getByText("選手一")).toBeInTheDocument();
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
  });
});
