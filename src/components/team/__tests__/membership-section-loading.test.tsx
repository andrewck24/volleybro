import { MembershipSection } from "@/components/team/players/membership-section";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { SwrIsolation } from "@test/support/react/swr-isolation";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@test/support/msw/server";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const basePlayer = {
  id: "player-1",
  name: "Alice",
  teamId: "team-1",
  role: PlayerRole.MEMBER,
  status: PlayerStatus.JOINED,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

function renderSection(props: {
  player?: typeof basePlayer;
  ownerPlayerId?: string;
  isCurrentOwner: boolean;
  isSelf: boolean;
}) {
  render(
    <SwrIsolation>
      <MembershipSection
        player={props.player ?? basePlayer}
        teamId="team-1"
        ownerPlayerId={props.ownerPlayerId}
        isCurrentOwner={props.isCurrentOwner}
        isSelf={props.isSelf}
      />
    </SwrIsolation>,
  );
}

// Holds the response until the test releases it, so the request stays in flight.
function holdResponse(method: "delete" | "post", path: string): () => void {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http[method](path, async () => {
      await gate;
      return HttpResponse.json({});
    }),
  );
  return release;
}

describe("MembershipSection — remove loading state", () => {
  it("shows loading and disables confirm button while removing", async () => {
    const release = holdResponse("delete", "/api/players/player-1");

    const user = userEvent.setup();
    renderSection({ isCurrentOwner: false, isSelf: false });

    await user.click(screen.getByRole("button", { name: /刪除球員/ }));
    const confirmBtn = screen.getByRole("button", { name: /確認刪除/ });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute("aria-busy", "true");

    release();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /確認刪除/ }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("MembershipSection — transfer loading state", () => {
  it("shows loading and disables confirm button while transferring", async () => {
    const release = holdResponse("post", "/api/teams/team-1/ownership");

    const user = userEvent.setup();
    renderSection({
      player: { ...basePlayer, role: PlayerRole.ADMIN },
      isCurrentOwner: true,
      isSelf: false,
    });

    await user.click(
      screen.getByRole("button", { name: /移轉所有權給此球員/ }),
    );
    const confirmBtn = screen.getByRole("button", { name: /確認移轉/ });
    expect(confirmBtn).toBeEnabled();

    await user.click(confirmBtn);

    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute("aria-busy", "true");

    release();
    await waitFor(() => expect(confirmBtn).not.toHaveAttribute("aria-busy"));
  });
});

describe("MembershipSection — who the delete entry appears for", () => {
  const deleteEntry = () => screen.queryByRole("button", { name: /刪除球員/ });

  it("appears for a player the caller may manage", () => {
    renderSection({ isCurrentOwner: true, isSelf: false });

    expect(deleteEntry()).toBeInTheDocument();
  });

  it("does not appear for the owner's player", () => {
    renderSection({
      player: { ...basePlayer, role: PlayerRole.ADMIN },
      ownerPlayerId: basePlayer.id,
      isCurrentOwner: false,
      isSelf: false,
    });

    expect(deleteEntry()).not.toBeInTheDocument();
  });

  it("does not appear for the caller's own player", () => {
    renderSection({ isCurrentOwner: false, isSelf: true });

    expect(deleteEntry()).not.toBeInTheDocument();
  });
});

describe("MembershipSection — transfer target", () => {
  const transferEntry = () =>
    screen.getByRole("button", { name: /移轉所有權給此球員/ });

  it("disables transfer to a member and says to promote them first", () => {
    renderSection({ isCurrentOwner: true, isSelf: false });

    expect(transferEntry()).toBeDisabled();
    expect(transferEntry()).toHaveAccessibleDescription(
      "請先將其設為管理員，才能移轉擁有權",
    );
  });

  it("enables transfer to an admin", () => {
    renderSection({
      player: { ...basePlayer, role: PlayerRole.ADMIN },
      isCurrentOwner: true,
      isSelf: false,
    });

    expect(transferEntry()).toBeEnabled();
  });
});

describe("MembershipSection — owner badge", () => {
  it("labels the team's owner player even though its role is admin", () => {
    renderSection({
      player: { ...basePlayer, role: PlayerRole.ADMIN },
      ownerPlayerId: basePlayer.id,
      isCurrentOwner: false,
      isSelf: false,
    });

    expect(screen.getByText("擁有者")).toBeInTheDocument();
  });

  it("does not label an admin who is not the owner", () => {
    renderSection({
      player: { ...basePlayer, role: PlayerRole.ADMIN },
      ownerPlayerId: "someone-else",
      isCurrentOwner: false,
      isSelf: false,
    });

    expect(screen.getByText("管理員")).toBeInTheDocument();
    expect(screen.queryByText("擁有者")).not.toBeInTheDocument();
  });
});
