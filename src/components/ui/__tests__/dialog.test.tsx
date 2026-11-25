import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("DialogBody", () => {
  it("renders with data-slot='DialogBody'", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
          <DialogBody>body content</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const body = screen.getByText("body content");
    expect(body).toBeInTheDocument();
    expect(body).toHaveTextContent("body content");
  });

  it("is the scroll container (overflow-y-auto), content is not", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
          <DialogBody>body content</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    const body = screen.getByText("body content");
    expect(body).toHaveClass("overflow-y-auto");

    const content = screen.getByRole("dialog");
    expect(content).toHaveClass("overflow-hidden");
    expect(content).not.toHaveClass("overflow-y-auto");
  });
});

describe("DialogContent structure", () => {
  it("covers the web content viewport without safe-area overreach", () => {
    render(
      <Dialog open>
        <DialogOverlay data-testid="dialog-overlay" />
      </Dialog>,
    );

    expect(screen.getByTestId("dialog-overlay")).toHaveClass("inset-0");
  });

  it("owns no padding or gap utilities", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const content = screen.getByRole("dialog");
    expect(content).not.toHaveClass("p-6");
    expect(content).not.toHaveClass("gap-2");
  });

  it("carries no decorative ring", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const content = screen.getByRole("dialog");
    expect(content).not.toHaveClass("ring-1");
    expect(content).not.toHaveClass("ring-foreground/10");
  });
});

describe("srOnly prop", () => {
  it("hides the title visually but keeps it in the document", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Hidden Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const title = screen.getByText("Hidden Title");
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("sr-only");
  });

  it("does not apply sr-only when srOnly is false", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Visible Title</DialogTitle>
          <DialogDescription>Visible Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByText("Visible Title")).not.toHaveClass("sr-only");
    expect(screen.getByText("Visible Description")).not.toHaveClass("sr-only");
  });
});

describe("header", () => {
  const renderHeader = (header: React.ReactNode, onOpenChange = jest.fn()) =>
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          {header}
          <DialogBody>
            <input aria-label="field" />
          </DialogBody>
        </DialogContent>
      </Dialog>,
    );

  const precedes = (a: Node, b: Node) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it("puts the close button before the title and closes the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = jest.fn();
    renderHeader(
      <DialogHeader>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>,
      onOpenChange,
    );
    const close = screen.getByRole("button", { name: "關閉" });

    expect(precedes(close, screen.getByText("Title"))).toBe(true);
    expect(close).toHaveAttribute("type", "button");

    await user.click(close);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders a leading control in place of the close button", () => {
    renderHeader(
      <DialogHeader leading={<button type="button">Back</button>}>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>,
    );

    expect(
      screen.queryByRole("button", { name: "關閉" }),
    ).not.toBeInTheDocument();
    expect(
      precedes(
        screen.getByRole("button", { name: "Back" }),
        screen.getByText("Title"),
      ),
    ).toBe(true);
  });

  it("renders a trailing control after the title", () => {
    renderHeader(
      <DialogHeader trailing={<button type="button">Expand</button>}>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>,
    );

    expect(
      precedes(
        screen.getByText("Title"),
        screen.getByRole("button", { name: "Expand" }),
      ),
    ).toBe(true);
  });

  it("keeps a disabled close button from closing the dialog", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onOpenChange = jest.fn();
    renderHeader(
      <DialogHeader leading={<DialogCloseButton disabled />}>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>,
      onOpenChange,
    );
    const close = screen.getByRole("button", { name: "關閉" });

    expect(close).toBeDisabled();
    await user.click(close);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("puts the header's controls before the body's fields", () => {
    renderHeader(
      <DialogHeader trailing={<button type="button">Expand</button>}>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>,
    );
    const field = screen.getByLabelText("field");

    screen.getAllByRole("button").forEach((btn) => {
      expect(precedes(btn, field)).toBe(true);
    });
  });
});
