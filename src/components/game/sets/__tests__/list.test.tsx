import { SetsList } from "@/components/game/sets/list";
import { game, rally } from "@test/support/fixtures/editing-game";
import { renderGame } from "@test/support/react/render-game";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const [firstSet] = game.sets;
const finishedGame = {
  ...game,
  info: { ...game.info, scoring: { setCount: 1, decidingSetPoints: 2 } },
  sets: [
    {
      ...firstSet!,
      entries: [{ ...rally, home: { ...rally.home, score: 2 } }],
    },
  ],
};

describe("SetsList entry editing", () => {
  it("opens the editor for a recorded entry of a finished set", async () => {
    const user = userEvent.setup();
    const { gameLoaded } = renderGame(
      <SetsList gameId={finishedGame.id} />,
      finishedGame,
    );
    await gameLoaded();

    await user.click(await screen.findByText("第 1 局"));
    await user.click(await screen.findByRole("button", { name: "查看紀錄" }));
    await user.click(await screen.findByText("比賽開始"));
    const [entry] = await screen.findAllByText("發球");
    await user.click(entry!);

    expect(await screen.findByText("編輯逐球紀錄")).toBeInTheDocument();
  });
});
