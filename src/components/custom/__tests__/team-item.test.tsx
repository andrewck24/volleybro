import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { TeamItem } from "@/components/custom/team-item";

// Mock react-icons
jest.mock("react-icons/ri", () => ({
  RiGroupLine: (props: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="ri-group-icon" {...props} />
  ),
}));

// Mock useTeam hook
const mockUseTeam = jest.fn();
jest.mock("@/hooks/use-data", () => ({
  useTeam: (...args: unknown[]) => mockUseTeam(...args),
}));

describe("TeamItem", () => {
  beforeEach(() => {
    mockUseTeam.mockReset();
  });

  describe("data fetching", () => {
    it("calls useTeam with the provided teamId", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" />);
      expect(mockUseTeam).toHaveBeenCalledWith("team-123");
    });

    it("displays team name after loading", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" />);
      expect(screen.getByText("Thunder")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows skeleton placeholder while loading", () => {
      mockUseTeam.mockReturnValue({ team: undefined, isLoading: true });
      render(<TeamItem teamId="team-123" />);
      expect(screen.getByTestId("team-name-skeleton")).toBeInTheDocument();
    });

    it("does not show skeleton after loading", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" />);
      expect(screen.queryByTestId("team-name-skeleton")).not.toBeInTheDocument();
    });
  });

  describe("navigation pattern", () => {
    it("renders as Link when href is provided", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" href="/team/123" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/team/123");
    });

    it("renders as button when onClick is provided", () => {
      const handleClick = jest.fn();
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" onClick={handleClick} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders as div when neither href nor onClick is provided", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("action slot event isolation", () => {
    it("action button click does not trigger parent onClick", () => {
      const parentClick = jest.fn();
      const actionClick = jest.fn();
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(
        <TeamItem
          teamId="team-123"
          onClick={parentClick}
          action={
            <button data-testid="action-btn" onClick={actionClick}>
              Accept
            </button>
          }
        />
      );

      const actionBtn = screen.getByTestId("action-btn");
      fireEvent.click(actionBtn);
      expect(actionClick).toHaveBeenCalledTimes(1);
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe("rendering", () => {
    it("renders group icon", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(<TeamItem teamId="team-123" />);
      expect(screen.getByTestId("ri-group-icon")).toBeInTheDocument();
    });

    it("renders children in metadata area", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(
        <TeamItem teamId="team-123">
          <span data-testid="metadata">5 members</span>
        </TeamItem>
      );
      expect(screen.getByTestId("metadata")).toBeInTheDocument();
    });

    it("renders action slot content", () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      render(
        <TeamItem
          teamId="team-123"
          action={<button data-testid="action-btn">Join</button>}
        />
      );
      expect(screen.getByTestId("action-btn")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has no axe violations (static)", async () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      const { container } = render(<TeamItem teamId="team-123" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations (link)", async () => {
      mockUseTeam.mockReturnValue({
        team: { name: "Thunder" },
        isLoading: false,
      });
      const { container } = render(
        <TeamItem teamId="team-123" href="/team/123" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
