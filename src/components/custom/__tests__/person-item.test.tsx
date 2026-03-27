import Link from "next/link";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

import {
  PersonItem,
  PersonItemSkeleton,
} from "@/components/custom/person-item";
import { Item, ItemActions } from "@/components/ui/item";

jest.mock("react-icons/fi", () => ({
  FiUser: (props: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="fi-user-icon" {...props} />
  ),
}));

describe("PersonItem", () => {
  describe("rendering", () => {
    it("renders name text", () => {
      render(
        <Item>
          <PersonItem name="Alice" />
        </Item>
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("renders avatar fallback icon when no image provided", () => {
      render(
        <Item>
          <PersonItem name="Alice" />
        </Item>
      );
      expect(screen.getByTestId("fi-user-icon")).toBeInTheDocument();
    });

    it("renders avatar image when image prop is provided", () => {
      render(
        <Item>
          <PersonItem name="Alice" image="/avatar.png" />
        </Item>
      );
      expect(screen.getByRole("img")).toHaveAttribute("alt", "Alice");
    });

    it("renders children in content area", () => {
      render(
        <Item>
          <PersonItem name="Alice">
            <span data-testid="metadata">#7 OH</span>
          </PersonItem>
        </Item>
      );
      expect(screen.getByTestId("metadata")).toBeInTheDocument();
    });
  });

  describe("navigable form (asChild)", () => {
    it("renders as link via Item asChild + Link", () => {
      render(
        <Item asChild>
          <Link href="/team/123/players/456">
            <PersonItem name="Alice" />
          </Link>
        </Item>
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/team/123/players/456"
      );
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  describe("static with actions form", () => {
    it("renders interactive ItemActions without link", () => {
      render(
        <Item>
          <PersonItem name="Alice" />
          <ItemActions>
            <button data-testid="action-btn">Edit</button>
          </ItemActions>
        </Item>
      );
      expect(screen.getByTestId("action-btn")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has no axe violations (static item)", async () => {
      const { container } = render(
        <Item>
          <PersonItem name="Alice" />
        </Item>
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations (navigable form)", async () => {
      const { container } = render(
        <Item asChild>
          <Link href="/team/123/players/456">
            <PersonItem name="Alice" />
          </Link>
        </Item>
      );
      expect(await axe(container)).toHaveNoViolations();
    });

    it("has no axe violations (static with actions)", async () => {
      const { container } = render(
        <Item>
          <PersonItem name="Alice" />
          <ItemActions>
            <button>Edit</button>
          </ItemActions>
        </Item>
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});

describe("PersonItemSkeleton", () => {
  it("renders media and content placeholders", () => {
    render(<PersonItemSkeleton />);
    expect(screen.getByTestId("person-item-skeleton-media")).toBeInTheDocument();
    expect(screen.getByTestId("person-item-skeleton-content")).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<PersonItemSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
