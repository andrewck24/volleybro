import Notifications from "@/components/notifications";
import { render, screen } from "@testing-library/react";

const mockUseActiveTeamId = jest.fn();

jest.mock("@/hooks/use-data", () => ({
  useActiveTeamId: () => mockUseActiveTeamId(),
}));

describe("Notifications", () => {
  it("shows the new-user guide when the user has no joined team", () => {
    mockUseActiveTeamId.mockReturnValue({ teamId: undefined });

    render(<Notifications />);

    expect(screen.getByText("歡迎使用 VolleyBro !")).toBeInTheDocument();
  });

  it("does not show the new-user guide when the user has another joined team", () => {
    mockUseActiveTeamId.mockReturnValue({ teamId: "team-1" });

    render(<Notifications />);

    expect(screen.queryByText("歡迎使用 VolleyBro !")).not.toBeInTheDocument();
  });
});
