import { Button } from "@/components/ui/button";
import { render, screen } from "@testing-library/react";

jest.mock("react-icons/ri", () => ({
  RiLoader4Line: () => <span data-testid="spinner-icon">spinner</span>,
}));

describe("Button loading props", () => {
  describe("loading prop", () => {
    it("renders children normally when loading is false", () => {
      render(<Button>Submit</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Submit");
      expect(screen.queryByTestId("spinner-icon")).not.toBeInTheDocument();
    });

    it("shows spinner and disables button when loading is true", () => {
      render(<Button loading>Submit</Button>);
      const btn = screen.getByRole("button");
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(screen.getByTestId("spinner-icon")).toBeInTheDocument();
    });

    it("keeps children visible when loading without loadingText", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Submit");
    });

    it("merges with explicit disabled prop", () => {
      render(<Button disabled>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("loadingText prop", () => {
    it("replaces children with loadingText when loading and loadingText provided", () => {
      render(
        <Button loading loadingText="Saving...">
          Submit
        </Button>,
      );
      const btn = screen.getByRole("button");
      expect(btn).toHaveTextContent("Saving...");
      expect(btn).not.toHaveTextContent("Submit");
    });

    it("ignores loadingText when loading is false", () => {
      render(<Button loadingText="Saving...">Submit</Button>);
      expect(screen.getByRole("button")).toHaveTextContent("Submit");
      expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
    });
  });

  describe("asChild prop", () => {
    it("ignores loading when asChild is true", () => {
      render(
        <Button asChild loading>
          <a href="/test">Link</a>
        </Button>,
      );
      // asChild renders as anchor, not button — no disabled, no aria-busy
      const link = screen.getByRole("link");
      expect(link).not.toHaveAttribute("aria-busy");
      expect(screen.queryByTestId("spinner-icon")).not.toBeInTheDocument();
    });
  });
});
