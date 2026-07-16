import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fireEvent, render, screen } from "@testing-library/react";

describe("AlertDialog primitive convergence", () => {
  const renderOpen = (onOpenChange = jest.fn()) =>
    render(
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete item</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          <AlertDialogBody>Body content</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );

  it("renders AlertDialogBody with its data-slot", () => {
    renderOpen();
    const body = screen.getByText("Body content");
    expect(body).toHaveAttribute("data-slot", "AlertDialogBody");
  });

  it("covers the web content viewport without safe-area overreach", () => {
    render(
      <AlertDialog open>
        <AlertDialogOverlay data-testid="alert-dialog-overlay" />
      </AlertDialog>,
    );
    expect(screen.getByTestId("alert-dialog-overlay")).toHaveClass("inset-0");
  });

  it("renders content on bg-card with no decorative ring", () => {
    renderOpen();
    const content = screen.getByRole("alertdialog");
    expect(content).toHaveClass("bg-card");
    expect(content).not.toHaveClass("ring-1", "ring-foreground/10");
  });

  it("renders no top-right close button", () => {
    renderOpen();
    // Only the Radix content region; no auto close control like Dialog's.
    expect(
      screen.queryByRole("button", { name: /close/i }),
    ).not.toBeInTheDocument();
  });

  it("does not close on Escape (footer is the only exit)", () => {
    const onOpenChange = jest.fn();
    renderOpen(onOpenChange);
    fireEvent.keyDown(screen.getByRole("alertdialog"), {
      key: "Escape",
      code: "Escape",
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("srOnly hides title/description visually but keeps them in the document", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle srOnly>Hidden title</AlertDialogTitle>
          <AlertDialogDescription srOnly>Hidden desc</AlertDialogDescription>
          <AlertDialogBody>Body</AlertDialogBody>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const title = screen.getByText("Hidden title");
    const desc = screen.getByText("Hidden desc");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("sr-only");
    expect(desc).toBeInTheDocument();
    expect(desc).toHaveClass("sr-only");
  });
});
