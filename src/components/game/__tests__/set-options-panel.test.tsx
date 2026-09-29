import { Options } from "@/components/game/set-options/panel/options";
import { Toaster } from "@/components/ui/toaster";
import { Position } from "@/entities/team";
import { ERROR_MESSAGES } from "@/lib/api/error-messages";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { makeStore } from "@/lib/redux/store";
import { SwrIsolation } from "@/test-utils/swr-isolation";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";

import { server } from "../../../../test/msw/server";

const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

const lineup = {
  // Manual libero replacement needs no paired position, so submit is enabled.
  options: { liberoReplaceMode: 0, liberoReplacePosition: Position.NONE },
  starting: [],
  liberos: [],
  substitutes: [],
};

// No sets yet, so the panel is starting a new one.
const game = {
  id: "rec-1",
  win: null,
  teamId: "team-1",
  teams: {
    home: { id: "team-1", name: "Home", players: [] },
    away: { name: "Away", players: [] },
  },
  sets: [],
};

const setUp = async () => {
  const store = makeStore();
  act(() => {
    store.dispatch(lineupActions.initialize([lineup] as never));
  });
  render(
    <Provider store={store}>
      <SwrIsolation>
        <Options gameId="rec-1" />
        <Toaster />
      </SwrIsolation>
    </Provider>,
  );
  // The label flips from "儲存設定" once the game loads and this is a new set.
  const button = await screen.findByRole("button", { name: "開始新一局" });
  return { button, user: userEvent.setup() };
};

describe("Options (set-options panel) submitting state", () => {
  beforeEach(() => {
    mockRouterPush.mockClear();
    server.use(http.get("/api/games/rec-1", () => HttpResponse.json(game)));
  });

  it("disables the submit button and shows progress while saving, then posts the set and moves on", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let body: unknown;
    let url!: URL;
    server.use(
      http.post("/api/games/rec-1/sets", async ({ request }) => {
        url = new URL(request.url);
        body = await request.json();
        await gate;
        return HttpResponse.json({
          ...game,
          sets: [{ win: null, options: { serve: "away" }, entries: [] }],
        });
      }),
    );

    const { button, user } = await setUp();
    expect(button).toBeEnabled();

    await user.click(button);

    // handleSubmit validates asynchronously before the submit handler runs, so
    // the disabled state only appears once that validation has settled.
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("開始中");

    release();
    await waitFor(() => expect(button).toBeEnabled());

    expect(url.searchParams.get("si")).toBe("0");
    expect(body).toEqual({
      lineup,
      options: { serve: "away", time: expect.any(Object) },
    });
    expect(await screen.findByText("新一局已開始")).toBeInTheDocument();
    expect(mockRouterPush).toHaveBeenCalledWith("/game/rec-1/sets/0/entry");
  });

  it("re-enables the button and reports the error after a failed save", async () => {
    server.use(
      http.post("/api/games/rec-1/sets", () =>
        HttpResponse.json(
          { code: "UNEXPECTED", reason: "UNEXPECTED" },
          { status: 500 },
        ),
      ),
    );

    const { button, user } = await setUp();
    await user.click(button);

    expect(
      await screen.findByText(ERROR_MESSAGES.SERVER_ERROR.title),
    ).toBeInTheDocument();
    expect(button).toBeEnabled();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
