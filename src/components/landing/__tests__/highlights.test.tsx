import { Highlights } from "@/components/landing/highlights";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

// Mock motion/react hooks - match Features component exactly
jest.mock("motion/react", () => ({
  ...jest.requireActual("motion/react"),
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
  RiPencilFill: () => <div data-testid="ri-pencil-fill">PencilIcon</div>,
  RiBarChartBoxAiFill: () => (
    <div data-testid="ri-bar-chart-box-ai-fill">BarChartIcon</div>
  ),
  RiTeamFill: () => <div data-testid="ri-team-fill">TeamIcon</div>,
  RiDeviceFill: () => <div data-testid="ri-device-fill">DeviceIcon</div>,
}));

describe("Highlights Component Tests", () => {
  const expectedHighlights = [
    {
      title: "提供簡單易用的賽事記錄工具",
      description: "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
      icon: "record",
    },
    {
      title: "透過強大的數據分析功能",
      description: "深入了解球隊表現，以數據驅動戰術改進",
      icon: "chart",
    },
    {
      title: "有效掌握球員資訊與表現變化",
      description: "協助陣容安排，讓每場比賽都有最佳配置",
      icon: "team",
    },
    {
      title: "無論是手機、平板或電腦",
      description: "隨時隨地輕鬆使用，不受設備限制",
      icon: "device",
    },
  ];

  describe("Component Structure and Responsive Layout", () => {
    describe("Responsive Layout Architecture", () => {
      it("should render Highlights section with responsive classes", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toBeInTheDocument();
        expect(section).toHaveClass(
          "relative",
          "isolate", 
          "md:h-[300vh]"
        );
      });

      it("should render mobile cards container with grid layout", () => {
        render(<Highlights />);

        const mobileContainer = screen.getByTestId("highlights-cards-container-mobile");
        expect(mobileContainer).toBeInTheDocument();
        expect(mobileContainer).toHaveClass(
          "grid",
        );
      });

      it("should render desktop sticky container (hidden on mobile)", () => {
        render(<Highlights />);

        const stickyContainer = screen.getByTestId("sticky-container");
        expect(stickyContainer).toBeInTheDocument();
        expect(stickyContainer).toHaveClass(
          "sticky",
          "top-0",
          "hidden",
          "md:flex"
        );
      });

      it("should render desktop cards container with scroll animation", () => {
        render(<Highlights />);

        const desktopContainer = screen.getByTestId("highlights-cards-container");
        expect(desktopContainer).toBeInTheDocument();
        expect(desktopContainer).toHaveClass("will-change-transform");
      });
    });

    describe("Feature Content and Icon System", () => {
      it("should render both mobile and desktop card sets (8 cards total)", () => {
        render(<Highlights />);

        const cards = screen.getAllByTestId("highlight-card");
        expect(cards).toHaveLength(8); // 4 mobile + 4 desktop
      });

      it("should display correct feature titles (each appears twice)", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const titles = screen.getAllByText(highlight.title);
          expect(titles).toHaveLength(2); // Mobile + Desktop
        });
      });

      it("should display correct feature descriptions (each appears twice)", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const descriptions = screen.getAllByText(highlight.description);
          expect(descriptions).toHaveLength(2); // Mobile + Desktop
        });
      });

      it("should render updated icons for each feature type", () => {
        render(<Highlights />);

        // Each icon should appear at least once (mobile or desktop)
        expect(screen.getAllByTestId("ri-pencil-fill").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId("ri-bar-chart-box-ai-fill").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId("ri-team-fill").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByTestId("ri-device-fill").length).toBeGreaterThanOrEqual(1);
      });

      it("should display icon badges for each feature type", () => {
        render(<Highlights />);

        const iconTypes = ["record", "chart", "team", "device"];
        iconTypes.forEach((iconType) => {
          const badges = screen.getAllByTestId(`highlight-badge-${iconType}`);
          expect(badges.length).toBeGreaterThanOrEqual(2); // Mobile + Desktop
        });
      });
    });

    describe("Mobile vs Desktop Layout Behavior", () => {
      it("should have mobile static layout with proper spacing", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveClass("py-16");
        
        const mobileContainer = screen.getByTestId("highlights-cards-container-mobile");
        expect(mobileContainer).toHaveClass("grid", "grid-cols-1", "gap-6");
      });

      it("should have desktop scroll animation with conditional height", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveClass("md:h-[300vh]");
        expect(section).toHaveClass("md:[contain:layout_style_paint]");
      });

      it("should have proper gap classes for desktop container", () => {
        render(<Highlights />);

        const desktopContainer = screen.getByTestId("highlights-cards-container");
        expect(desktopContainer).toHaveClass("gap-6", "md:gap-8");
      });
    });

    describe("Card Aspect Ratios and Performance", () => {
      it("should render mobile cards with landscape aspect ratio", () => {
        render(<Highlights />);

        const mobileContainer = screen.getByTestId("highlights-cards-container-mobile");
        expect(mobileContainer).toBeInTheDocument();
        
        // Verify mobile cards have correct aspect ratio classes
        const allCards = screen.getAllByTestId("highlight-card");
        const mobileCards = allCards.slice(0, 4); // First 4 are mobile cards
        
        expect(mobileCards).toHaveLength(4);
        mobileCards.forEach(card => {
          expect(card).toHaveClass("aspect-[3/2]", "w-full");
        });
      });

      it("should render desktop cards with original aspect ratio", () => {
        render(<Highlights />);

        const desktopContainer = screen.getByTestId("highlights-cards-container");
        expect(desktopContainer).toBeInTheDocument();
        
        // Verify desktop cards have correct aspect ratio classes
        const allCards = screen.getAllByTestId("highlight-card");
        const desktopCards = allCards.slice(4, 8); // Last 4 are desktop cards
        
        expect(desktopCards).toHaveLength(4);
        desktopCards.forEach(card => {
          expect(card).toHaveClass("aspect-[1/2.17]", "h-[45vh]");
        });
      });

      it("should maintain desktop scroll animation performance", () => {
        render(<Highlights />);

        const desktopContainer = screen.getByTestId("highlights-cards-container");
        expect(desktopContainer).toHaveClass("will-change-transform");
      });
    });

    describe("Design System Integration", () => {
      it("should render cards with consistent design", () => {
        render(<Highlights />);

        const cards = screen.getAllByTestId("highlight-card");
        cards.forEach((card) => {
          expect(card).toHaveClass("rounded-3xl", "shadow-2xl");
          expect(card).toHaveClass(
            "bg-gradient-to-t",
            "from-background",
            "via-background/95",
            "to-primary/20"
          );
          expect(card).toHaveClass(
            "border",
            "border-border/50",
            "backdrop-blur-sm"
          );
        });
      });

      it("should render icon badges with consistent styling", () => {
        render(<Highlights />);

        const iconTypes = ["record", "chart", "team", "device"];
        iconTypes.forEach((iconType) => {
          const badges = screen.getAllByTestId(`highlight-badge-${iconType}`);
          badges.forEach((badge) => {
            expect(badge).toHaveClass(
              "inline-flex",
              "size-20",
              "items-center",
              "justify-center",
              "rounded-full",
              "bg-primary"
            );
          });
        });
      });

      it("should render feature titles with responsive typography", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const titles = screen.getAllByText(highlight.title);
          titles.forEach((title) => {
            expect(title).toHaveClass("font-bold", "text-foreground");
            expect(title).toHaveClass("text-2xl"); // Base mobile size
            expect(title).toHaveClass("md:text-3xl"); // Desktop size
          });
        });
      });

      it("should render feature descriptions with consistent styling", () => {
        render(<Highlights />);

        expectedHighlights.forEach((highlight) => {
          const descriptions = screen.getAllByText(highlight.description);
          descriptions.forEach((description) => {
            expect(description).toHaveClass(
              "leading-relaxed",
              "text-muted-foreground"
            );
          });
        });
      });
    });

    describe("Accessibility and Semantic Structure", () => {
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
          const titles = screen.getAllByText(highlight.title);
          const descriptions = screen.getAllByText(highlight.description);

          titles.forEach((title) => {
            expect(title.textContent).toBeTruthy();
            expect(title.textContent!.length).toBeGreaterThan(5);
          });

          descriptions.forEach((description) => {
            expect(description.textContent).toBeTruthy();
            expect(description.textContent!.length).toBeGreaterThan(10);
          });
        });
      });
    });

    describe("Theme and Spacing Consistency", () => {
      it("should use consistent gradient background", () => {
        render(<Highlights />);

        const section = screen.getByTestId("highlights-section");
        expect(section).toHaveClass(
          "bg-gradient-to-b",
          "from-primary/5",
          "via-background",
          "to-muted"
        );
      });

      it("should maintain consistent spacing with desktop container", () => {
        render(<Highlights />);

        const desktopContainer = screen.getByTestId("highlights-cards-container");
        expect(desktopContainer).toHaveClass("pl-[15%]");
      });
    });
  });

  describe("Motion.js Integration and Animation Hooks", () => {
    it("should call scroll-related motion hooks for desktop animation", () => {
      const { useScroll, useTransform, useSpring } = require("motion/react");

      render(<Highlights />);

      // Verify hooks are called for desktop scroll animation
      expect(useScroll).toHaveBeenCalled();
      expect(useTransform).toHaveBeenCalled();
      expect(useSpring).toHaveBeenCalled();
    });

    it("should use motion components for section and containers", () => {
      render(<Highlights />);

      // Verify motion components are rendered
      expect(screen.getByTestId("highlights-section")).toBeInTheDocument();
      expect(screen.getByTestId("sticky-container")).toBeInTheDocument();
      expect(screen.getByTestId("highlights-cards-container")).toBeInTheDocument();
      expect(screen.getByTestId("highlights-cards-container-mobile")).toBeInTheDocument();
    });
  });
});