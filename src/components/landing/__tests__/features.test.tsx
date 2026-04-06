import { Features } from "@/components/landing/features";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock dependencies
jest.mock("@/components/match/stats/teams-stats/points", () => ({
  Points: () => <div data-testid="mock-points-chart">Mock Points Chart</div>,
}));

jest.mock("@/components/ui/chart", () => ({
  ChartContainer: ({
    children,
    className,
    ...props
  }: {
    children?: ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  ChartTooltip: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltipContent: () => <div>Mock Tooltip</div>,
}));

jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  RadarChart: () => <div data-testid="mock-radar-chart">Mock Radar Chart</div>,
  PolarGrid: () => <div>Mock PolarGrid</div>,
  PolarAngleAxis: () => <div>Mock PolarAngleAxis</div>,
  PolarRadiusAxis: () => <div>Mock PolarRadiusAxis</div>,
  Radar: () => <div>Mock Radar</div>,
}));

describe("Features Component", () => {
  describe("Section Architecture", () => {
    it("should render Features component with main section wrapper", () => {
      render(<Features />);

      // The component should render with features-section container
      const featuresSection = screen.getByTestId("features-section");
      expect(featuresSection).toBeInTheDocument();
    });

    it("should contain three main feature containers", () => {
      render(<Features />);

      // Should have three main containers: Game, Analytics, Team
      const gameFeatures = screen.getByTestId("game-features");
      const analyticsFeatures = screen.getByTestId("analytics-features");
      const teamFeatures = screen.getByTestId("team-features");

      expect(gameFeatures).toBeInTheDocument();
      expect(analyticsFeatures).toBeInTheDocument();
      expect(teamFeatures).toBeInTheDocument();
    });
  });

  describe("Content Structure", () => {
    it("should render all required demo areas", () => {
      render(<Features />);

      const gameDemo1 = screen.getByTestId("demo-area-game-1");
      const gameDemo2 = screen.getByTestId("demo-area-game-2");
      const analyticsDemo1 = screen.getByTestId("demo-area-analytics-1");
      const analyticsDemo2 = screen.getByTestId("demo-area-analytics-2");
      const teamDemo1 = screen.getByTestId("demo-area-team-1");
      const teamDemo2 = screen.getByTestId("demo-area-team-2");

      expect(gameDemo1).toBeInTheDocument();
      expect(gameDemo2).toBeInTheDocument();
      expect(analyticsDemo1).toBeInTheDocument();
      expect(analyticsDemo2).toBeInTheDocument();
      expect(teamDemo1).toBeInTheDocument();
      expect(teamDemo2).toBeInTheDocument();
    });
  });

  describe("FeatureCard Component", () => {
    it("should have correct card height of 70vh on large screens", () => {
      render(<Features />);

      const featureCards = screen.getAllByTestId(/-card-/);
      featureCards.forEach((card) => {
        expect(card).toHaveClass("lg:h-[70vh]");
      });
    });

    it("should use CSS Flex layout system", () => {
      render(<Features />);

      const featureCards = screen.getAllByTestId(/-card-/);
      featureCards.forEach((card) => {
        expect(card).toHaveClass("flex");
      });
    });

    it("should display gradient backgrounds in demo areas", () => {
      render(<Features />);

      const demoAreas = screen.getAllByTestId(/demo-area-/);
      demoAreas.forEach((area) => {
        expect(area.className).toMatch(/bg-gradient/);
      });
    });

    it("should use responsive aspect ratios", () => {
      render(<Features />);

      const demoAreas = screen.getAllByTestId(/demo-area-/);
      demoAreas.forEach((area) => {
        expect(area).toHaveClass("aspect-3/4");
        expect(area).toHaveClass("lg:aspect-auto");
        expect(area).toHaveClass("lg:h-full");
      });
    });
  });

  describe("GameFeatures", () => {
    it("should render two game feature cards", () => {
      render(<Features />);

      const gameCard1 = screen.getByTestId("game-card-1");
      const gameCard2 = screen.getByTestId("game-card-2");

      expect(gameCard1).toBeInTheDocument();
      expect(gameCard2).toBeInTheDocument();
    });

    it("should display correct content for game tool card", () => {
      render(<Features />);

      const toolCard = screen.getByTestId("game-card-1");
      expect(toolCard).toHaveTextContent("簡單易用的賽事記錄工具");
      expect(toolCard).toHaveTextContent(
        "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
      );
    });

    it("should display correct content for game browsing card", () => {
      render(<Features />);

      const browsingCard = screen.getByTestId("game-card-2");
      expect(browsingCard).toHaveTextContent("即時瀏覽每筆賽事紀錄");
      expect(browsingCard).toHaveTextContent(
        "所有記錄即時同步，隨時查看歷史數據和比賽分析",
      );
    });

    it("should use right-image layout for both game cards", () => {
      render(<Features />);

      const gameCard1 = screen.getByTestId("game-card-1");
      const gameCard2 = screen.getByTestId("game-card-2");

      expect(gameCard1).toHaveClass("lg:flex-row");
      expect(gameCard2).toHaveClass("lg:flex-row");
    });

    it("should render FeatureDemoImage components for both game cards", () => {
      render(<Features />);

      const gameImage1 = screen.getByTestId("game-demo-image-1");
      const gameImage2 = screen.getByTestId("game-demo-image-2");

      expect(gameImage1).toBeInTheDocument();
      expect(gameImage2).toBeInTheDocument();
    });
  });

  describe("AnalyticsFeatures", () => {
    it("should render two analytics feature cards", () => {
      render(<Features />);

      const analyticsCard1 = screen.getByTestId("analytics-card-1");
      const analyticsCard2 = screen.getByTestId("analytics-card-2");

      expect(analyticsCard1).toBeInTheDocument();
      expect(analyticsCard2).toBeInTheDocument();
    });

    it("should display correct content for match performance comparison card", () => {
      render(<Features />);

      const performanceCard = screen.getByTestId("analytics-card-1");
      expect(performanceCard).toHaveTextContent("賽事表現比較分析");
      expect(performanceCard).toHaveTextContent(
        "透過視覺化圖表比較團隊表現，找出球隊優勢",
      );
    });

    it("should display correct content for player analysis card", () => {
      render(<Features />);

      const playerCard = screen.getByTestId("analytics-card-2");
      expect(playerCard).toHaveTextContent("深入分析球員表現（開發中）");
      expect(playerCard).toHaveTextContent(
        "運用圖表深入分析個別球員的技能表現和成長軌跡",
      );
    });

    it("should use left-image layout for both analytics cards", () => {
      render(<Features />);

      const analyticsCard1 = screen.getByTestId("analytics-card-1");
      const analyticsCard2 = screen.getByTestId("analytics-card-2");

      expect(analyticsCard1).toHaveClass("lg:flex-row-reverse");
      expect(analyticsCard2).toHaveClass("lg:flex-row-reverse");
    });

    it("should render Points component in first analytics card", () => {
      render(<Features />);

      const demoArea1 = screen.getByTestId("demo-area-analytics-1");
      expect(demoArea1).toBeInTheDocument();
      // Points component should be rendered inside
      expect(screen.getByTestId("points-component")).toBeInTheDocument();
      expect(screen.getByTestId("mock-points-chart")).toBeInTheDocument();
    });

    it("should render radar chart in second analytics card", () => {
      render(<Features />);

      const demoArea2 = screen.getByTestId("demo-area-analytics-2");
      expect(demoArea2).toBeInTheDocument();
      // Radar chart should be rendered inside
      expect(screen.getByTestId("radar-chart")).toBeInTheDocument();
      expect(screen.getByTestId("mock-radar-chart")).toBeInTheDocument();
    });
  });

  describe("TeamFeatures", () => {
    it("should render two team management feature cards", () => {
      render(<Features />);

      const teamCard1 = screen.getByTestId("team-card-1");
      const teamCard2 = screen.getByTestId("team-card-2");

      expect(teamCard1).toBeInTheDocument();
      expect(teamCard2).toBeInTheDocument();
    });

    it("should display correct content for team roster card", () => {
      render(<Features />);

      const rosterCard = screen.getByTestId("team-card-1");
      expect(rosterCard).toHaveTextContent("建立完整隊伍名單");
      expect(rosterCard).toHaveTextContent(
        "輕鬆建立和管理球員資料，掌握每位成員的基本資訊和比賽表現",
      );
    });

    it("should display correct content for lineup arrangement card", () => {
      render(<Features />);

      const lineupCard = screen.getByTestId("team-card-2");
      expect(lineupCard).toHaveTextContent("智慧陣容安排");
      expect(lineupCard).toHaveTextContent(
        "根據球員能力與狀況，快速安排最適合的先發陣容",
      );
    });

    it("should use right-image layout for both team cards", () => {
      render(<Features />);

      const teamCard1 = screen.getByTestId("team-card-1");
      const teamCard2 = screen.getByTestId("team-card-2");

      expect(teamCard1).toHaveClass("lg:flex-row");
      expect(teamCard2).toHaveClass("lg:flex-row");
    });

    it("should render demo areas for both team cards", () => {
      render(<Features />);

      const teamDemo1 = screen.getByTestId("demo-area-team-1");
      const teamDemo2 = screen.getByTestId("demo-area-team-2");

      expect(teamDemo1).toBeInTheDocument();
      expect(teamDemo2).toBeInTheDocument();
    });

    it("should render FeatureDemoImage components for both team cards", () => {
      render(<Features />);

      const teamImage1 = screen.getByTestId("team-demo-image-1");
      const teamImage2 = screen.getByTestId("team-demo-image-2");

      expect(teamImage1).toBeInTheDocument();
      expect(teamImage2).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should maintain design system consistency", () => {
      render(<Features />);

      const featuresSection = screen.getByTestId("features-section");
      expect(featuresSection.className).toMatch(/flex/);
      expect(featuresSection.className).toMatch(/w-full/);
    });

    it("should use large screen breakpoints for responsive layout", () => {
      render(<Features />);

      const featureCards = screen.getAllByTestId(/-card-/);
      featureCards.forEach((card) => {
        expect(card.className).toMatch(/lg:/);
      });
    });
  });

  describe("FeatureDemoImage Component", () => {
    it("should render all FeatureDemoImage components with correct test IDs", () => {
      render(<Features />);

      const gameImage1 = screen.getByTestId("game-demo-image-1");
      const gameImage2 = screen.getByTestId("game-demo-image-2");
      const teamImage1 = screen.getByTestId("team-demo-image-1");
      const teamImage2 = screen.getByTestId("team-demo-image-2");

      expect(gameImage1).toBeInTheDocument();
      expect(gameImage2).toBeInTheDocument();
      expect(teamImage1).toBeInTheDocument();
      expect(teamImage2).toBeInTheDocument();
    });

    it("should have proper image structure with Next.js Image component", () => {
      render(<Features />);

      const demoImages = screen.getAllByTestId(/-demo-image-/);
      demoImages.forEach((image) => {
        // Check that each image has the expected Next.js Image attributes
        expect(image.tagName).toBe("IMG");
      });
    });
  });
});
