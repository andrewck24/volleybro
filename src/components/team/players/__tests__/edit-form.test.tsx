import { EditForm } from "@/components/team/players/edit-form";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const TEAM_ID = "507f1f77bcf86cd799439011";
const PLAYER_ID = "507f1f77bcf86cd799439012";

const player = {
  id: PLAYER_ID,
  name: "Alice",
  teamId: TEAM_ID,
  role: PlayerRole.MEMBER,
  status: PlayerStatus.JOINED,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  server.use(
    http.get(`/api/players/${PLAYER_ID}`, () => HttpResponse.json(player)),
    http.get(`/api/teams/${TEAM_ID}/players`, () =>
      HttpResponse.json([player]),
    ),
    http.get("/api/users", () => HttpResponse.json({ id: "someone-else" })),
    http.patch(`/api/players/${PLAYER_ID}`, () =>
      HttpResponse.json({ ...player, name: "Alicia" }),
    ),
  );
});

async function setup(onSuccess?: () => void) {
  render(
    <SwrIsolation>
      <EditForm teamId={TEAM_ID} playerId={PLAYER_ID} onSuccess={onSuccess} />
    </SwrIsolation>,
  );
  const nameField = await screen.findByDisplayValue("Alice");
  await userEvent.clear(nameField);
  await userEvent.type(nameField, "Alicia");
  await userEvent.click(screen.getByRole("button", { name: /儲存變更/ }));
}

describe("EditForm", () => {
  it("calls onSuccess and does not push when onSuccess is provided", async () => {
    const onSuccess = jest.fn();
    await setup(onSuccess);

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("replaces with the player's page when onSuccess is not provided", async () => {
    await setup();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        `/team/${TEAM_ID}/players/${PLAYER_ID}`,
      ),
    );
  });
});
