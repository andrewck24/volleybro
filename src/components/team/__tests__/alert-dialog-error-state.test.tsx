import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MembershipSection } from "@/components/team/players/membership-section";
import { Toaster } from "@/components/ui/toaster";
import { createPlayer } from "@test/support/fixtures/entities";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { server } from "@test/support/msw/server";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

const joinedPlayer = createPlayer({ number: 7 });

function renderSection() {
  render(
    <SwrIsolation>
      <MembershipSection
        player={joinedPlayer}
        teamId="team-1"
        isCurrentOwner={true}
        isSelf={false}
      />
      <Toaster />
    </SwrIsolation>,
  );
}

describe("AlertDialog error state — MembershipSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the remove dialog open with the error inline when remove fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`/api/players/${joinedPlayer.id}`, () =>
        HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_TEAM_OWNER" },
          { status: 403 },
        ),
      ),
    );
    renderSection();

    await user.click(screen.getByRole("button", { name: "刪除球員" }));
    await user.click(screen.getByRole("button", { name: "確認刪除" }));

    expect(
      await screen.findByText("移轉擁有者身分需要目前的擁有者操作"),
    ).toBeInTheDocument();
    expect(screen.getByText(/確定要將.*從名單中刪除嗎？/)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("clears the error and closes the dialog when a retry succeeds", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.delete(`/api/players/${joinedPlayer.id}`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { code: "UNEXPECTED", reason: "UNHANDLED_ERROR" },
              { status: 500 },
            )
          : HttpResponse.json({});
      }),
    );
    renderSection();

    await user.click(screen.getByRole("button", { name: "刪除球員" }));
    await user.click(screen.getByRole("button", { name: "確認刪除" }));
    expect(await screen.findByText(/伺服器暫時無法處理/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "確認刪除" }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/team/team-1"),
    );
    expect(attempts).toBe(2);
    expect(screen.queryByText(/伺服器暫時無法處理/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/確定要將.*從名單中刪除嗎？/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("球員已刪除").length).toBeGreaterThan(0);
  });

  it("keeps the transfer dialog open with the error inline and lets the caller retry", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post("/api/teams/team-1/ownership", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { code: "AUTHORIZATION", reason: "NOT_TEAM_OWNER" },
          { status: 403 },
        );
      }),
    );
    renderSection();

    await user.click(
      screen.getByRole("button", { name: "移轉所有權給此球員" }),
    );
    const confirm = screen.getByRole("button", { name: "確認移轉" });
    await user.click(confirm);

    expect(
      await screen.findByText("移轉擁有者身分需要目前的擁有者操作"),
    ).toBeInTheDocument();
    expect(screen.getByText(/確定要將隊伍所有權移轉給/)).toBeInTheDocument();
    expect(body).toEqual({ newOwnerId: joinedPlayer.id });
    await waitFor(() => expect(confirm).toBeEnabled());
  });
});
