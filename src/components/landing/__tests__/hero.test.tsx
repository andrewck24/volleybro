import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { Hero } from "../hero";

// Mock dependencies

jest.mock("@/components/landing/cta-button", () => ({
  CTAButton: ({ className, size, ...props }: any) => (
    <button data-testid="cta-button" className={className} {...props}>
      立即體驗
    </button>
  ),
}));

jest.mock("@/components/landing/header", () => ({
  Header: ({ observerRef }: any) => (
    <header data-testid="header" ref={observerRef}>
      Header Component
    </header>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => (
    <div data-testid="badge" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/flip-words", () => ({
  FlipWords: ({ words, className }: any) => (
    <span data-testid="flip-words" className={className}>
      {words[0]}
    </span>
  ),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, fill, priority, ...props }: any) => (
    <div
      data-testid="hero-image"
      data-src={src}
      data-alt={alt}
      data-fill={fill ? "true" : "false"}
      data-priority={priority ? "true" : "false"}
      role="img"
      aria-label={alt}
      {...props}
    />
  ),
}));

// Mock motion/react
jest.mock("motion/react", () => ({
  motion: {
    section: ({ children, className, style, ...props }: any) => (
      <section className={className} style={style} {...props}>
        {children}
      </section>
    ),
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    h1: ({ children, className, ...props }: any) => (
      <h1 className={className} {...props}>
        {children}
      </h1>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>
        {children}
      </span>
    ),
  },
  useScroll: () => ({ scrollY: { get: () => 0 } }),
  useTransform: (_value: any, _input: any, output: any) => ({
    get: () => output[0],
  }),
  useSpring: (value: any) => value,
}));

describe("Hero Component", () => {
  describe("Component Structure", () => {
    it("should render all main sections", () => {
      render(<Hero />);

      // Header
      expect(screen.getByTestId("header")).toBeInTheDocument();

      // Badge
      expect(screen.getByTestId("badge")).toBeInTheDocument();

      // Main heading
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

      // CTA Button
      expect(screen.getByTestId("cta-button")).toBeInTheDocument();

      // Hero Image
      expect(screen.getByTestId("hero-image")).toBeInTheDocument();
    });

    it("should render correct main heading text", () => {
      render(<Hero />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("讓排球賽事紀錄");
      expect(heading).toHaveTextContent("更加");
    });

    it("should render description text", () => {
      render(<Hero />);

      const description =
        screen.getByText(/專為排球教練與管理者設計的數位化解決方案/);
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent(
        "讓您告別紙筆記錄，擁抱智慧化團隊管理",
      );
    });
  });

  describe("Interactive Elements", () => {
    it("should render preview badge with correct content", () => {
      render(<Hero />);

      const badge = screen.getByTestId("badge");
      expect(badge).toHaveTextContent("Preview");
    });

    it("should render FlipWords component with correct words", () => {
      render(<Hero />);

      const flipWords = screen.getByTestId("flip-words");
      expect(flipWords).toBeInTheDocument();
      expect(flipWords).toHaveTextContent("簡單"); // Should show first word
    });

    it("should render status indicators", () => {
      render(<Hero />);

      const statusContainer = screen.getByTestId("status-indicators");
      expect(statusContainer).toBeInTheDocument();
      
      expect(screen.getByText("即時同步")).toBeInTheDocument();
      expect(screen.getByText("跨平台支援")).toBeInTheDocument();
      expect(screen.getByText("快速紀錄")).toBeInTheDocument();
    });

    it("should render CTA button with correct styling", () => {
      render(<Hero />);

      const ctaButton = screen.getByTestId("cta-button");
      expect(ctaButton).toHaveClass("h-12", "w-full", "px-8", "text-lg");
      expect(ctaButton).toHaveClass("shadow-2xl");
    });
  });

  describe("Hero Image", () => {
    it("should render hero image with correct attributes", () => {
      render(<Hero />);

      const heroImage = screen.getByTestId("hero-image");
      expect(heroImage).toHaveAttribute("data-src", "/landing/hero.svg");
      expect(heroImage).toHaveAttribute("data-alt", "VolleyBro App Interface");
    });

    it("should have correct image styling classes", () => {
      render(<Hero />);

      const heroImage = screen.getByTestId("hero-image");
      expect(heroImage).toHaveClass(
        "object-contain",
        "object-right",
        "dark:invert",
      );
    });
  });

  describe("Layout and Styling", () => {
    it("should have correct hero section classes", () => {
      render(<Hero />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toBeInTheDocument();
      expect(heroSection).toHaveClass(
        "relative",
        "flex",
        "h-[calc(100vh-3.25rem)]",
      );
    });

    it("should render gradient overlays", () => {
      render(<Hero />);

      // Check for gradient overlay elements using testid
      const gradientOverlay = screen.getByTestId("gradient-overlay");
      expect(gradientOverlay).toBeInTheDocument();
      expect(gradientOverlay).toHaveClass("bg-gradient-to-t");
    });
  });

  describe("Accessibility", () => {
    it("should have no accessibility violations", async () => {
      const { container } = render(<Hero />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should have proper heading hierarchy", () => {
      render(<Hero />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
      expect(h1).toHaveAccessibleName();
    });

    it("should have accessible image alt text", () => {
      render(<Hero />);

      const heroImage = screen.getByRole("img");
      expect(heroImage).toHaveAccessibleName("VolleyBro App Interface");
    });

    it("should have accessible button", () => {
      render(<Hero />);

      const ctaButton = screen.getByRole("button");
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveTextContent("立即體驗");
    });
  });

  describe("Responsive Design", () => {
    it("should have responsive classes for different screen sizes", () => {
      render(<Hero />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveClass("text-5xl", "md:text-7xl", "lg:text-8xl");

      const description = screen.getByText(/專為排球教練與管理者設計/);
      expect(description).toHaveClass("text-xl");

      const ctaButton = screen.getByTestId("cta-button");
      expect(ctaButton).toHaveClass("h-12", "w-full");
    });
  });

  describe("Performance Optimizations", () => {
    it("should render hero image with priority loading", () => {
      render(<Hero />);

      const heroImage = screen.getByTestId("hero-image");
      expect(heroImage).toHaveAttribute("data-priority", "true");
    });

    it("should render background elements separately", () => {
      render(<Hero />);

      // Background decorations should be present
      const backgroundDecorations = screen.getByTestId("background-decorations");
      const gradientOverlay = screen.getByTestId("gradient-overlay");
      const heroImageContainer = screen.getByTestId("hero-image-container");
      
      expect(backgroundDecorations).toBeInTheDocument();
      expect(gradientOverlay).toBeInTheDocument();
      expect(heroImageContainer).toBeInTheDocument();
    });
  });
});
