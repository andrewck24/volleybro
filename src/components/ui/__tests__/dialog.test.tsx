import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getContent = () =>
  document.querySelector('[data-slot="DialogContent"]') as HTMLElement;

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
    const body = document.querySelector('[data-slot="DialogBody"]');
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
    const body = document.querySelector('[data-slot="DialogBody"]');
    expect(body).toHaveClass("overflow-y-auto");

    const content = getContent();
    expect(content).toHaveClass("overflow-hidden");
    expect(content).not.toHaveClass("overflow-y-auto");
  });
});

describe("DialogContent structure", () => {
  it("owns no padding or gap utilities", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const content = getContent();
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
    const content = getContent();
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

describe("close button", () => {
  it("renders by default", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "關閉" })).toBeInTheDocument();
  });

  it("is absent when closeButton is false", () => {
    render(
      <Dialog open>
        <DialogContent closeButton={false}>
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(
      screen.queryByRole("button", { name: "關閉" }),
    ).not.toBeInTheDocument();
  });
});

describe("expand button", () => {
  it("is absent without onExpand", () => {
    render(
      <Dialog open>
        <DialogContent expandLabel="Expand">
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    expect(
      screen.queryByRole("button", { name: "Expand" }),
    ).not.toBeInTheDocument();
  });

  it("renders and fires onExpand when provided", async () => {
    const user = userEvent.setup();
    const onExpand = jest.fn();
    render(
      <Dialog open>
        <DialogContent onExpand={onExpand} expandLabel="Expand">
          <DialogTitle srOnly>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const btn = screen.getByRole("button", { name: "Expand" });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
