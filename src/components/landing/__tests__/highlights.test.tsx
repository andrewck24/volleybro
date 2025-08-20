import { Highlights } from "@/components/landing/highlights";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, fill, ...props }: any) => (
    <img
      data-testid="highlight-image"
      src={src}
      alt={alt}
      data-fill={fill ? "true" : "false"}
      {...props}
    />
  ),
}));

// Mock motion/react hooks - match Features component exactly
jest.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      whileInView,
      initial,
      animate,
      transition,
      ...props
    }: any) => (
      <div className={className} style={style} {...props}>
        {children}
      </div>
    ),
    section: ({
      children,
      className,
      ref,
      style,
      initial,
      whileInView,
      transition,
      ...props
    }: any) => (
      <section className={className} ref={ref} style={style} {...props}>
        {children}
      </section>
    ),
    p: ({
      children,
      className,
      initial,
      animate,
      transition,
      ...props
    }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
  useInView: jest.fn(() => true),
  useScroll: jest.fn(() => ({ scrollYProgress: { get: () => 0 } })),
  useSpring: jest.fn((value) => value),
  useTransform: jest.fn(() => ({ get: () => 0 })),
}));

// Mock utils
jest.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock react-icons
jest.mock("react-icons/ri", () => ({
  RiRecordCircleLine: () => (
    <div data-testid="ri-record-circle-line">RecordIcon</div>
  ),
  RiBarChartLine: () => <div data-testid="ri-bar-chart-line">BarChartIcon</div>,
  RiTeamLine: () => <div data-testid="ri-team-line">TeamIcon</div>,
  RiSmartphoneLine: () => (
    <div data-testid="ri-smartphone-line">SmartphoneIcon</div>
  ),
}));

describe("Highlights TDD Implementation", () => {
  const expectedHighlights = [
    {
      title: "提供簡單易用的賽事記錄工具",
      description: "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
      icon: "ri-record-circle-line",
    },
    {
      title: "透過強大的數據分析功能",
      description: "深入了解球隊表現，以數據驅動戰術改進",
      icon: "ri-bar-chart-line",
    },
    {
      title: "有效掌握球員資訊與表現變化",
      description: "協助陣容安排，讓每場比賽都有最佳配置",
      icon: "ri-team-line",
    },
    {
      title: "無論是手機、平板或電腦",
      description: "隨時隨地輕鬆使用，不受設備限制",
      icon: "ri-smartphone-line",
    },
  ];

  describe("Red Phase - Failing Tests", () => {
    describe("Component Structure Tests", () => {
      it("should render Highlights with sticky scroll container like Features", () => {
        render(<Highlights />);

        // Section should have high height for scroll triggering like Features
        const section = screen.getByTestId("highlights-section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass("relative");
      });

      it("should render sticky container with proper positioning", () => {
        render(<Highlights />);

        const stickyContainer = screen.getByTestId("sticky-container");
        expect(stickyContainer).toBeInTheDocument();
        expect(stickyContainer).toHaveClass(
          "sticky",
          "top-0",
          "h-screen",
          "overflow-hidden",
        );
      });

      it("should render title section within sticky container", () => {
        render(<Highlights />);

        const title = screen.getByRole("heading", { level: 2 });
        expect(title).toBeInTheDocument();
        expect(title).toHaveTextContent("四大核心特色");
      });

      it("should render four feature highlight cards", () => {
        render(<Highlights />);

        const cards = screen.getAllByTestId("highlight-card");
        expect(cards).toHaveLength(4);
      });

      it("should render horizontal scrolling cards container", () => {
        render(<Highlights />);

        const cardsContainer = screen.getByTestId("highlights-cards-container");
        expect(cardsContainer).toBeInTheDocument();
        expect(cardsContainer).toHaveClass("will-change-transform");
      });
    });

    describe("Content Verification Tests", () => {
      it("should display correct feature titles for all four highlights", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          expect(screen.getByText(highlight.title)).toBeInTheDocument();
        });
      });

      it("should display correct feature descriptions for all four highlights", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          expect(screen.getByText(highlight.description)).toBeInTheDocument();
        });
      });

      it("should display numbered badges for each highlight (1-4)", () => {
        render(<Highlights />);

        for (let i = 1; i <= 4; i++) {
          const badge = screen.getByTestId(`highlight-badge-${i}`);
          expect(badge).toBeInTheDocument();
          expect(badge).toHaveTextContent(i.toString());
        }
      });

      it("should render correct icons for each feature", () => {
        render(<Highlights />);

        expect(screen.getByTestId("ri-record-circle-line")).toBeInTheDocument();
        expect(screen.getByTestId("ri-bar-chart-line")).toBeInTheDocument();
        expect(screen.getByTestId("ri-team-line")).toBeInTheDocument();
        expect(screen.getByTestId("ri-smartphone-line")).toBeInTheDocument();
      });
    });

    describe("Sticky Scroll and Animation Tests", () => {
      it("should have correct section height for scroll triggering", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveClass("h-[400vh]");
      });

      it("should have proper performance optimizations like Features", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveStyle({
          isolation: "isolate",
          contain: "layout style paint",
        });
      });

      it("should have sticky container with GPU acceleration", () => {
        render(<Highlights />);

        const stickyContainer = screen.getByTestId("sticky-container");
        expect(stickyContainer).toHaveStyle({
          willChange: "auto",
          transform: "translateZ(0)",
        });
      });

      it("should have responsive gap classes for cards container", () => {
        render(<Highlights />);

        const cardsContainer = screen.getByTestId("highlights-cards-container");
        expect(cardsContainer).toHaveClass("gap-6", "md:gap-8");
      });
    });

    describe("Visual Design Tests", () => {
      it("should render cards with Features-style design", () => {
        render(<Highlights />);

        const cards = screen.getAllByTestId("highlight-card");
        cards.forEach((card) => {
          expect(card).toHaveClass("rounded-3xl", "shadow-2xl");
          expect(card).toHaveClass(
            "bg-gradient-to-t",
            "from-background",
            "via-background/95",
            "to-primary/20",
          );
          expect(card).toHaveClass(
            "border",
            "border-border/50",
            "backdrop-blur-sm",
          );
        });
      });

      it("should render numbered badges with Features styling", () => {
        render(<Highlights />);

        for (let i = 1; i <= 4; i++) {
          const badge = screen.getByTestId(`highlight-badge-${i}`);
          expect(badge).toHaveClass(
            "inline-flex",
            "h-16",
            "w-16",
            "items-center",
            "justify-center",
            "rounded-full",
            "bg-primary",
            "text-primary-foreground",
          );
          const badgeText = badge.querySelector("span");
          expect(badgeText).toHaveClass("text-2xl", "font-bold");
        }
      });

      it("should render feature titles with Features typography", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const title = screen.getByText(highlight.title);
          expect(title).toHaveClass("text-3xl", "font-bold", "text-foreground");
        });
      });

      it("should render feature descriptions with Features styling", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const description = screen.getByText(highlight.description);
          expect(description).toHaveClass(
            "leading-relaxed",
            "text-muted-foreground",
          );
        });
      });
    });

    describe("Scroll Animation Integration Tests", () => {
      it("should use scroll-based horizontal movement like Features", () => {
        render(<Highlights />);

        const cardsContainer = screen.getByTestId("highlights-cards-container");
        expect(cardsContainer).toBeInTheDocument();

        // Container should have will-change-transform for performance
        expect(cardsContainer).toHaveClass("will-change-transform");
      });

      it("should have proper card animation setup", () => {
        render(<Highlights />);

        const cards = screen.getAllByTestId("highlight-card");
        expect(cards).toHaveLength(4);

        // Each card should be rendered for animation
        cards.forEach((card) => {
          expect(card).toBeInTheDocument();
        });
      });
    });

    describe("Accessibility Tests", () => {
      it("should have no accessibility violations", async () => {
        const { container } = render(<Highlights />);

        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });

      it("should use semantic section element", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section.tagName).toBe("SECTION");
      });

      it("should have descriptive text content for all features", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const title = screen.getByText(highlight.title);
          const description = screen.getByText(highlight.description);

          expect(title.textContent).toBeTruthy();
          expect(description.textContent).toBeTruthy();
          expect(title.textContent!.length).toBeGreaterThan(5);
          expect(description.textContent!.length).toBeGreaterThan(10);
        });
      });
    });

    describe("Design System Integration Tests", () => {
      it("should use Features-style gradient background", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveClass(
          "bg-gradient-to-b",
          "from-primary/5",
          "via-background",
          "to-muted",
        );
      });

      it("should maintain consistent spacing with Features component", () => {
        render(<Highlights />);

        const cardsContainer = screen.getByTestId("highlights-cards-container");
        expect(cardsContainer).toHaveClass("pl-[15%]");
      });
    });
  });

  describe("Motion and Scroll Hooks Setup", () => {
    it("should call scroll-related motion hooks like Features", () => {
      const { useScroll, useTransform, useSpring } = require("motion/react");

      render(<Highlights />);

      // Verify hooks are called like in Features component
      expect(useScroll).toHaveBeenCalled();
      expect(useTransform).toHaveBeenCalled();
      expect(useSpring).toHaveBeenCalled();
    });

    it("should use motion components for section and containers", () => {
      render(<Highlights />);

      // Verify motion components are rendered
      expect(screen.getByTestId("highlights-section")).toBeInTheDocument();
      expect(screen.getByTestId("sticky-container")).toBeInTheDocument();
      expect(
        screen.getByTestId("highlights-cards-container"),
      ).toBeInTheDocument();
    });
  });
});
