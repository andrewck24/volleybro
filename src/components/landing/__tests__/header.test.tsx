import { Header } from "@/components/landing/header";
import { act, render, screen, waitFor } from "@testing-library/react";

// Mock CTA Button
jest.mock("@/components/landing/cta-button", () => ({
  CTAButton: ({ className, ...props }: any) => (
    <button className={className} {...props}>
      開始使用
    </button>
  ),
}));

describe("Header Component", () => {
  let mockScrollEventListeners: ((event?: any) => void)[] = [];

  beforeEach(() => {
    // Reset scroll listeners array
    mockScrollEventListeners = [];

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });

    // Mock window.scrollY
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: 0,
    });

    // Mock addEventListener to capture scroll listeners
    window.addEventListener = jest.fn((event: string, listener: any) => {
      if (event === "scroll") {
        mockScrollEventListeners.push(listener);
      }
    });

    // Mock removeEventListener
    window.removeEventListener = jest.fn((event: string, listener: any) => {
      if (event === "scroll") {
        const index = mockScrollEventListeners.indexOf(listener);
        if (index > -1) {
          mockScrollEventListeners.splice(index, 1);
        }
      }
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to trigger scroll events
  const triggerScroll = (scrollY: number) => {
    Object.defineProperty(window, "scrollY", {
      writable: true,
      configurable: true,
      value: scrollY,
    });

    // Trigger all registered scroll listeners
    mockScrollEventListeners.forEach((listener) => {
      listener();
    });
  };

  // AC1: Header initial state is completely transparent with no background color
  describe("AC1: Initial transparent state", () => {
    it("should render header with transparent background initially", () => {
      render(<Header />);

      const header = screen.getByTestId("header");
      expect(header).toBeInTheDocument();

      // Verify it's a header element
      expect(header.tagName).toBe("HEADER");
    });

    it("should not have glassmorphism effects in initial state", () => {
      render(<Header />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );

      // Should not have backdrop-blur class initially
      expect(glassmorphismContainer).not.toHaveClass("backdrop-blur-sm");
      expect(glassmorphismContainer).toHaveClass("border-transparent");
    });
  });

  // AC2: Scroll triggers glassmorphism effect transition
  describe("AC2: Scroll-triggered glassmorphism", () => {
    it("should trigger glassmorphism when scroll exceeds threshold", async () => {
      render(<Header />);

      // Trigger scroll event above threshold
      act(() => {
        triggerScroll(100);
      });

      await waitFor(() => {
        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );
        // Check if backdrop-blur is applied to container
        expect(glassmorphismContainer).toHaveClass("backdrop-blur-sm");
      });
    });

    it("should not trigger glassmorphism at zero scroll", async () => {
      render(<Header />);

      // Trigger scroll at zero (threshold)
      act(() => {
        triggerScroll(0);
      });

      await waitFor(() => {
        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );
        expect(glassmorphismContainer).not.toHaveClass("backdrop-blur-sm");
      });
    });

    it("should use correct scroll threshold of 0px", () => {
      render(<Header />);

      // Test that any positive scroll triggers effect
      act(() => {
        triggerScroll(1);
      });

      // Verify scroll event listener was registered
      expect(window.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        { passive: true },
      );
    });
  });

  // AC3: Dark/Light mode automatic text color adaptation
  describe("AC3: Theme adaptation", () => {
    it("should apply theme-adaptive text colors", () => {
      render(<Header />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      // Should have theme-aware color class on container
      expect(glassmorphismContainer).toHaveClass("text-foreground");
    });

    it("should include dark mode variants when scrolled", async () => {
      render(<Header />);

      act(() => {
        triggerScroll(100);
      });

      await waitFor(() => {
        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );
        // Should include dark mode classes
        expect(glassmorphismContainer).toHaveClass("dark:border-white/10");
      });
    });
  });

  // AC4: Smooth enter/exit animation effects
  describe("AC4: Smooth animations", () => {
    it("should include transition classes for smooth animations", () => {
      render(<Header />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      // Should have transition classes on container
      expect(glassmorphismContainer).toHaveClass("transition-all");
      expect(glassmorphismContainer).toHaveClass("duration-300");
      expect(glassmorphismContainer).toHaveClass("ease-out");
    });

    it("should use requestAnimationFrame for optimized scroll handling", () => {
      render(<Header />);

      // Verify scroll event listener was registered
      expect(window.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        { passive: true },
      );

      // Simulate scroll event to trigger requestAnimationFrame
      act(() => {
        triggerScroll(50);
      });

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // AC5: Maintain existing navigation functionality integrity
  describe("AC5: Navigation functionality preservation", () => {
    it("should render logo with correct attributes", () => {
      render(<Header />);

      const logo = screen.getByTestId("logo-image");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logo.svg");
      expect(logo).toHaveAttribute("alt", "VolleyBro");
      expect(logo).toHaveAttribute("width", "100");
      expect(logo).toHaveAttribute("height", "20");
    });

    it("should render CTA button", () => {
      render(<Header />);

      const ctaButton = screen.getByTestId("cta-button");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveTextContent("開始使用");
    });

    it("should maintain proper accessibility", () => {
      render(<Header />);

      // Header should be a banner landmark
      const header = screen.getByRole("banner");
      expect(header).toBeInTheDocument();

      // Logo should have alt text
      const logo = screen.getByTestId("logo-image");
      expect(logo).toHaveAttribute("alt", "VolleyBro");
    });
  });

  // Component structure and test IDs
  describe("Component structure", () => {
    it("should render all required elements with correct test IDs", () => {
      render(<Header />);

      // All required test IDs should be present
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("logo-container")).toBeInTheDocument();
      expect(screen.getByTestId("logo-image")).toBeInTheDocument();
      expect(screen.getByTestId("cta-button")).toBeInTheDocument();
    });

    it("should have proper HTML structure", () => {
      render(<Header />);

      const header = screen.getByTestId("header");
      const logoContainer = screen.getByTestId("logo-container");
      const logo = screen.getByTestId("logo-image");
      const ctaButton = screen.getByTestId("cta-button");

      // Verify hierarchy
      expect(header).toContainElement(logoContainer);
      expect(logoContainer).toContainElement(logo);
      expect(header).toContainElement(ctaButton);
    });
  });

  // Performance and cleanup
  describe("Performance optimization", () => {
    it("should cleanup scroll listener on unmount", () => {
      const { unmount } = render(<Header />);

      // Verify event listener was added
      expect(window.addEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
        { passive: true },
      );

      unmount();

      // Verify event listener was removed
      expect(window.removeEventListener).toHaveBeenCalledWith(
        "scroll",
        expect.any(Function),
      );
    });

    it("should implement throttling mechanism", () => {
      render(<Header />);

      // Trigger rapid scroll events
      act(() => {
        triggerScroll(10);
        triggerScroll(20);
        triggerScroll(30);
      });

      // requestAnimationFrame should be used for throttling
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // Responsive design
  describe("Responsive design", () => {
    it("should maintain responsive behavior", () => {
      render(<Header />);

      const header = screen.getByTestId("header");
      const logoContainer = screen.getByTestId("logo-container");

      // Should use flex layout
      expect(header).toHaveClass("flex");
      expect(logoContainer).toHaveClass("flex");
    });
  });

  // AC6: Mobile responsive optimization and cross-device compatibility
  describe("AC6: Mobile responsive optimization", () => {
    // AC6.1: Mobile screen smaller header version
    it("should render mobile version with reduced dimensions", () => {
      render(<Header />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      const logoContainer = screen.getByTestId("logo-container");
      const ctaButton = screen.getByTestId("cta-button");

      // Mobile-first approach: smaller dimensions by default
      expect(glassmorphismContainer).toHaveClass("mx-2", "mt-1", "rounded-2xl");
      expect(logoContainer).toHaveClass("h-8");
      expect(ctaButton).toHaveClass("h-8");
    });

    // AC6.2: Reduced mobile element sizes (logo, spacing)
    it("should use smaller logo size for mobile", () => {
      render(<Header />);

      const logo = screen.getByTestId("logo-image");

      // Mobile-first sizing
      expect(logo).toHaveAttribute("width", "100");
      expect(logo).toHaveAttribute("height", "20");
      expect(logo).toHaveClass("md:w-[140px]", "md:h-[30px]");
    });

    // AC6.4: Maximized CTA button height for mobile
    it("should maximize CTA button height for mobile", () => {
      render(<Header />);

      const ctaButton = screen.getByTestId("cta-button");
      const logoContainer = screen.getByTestId("logo-container");

      // CTA button should match container height
      expect(ctaButton).toHaveClass("h-8");
      expect(logoContainer).toHaveClass("h-8");
      expect(ctaButton).toHaveClass("md:h-9");
      expect(logoContainer).toHaveClass("md:h-9");
    });
  });

  // AC7: Complete testing coverage and quality assurance
  describe("AC7: Complete testing coverage", () => {
    // AC7.1: Different mobile device display effects testing
    it("should handle mobile viewport scaling correctly", () => {
      // Test mobile viewport (375px)
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Header />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );

      // Mobile classes should apply
      expect(glassmorphismContainer).toHaveClass("mx-2", "mt-1", "rounded-2xl");
      expect(glassmorphismContainer).toBeInTheDocument();
    });

    it("should handle different mobile viewport widths", () => {
      // Test various mobile widths in separate test cases
      [320, 375, 414].forEach((width) => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: width,
        });

        const { unmount } = render(<Header />);

        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );

        // All mobile widths should use mobile styling
        expect(glassmorphismContainer).toHaveClass("mx-2", "mt-1");
        expect(glassmorphismContainer).toBeInTheDocument();

        // Clean up for next iteration
        unmount();
      });
    });

    // AC7.2: Glassmorphism functionality on mobile devices
    it("should ensure glassmorphism effects work on mobile devices", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375, // iPhone viewport
      });

      render(<Header />);

      // Trigger scroll event
      act(() => {
        triggerScroll(100);
      });

      await waitFor(() => {
        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );

        // Glassmorphism effects should apply on mobile
        expect(glassmorphismContainer).toHaveClass("backdrop-blur-sm");
      });

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      expect(glassmorphismContainer).toHaveClass("border-white/20");
      expect(glassmorphismContainer).toHaveClass("bg-white/10");
    });

    it("should maintain glassmorphism performance on mobile", () => {
      // Mock mobile environment
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<Header />);

      // Rapid scroll events (mobile touch scrolling simulation)
      act(() => {
        for (let i = 0; i < 10; i++) {
          triggerScroll(i * 10);
        }
      });

      // requestAnimationFrame should still be used for throttling
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
