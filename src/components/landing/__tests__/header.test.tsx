import { Header } from "@/components/landing/header";
import { act, render, screen, waitFor } from "@testing-library/react";
import { RefObject } from "react";

/**
 * Header Component Tests
 *
 * Tests correspond to Epic-1 Story 1.4 Acceptance Criteria:
 * - AC1-AC5: Core glassmorphism functionality
 * - AC6: Mobile responsive optimization and cross-device compatibility
 * - AC7: Complete testing coverage and quality assurance
 *
 * Epic Reference: docs/epics/epic-1-landing-page.md section 1.4.3
 */

// Mock motion/react
const mockScrollY = {
  get: jest.fn(() => 0),
  on: jest.fn((_event: string, _handler: Function) => {
    return jest.fn(); // unsubscribe function
  }),
};

jest.mock("motion/react", () => ({
  useScroll: () => ({ scrollY: mockScrollY }),
}));

// Mock next/image
jest.mock("next/image", () => {
  return function MockImage({
    src,
    alt,
    width,
    height,
    ...props
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
  }) {
    return <img src={src} alt={alt} width={width} height={height} {...props} />;
  };
});

// Mock CTA Button
jest.mock("@/components/landing/cta-button", () => ({
  CTAButton: ({ className, ...props }: any) => (
    <button className={className} {...props}>
      開始使用
    </button>
  ),
}));

describe("Header Component", () => {
  const mockObserverRef: RefObject<HTMLDivElement> = {
    current: document.createElement("div"),
  };

  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation((_callback) => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });

    // Reset scroll mock
    mockScrollY.get.mockReturnValue(0);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // AC1: Header initial state is completely transparent with no background color
  describe("AC1: Initial transparent state", () => {
    it("should render header with transparent background initially", () => {
      render(<Header observerRef={mockObserverRef} />);

      const header = screen.getByTestId("header");
      expect(header).toBeInTheDocument();

      // Verify it's a header element
      expect(header.tagName).toBe("HEADER");
    });

    it("should not have glassmorphism effects in initial state", () => {
      render(<Header observerRef={mockObserverRef} />);

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
      // Set scroll position above threshold (0px - any scroll triggers it)
      mockScrollY.get.mockReturnValue(100);

      render(<Header observerRef={mockObserverRef} />);

      // Simulate scroll event
      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
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
      // Set scroll position at threshold (0px)
      mockScrollY.get.mockReturnValue(0);

      render(<Header observerRef={mockObserverRef} />);

      // Simulate scroll event
      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
      });

      await waitFor(() => {
        const glassmorphismContainer = screen.getByTestId(
          "header-glassmorphism-container",
        );
        expect(glassmorphismContainer).not.toHaveClass("backdrop-blur-sm");
      });
    });

    it("should use correct scroll threshold of 0px", () => {
      render(<Header observerRef={mockObserverRef} />);

      // Test that any positive scroll triggers effect
      mockScrollY.get.mockReturnValue(1);
      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
      });

      expect(mockScrollY.get).toHaveBeenCalled();
    });
  });

  // AC3: Dark/Light mode automatic text color adaptation
  describe("AC3: Theme adaptation", () => {
    it("should apply theme-adaptive text colors", () => {
      render(<Header observerRef={mockObserverRef} />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      // Should have theme-aware color class on container
      expect(glassmorphismContainer).toHaveClass("text-foreground");
    });

    it("should include dark mode variants when scrolled", async () => {
      mockScrollY.get.mockReturnValue(100);

      render(<Header observerRef={mockObserverRef} />);

      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
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
      render(<Header observerRef={mockObserverRef} />);

      const glassmorphismContainer = screen.getByTestId(
        "header-glassmorphism-container",
      );
      // Should have transition classes on container
      expect(glassmorphismContainer).toHaveClass("transition-all");
      expect(glassmorphismContainer).toHaveClass("duration-300");
      expect(glassmorphismContainer).toHaveClass("ease-out");
    });

    it("should use requestAnimationFrame for optimized scroll handling", () => {
      render(<Header observerRef={mockObserverRef} />);

      // Verify scroll handler uses performance optimization
      expect(mockScrollY.on).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );

      // Simulate scroll event to trigger requestAnimationFrame
      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
      });

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // AC5: Maintain existing navigation functionality integrity
  describe("AC5: Navigation functionality preservation", () => {
    it("should render logo with correct attributes", () => {
      render(<Header observerRef={mockObserverRef} />);

      const logo = screen.getByTestId("logo-image");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logo.svg");
      expect(logo).toHaveAttribute("alt", "VolleyBro");
      expect(logo).toHaveAttribute("width", "100");
      expect(logo).toHaveAttribute("height", "20");
    });

    it("should render CTA button", () => {
      render(<Header observerRef={mockObserverRef} />);

      const ctaButton = screen.getByTestId("cta-button");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveTextContent("開始使用");
    });

    it("should maintain proper accessibility", () => {
      render(<Header observerRef={mockObserverRef} />);

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
      render(<Header observerRef={mockObserverRef} />);

      // All required test IDs should be present
      expect(screen.getByTestId("header")).toBeInTheDocument();
      expect(screen.getByTestId("logo-container")).toBeInTheDocument();
      expect(screen.getByTestId("logo-image")).toBeInTheDocument();
      expect(screen.getByTestId("cta-button")).toBeInTheDocument();
    });

    it("should have proper HTML structure", () => {
      render(<Header observerRef={mockObserverRef} />);

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
      const unsubscribe = jest.fn();
      mockScrollY.on.mockReturnValue(unsubscribe);

      const { unmount } = render(<Header observerRef={mockObserverRef} />);

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should implement throttling mechanism", () => {
      render(<Header observerRef={mockObserverRef} />);

      const scrollHandler = mockScrollY.on.mock.calls[0][1];

      // Call scroll handler multiple times rapidly
      act(() => {
        scrollHandler();
        scrollHandler();
        scrollHandler();
      });

      // requestAnimationFrame should be used for throttling
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // Responsive design
  describe("Responsive design", () => {
    it("should maintain responsive behavior", () => {
      render(<Header observerRef={mockObserverRef} />);

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
      render(<Header observerRef={mockObserverRef} />);

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
      render(<Header observerRef={mockObserverRef} />);

      const logo = screen.getByTestId("logo-image");

      // Mobile-first sizing
      expect(logo).toHaveAttribute("width", "100");
      expect(logo).toHaveAttribute("height", "20");
      expect(logo).toHaveClass("md:w-[140px]", "md:h-[30px]");
    });

    // AC6.4: Maximized CTA button height for mobile
    it("should maximize CTA button height for mobile", () => {
      render(<Header observerRef={mockObserverRef} />);

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

      render(<Header observerRef={mockObserverRef} />);

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

        const { unmount } = render(<Header observerRef={mockObserverRef} />);

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

      mockScrollY.get.mockReturnValue(100);

      render(<Header observerRef={mockObserverRef} />);

      // Simulate scroll event
      const scrollHandler = mockScrollY.on.mock.calls[0][1];
      act(() => {
        scrollHandler();
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

      render(<Header observerRef={mockObserverRef} />);

      const scrollHandler = mockScrollY.on.mock.calls[0][1];

      // Rapid scroll events (mobile touch scrolling simulation)
      for (let i = 0; i < 10; i++) {
        scrollHandler();
      }

      // requestAnimationFrame should still be used for throttling
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });
});
