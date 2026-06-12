import { render, screen, fireEvent } from "@testing-library/react";
import { EditDialogContainer } from "@/components/layout/edit-dialog-container";
import { suppressLeaveWarning } from "@/hooks/use-leave-page-warning";

const mockBack = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/hooks/use-leave-page-warning", () => ({
  suppressLeaveWarning: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const clearDraft = jest.fn();

describe("EditDialogContainer", () => {
  it("renders title and children", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={false}
        clearDraft={clearDraft}
      >
        <div>form content</div>
      </EditDialogContainer>,
    );
    expect(screen.getByText("編輯球隊")).toBeInTheDocument();
    expect(screen.getByText("form content")).toBeInTheDocument();
  });

  it("calls router.back() immediately when not dirty", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={false}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "關閉" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("放棄變更？")).not.toBeInTheDocument();
  });

  it("shows AlertDialog when dirty and close is clicked", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={true}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "關閉" }));
    expect(screen.getByText("放棄變更？")).toBeInTheDocument();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("clears draft and navigates back on discard confirm", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={true}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "關閉" }));
    fireEvent.click(screen.getByRole("button", { name: "放棄變更" }));
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("maximize does not call router.back (uses hard navigation)", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={false}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "全頁模式" }));
    // window.location.assign is hard navigation; router.back is not called
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("maximize calls suppressLeaveWarning before hard navigation", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={true}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    fireEvent.click(screen.getByRole("button", { name: "全頁模式" }));

    expect(suppressLeaveWarning).toHaveBeenCalledTimes(1);
  });

  it("does not have aria-describedby on dialog content", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={false}
        clearDraft={clearDraft}
      >
        <div>form</div>
      </EditDialogContainer>,
    );
    // aria-describedby={undefined} prevents Radix from injecting a generated describedby id
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });

  it("wraps children in overflow-y-auto scroll container", () => {
    render(
      <EditDialogContainer
        title="編輯球隊"
        fullPageHref="/team/123/edit"
        isDirty={false}
        clearDraft={clearDraft}
      >
        <div data-testid="child-content">form</div>
      </EditDialogContainer>,
    );
    const scrollContainer = screen.getByTestId("dialog-scroll-container");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });
});
