import Link from "next/link";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";

import { TeamItem, TeamItemSkeleton } from "@/components/custom/team-item";
import { Item, ItemActions } from "@/components/ui/item";

jest.mock("react-icons/ri", () => ({
  RiGroupLine: (props: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="ri-group-icon" {...props} />
  ),
}));

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
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(mockUseTeam).toHaveBeenCalledWith("team-123");
    });

    it("displays team name after loading", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(screen.getByText("Thunder")).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows skeleton placeholder while loading", () => {
      mockUseTeam.mockReturnValue({ team: undefined, isLoading: true });
      render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(screen.getByTestId("team-name-skeleton")).toBeInTheDocument();
    });

    it("does not show skeleton after loading", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(screen.queryByTestId("team-name-skeleton")).not.toBeInTheDocument();
    });
  });

  describe("rendering", () => {
    it("renders group icon", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(screen.getByTestId("ri-group-icon")).toBeInTheDocument();
    });

    it("renders children in content area", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(
        <Item>
          <TeamItem teamId="team-123">
            <span data-testid="metadata">5 members</span>
          </TeamItem>
        </Item>
      );
      expect(screen.getByTestId("metadata")).toBeInTheDocument();
    });
  });

  describe("navigable form (asChild)", () => {
    it("renders as link via Item asChild + Link", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(
        <Item asChild>
          <Link href="/team/123">
            <TeamItem teamId="team-123" />
          </Link>
        </Item>
      );
      expect(screen.getByRole("link")).toHaveAttribute("href", "/team/123");
    });

    it("renders as button via Item asChild", () => {
      const handleClick = jest.fn();
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(
        <Item asChild>
          <button onClick={handleClick}>
            <TeamItem teamId="team-123" />
          </button>
        </Item>
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("static with actions form", () => {
    it("renders interactive ItemActions without link", () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      render(
        <Item>
          <TeamItem teamId="team-123" />
          <ItemActions>
            <button data-testid="action-btn">Accept</button>
          </ItemActions>
        </Item>
      );
      expect(screen.getByTestId("action-btn")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has no axe violations (static item)", async () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      const { container } = render(<Item><TeamItem teamId="team-123" /></Item>);
      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations (navigable form)", async () => {
      mockUseTeam.mockReturnValue({ team: { name: "Thunder" }, isLoading: false });
      const { container } = render(
        <Item asChild>
          <Link href="/team/123">
            <TeamItem teamId="team-123" />
          </Link>
        </Item>
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe("TeamItemSkeleton", () => {
  it("renders media and content placeholders", () => {
    render(<TeamItemSkeleton />);
    expect(screen.getByTestId("team-item-skeleton-media")).toBeInTheDocument();
    expect(screen.getByTestId("team-item-skeleton-content")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<TeamItemSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
