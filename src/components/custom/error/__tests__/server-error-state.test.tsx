import { render, screen, fireEvent } from "@testing-library/react";
import { ServerErrorState } from "@/components/custom/error/server-error-state";
import type { ReactNode, MouseEventHandler } from "react";

// Mock UI components
jest.mock("@/components/ui/alert", () => ({
  Alert: ({
    children,
    className,
    ...props
  }: {
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div role="alert" className={className} {...props}>
      {children}
    </div>
  ),
  AlertTitle: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => <h5 {...props}>{children}</h5>,
  AlertDescription: ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("react-icons/ri", () => ({
  RiAlertLine: () => <span>!</span>,
  RiRefreshLine: () => <span>↻</span>,
}));

describe("ServerErrorState", () => {
  it("renders a volleyball-themed error heading and description", () => {
    render(<ServerErrorState />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/球掉了/)).toBeInTheDocument();
    // Description should explain the error to the user
    expect(screen.getByText(/伺服器/)).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const handleRetry = jest.fn();
    render(<ServerErrorState onRetry={handleRetry} />);

    expect(screen.getByRole("button", { name: /再試一次/ })).toBeInTheDocument();
  });

  it("does NOT render retry button when onRetry is omitted", () => {
    render(<ServerErrorState />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const handleRetry = jest.fn();
    render(<ServerErrorState onRetry={handleRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /再試一次/ }));

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
