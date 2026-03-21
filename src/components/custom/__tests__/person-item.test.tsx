import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "jest-axe";
import { PersonItem } from "@/components/custom/person-item";

// Mock react-icons
jest.mock("react-icons/fi", () => ({
  FiUser: (props: React.SVGAttributes<SVGElement>) => (
    <svg data-testid="fi-user-icon" {...props} />
  ),
}));

describe("PersonItem", () => {
  describe("rendering", () => {
    it("renders name text", () => {
      render(<PersonItem name="Alice" />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    it("renders avatar fallback icon when no image provided", () => {
      render(<PersonItem name="Alice" />);
      expect(screen.getByTestId("fi-user-icon")).toBeInTheDocument();
    });

    it("renders avatar image when image prop is provided", () => {
      render(<PersonItem name="Alice" image="/avatar.png" />);
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/avatar.png");
      expect(img).toHaveAttribute("alt", "Alice");
    });

    it("renders children in metadata area", () => {
      render(
        <PersonItem name="Alice">
          <span data-testid="metadata">#7 OH</span>
        </PersonItem>
      );
      expect(screen.getByTestId("metadata")).toBeInTheDocument();
    });

    it("renders action slot content", () => {
      render(
        <PersonItem
          name="Alice"
          action={<button data-testid="action-btn">Edit</button>}
        />
      );
      expect(screen.getByTestId("action-btn")).toBeInTheDocument();
    });
  });

  describe("navigation pattern", () => {
    it("renders as Link when href is provided", () => {
      render(<PersonItem name="Alice" href="/team/123/players/456" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/team/123/players/456");
    });

    it("renders as button when onClick is provided", () => {
      const handleClick = jest.fn();
      render(<PersonItem name="Alice" onClick={handleClick} />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("renders as div when neither href nor onClick is provided", () => {
      const { container } = render(<PersonItem name="Alice" />);
      expect(container.querySelector("a")).toBeNull();
      expect(container.querySelector("button")).toBeNull();
      expect(container.firstChild?.nodeName).toBe("DIV");
    });

    it("prefers href over onClick when both provided", () => {
      const handleClick = jest.fn();
      render(
        <PersonItem
          name="Alice"
          href="/team/123"
          onClick={handleClick}
        />
      );
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
  });

  describe("action slot event isolation", () => {
    it("action button click does not trigger parent Link navigation", () => {
      const actionClick = jest.fn();
      render(
        <PersonItem
          name="Alice"
          href="/team/123"
          action={
            <button data-testid="action-btn" onClick={actionClick}>
              Edit
            </button>
          }
        />
      );

      const actionBtn = screen.getByTestId("action-btn");
      fireEvent.click(actionBtn);
      expect(actionClick).toHaveBeenCalledTimes(1);
    });

    it("action button click does not trigger parent onClick", () => {
      const parentClick = jest.fn();
      const actionClick = jest.fn();
      render(
        <PersonItem
          name="Alice"
          onClick={parentClick}
          action={
            <button data-testid="action-btn" onClick={actionClick}>
              Edit
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

  describe("accessibility", () => {
    it("has no axe violations (static)", async () => {
      const { container } = render(<PersonItem name="Alice" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations (link)", async () => {
      const { container } = render(
        <PersonItem name="Alice" href="/team/123" />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has no axe violations (button)", async () => {
      const { container } = render(
        <PersonItem name="Alice" onClick={() => {}} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
