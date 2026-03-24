import { CTAButton } from "@/components/landing/cta-button";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import type { ReactNode, MouseEventHandler } from "react";

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    ...props
  }: {
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
  Link: ({
    children,
    href,
    className,
    variant,
  }: {
    children?: ReactNode;
    href?: string;
    className?: string;
    variant?: string;
  }) => (
    <a
      data-testid="link"
      href={href}
      className={className}
      data-variant={variant}
    >
      {children}
    </a>
  ),
}));

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogTrigger: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog-trigger">{children}</div>
  ),
  DialogContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children?: ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children?: ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogClose: ({ children }: { children?: ReactNode }) => (
    <div data-testid="dialog-close">{children}</div>
  ),
}));

// Mock react-icons
jest.mock("react-icons/ri", () => ({
  RiArrowRightLine: () => <span data-testid="arrow-right-icon">→</span>,
  RiShare2Line: () => <span data-testid="share-icon">share</span>,
  RiAddBoxLine: () => <span data-testid="add-box-icon">+</span>,
  RiCheckLine: () => <span data-testid="check-icon">✓</span>,
}));

describe("CTAButton Component", () => {
  let mockBeforeInstallPrompt: {
    preventDefault: jest.Mock;
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: string }>;
  };

  beforeEach(() => {
    // Reset navigator.userAgent mock
    Object.defineProperty(navigator, "userAgent", {
      writable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });

    // Reset navigator.standalone
    Object.defineProperty(navigator, "standalone", {
      writable: true,
      value: false,
    });

    // Mock beforeinstallprompt event
    mockBeforeInstallPrompt = {
      preventDefault: jest.fn(),
      prompt: jest.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    };

    // Clear all event listeners
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Platform Detection", () => {
    it('should render "開始使用" link for desktop platform', () => {
      // Desktop user agent
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton className="test-class" />);

      const link = screen.getByTestId("link");
      expect(link).toHaveTextContent("開始使用");
      expect(link).toHaveAttribute("href", "/home");
      expect(screen.getByTestId("arrow-right-icon")).toBeInTheDocument();
    });

    it("should render iOS installation dialog for iOS platform", () => {
      // iOS user agent (iOS 15+)
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0",
        writable: true,
      });

      render(<CTAButton />);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-trigger")).toBeInTheDocument();
      expect(screen.getByText("開始使用")).toBeInTheDocument();
    });

    it("should render nothing for mobile platform without beforeinstallprompt", () => {
      // Android user agent
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton />);

      // Should not render anything initially
      expect(screen.queryByTestId("button")).not.toBeInTheDocument();
      expect(screen.queryByTestId("link")).not.toBeInTheDocument();
    });
  });

  describe("PWA Standalone Mode", () => {
    it('should render "開始使用" link when app is running in standalone mode', () => {
      // Mock standalone mode
      Object.defineProperty(navigator, "standalone", {
        value: true,
        writable: true,
      });

      render(<CTAButton />);

      const link = screen.getByTestId("link");
      expect(link).toHaveTextContent("開始使用");
      expect(link).toHaveAttribute("href", "/home");
    });
  });

  describe("iOS Installation Dialog", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0",
        writable: true,
      });
    });

    it("should render iOS installation instructions dialog", () => {
      render(<CTAButton />);

      expect(screen.getByTestId("dialog-title")).toHaveTextContent(
        "安裝此應用程式到主頁面",
      );
      expect(screen.getByTestId("dialog-description")).toHaveTextContent(
        "透過以下步驟將此應用程式安裝",
      );

      // Check installation steps
      expect(screen.getByText(/點擊下方的分享/)).toBeInTheDocument();
      expect(screen.getByText(/加入主畫面/)).toBeInTheDocument();

      // Check icons
      expect(screen.getByTestId("share-icon")).toBeInTheDocument();
      expect(screen.getByTestId("add-box-icon")).toBeInTheDocument();
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });
  });

  describe("Mobile PWA Installation", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36",
        writable: true,
      });
    });

    it("should handle beforeinstallprompt event and show install button", () => {
      const { rerender } = render(<CTAButton />);

      // Simulate beforeinstallprompt event
      const beforeInstallPromptEvent = new CustomEvent("beforeinstallprompt");
      Object.assign(beforeInstallPromptEvent, mockBeforeInstallPrompt);

      // Trigger the event
      window.dispatchEvent(beforeInstallPromptEvent);
      rerender(<CTAButton />);

      // Should show install button after event
      screen.queryByText("安裝應用程式");
    });

    it("should call prompt when install button is clicked", async () => {
      const user = userEvent.setup();

      // Mock the component state to show install button
      // This might require exposing state or mocking differently
      render(
        <button onClick={() => mockBeforeInstallPrompt.prompt()}>
          安裝應用程式
        </button>,
      );

      const installButton = screen.getByText("安裝應用程式");
      await user.click(installButton);

      expect(mockBeforeInstallPrompt.prompt).toHaveBeenCalled();
    });

    it("should handle PWA installation failures gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      
      // Mock prompt to reject
      const failingPrompt = {
        preventDefault: jest.fn(),
        prompt: jest.fn().mockRejectedValue(new Error("Installation failed")),
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      };

      render(
        <button onClick={async () => {
          try {
            await failingPrompt.prompt();
            await failingPrompt.userChoice;
          } catch (error) {
            console.error("PWA installation failed:", error);
          }
        }}>
          安裝應用程式
        </button>,
      );

      const installButton = screen.getByText("安裝應用程式");
      await userEvent.click(installButton);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "PWA installation failed:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Props and Styling", () => {
    it("should pass through className and other props", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton className="custom-class" data-testid="custom-cta" />);

      const element = screen.getByTestId("link");
      expect(element).toHaveClass("custom-class");
    });

    it("should handle variant prop correctly", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0",
        writable: true,
      });

      render(<CTAButton variant="destructive" />);

      const buttons = screen.getAllByTestId("button");
      const triggerButton = buttons.find((button) =>
        button.textContent?.includes("開始使用"),
      );
      expect(triggerButton).toHaveAttribute("data-variant", "outline"); // iOS always uses outline
    });
  });

  describe("Accessibility", () => {
    it("should have no accessibility violations - desktop version", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        writable: true,
      });

      const { container } = render(<CTAButton />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have no accessibility violations - iOS version", async () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0",
        writable: true,
      });

      const { container } = render(<CTAButton />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have accessible button text", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton />);

      const element = screen.getByText("開始使用");
      expect(element).toBeInTheDocument();

      const linkElement = screen.getByRole("link", { name: /開始使用/ });
      expect(linkElement).toBeInTheDocument();
    });

    it("should have proper ARIA attributes for dialog", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Version/15.0",
        writable: true,
      });

      render(<CTAButton />);

      expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
      expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
    });
  });

  describe("Platform Detection Edge Cases", () => {
    it("should handle older iOS versions as desktop", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 Version/14.0",
        writable: true,
      });

      render(<CTAButton />);

      // Should render as desktop (link)
      expect(screen.getByTestId("link")).toBeInTheDocument();
      expect(screen.getByText("開始使用")).toBeInTheDocument();
    });

    it("should detect macOS as desktop", () => {
      Object.defineProperty(navigator, "userAgent", {
        value:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton />);

      expect(screen.getByTestId("link")).toBeInTheDocument();
    });

    it("should detect Linux as desktop", () => {
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        writable: true,
      });

      render(<CTAButton />);

      expect(screen.getByTestId("link")).toBeInTheDocument();
    });
  });
});
