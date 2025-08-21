import { Features } from "@/components/landing/features";
import { render, screen } from "@testing-library/react";

// Mock Motion components to avoid animation issues in tests
jest.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
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

      // Should have three main containers: Recording, Analytics, Team
      const recordingFeatures = screen.getByTestId("recording-features");
      const analyticsFeatures = screen.getByTestId("analytics-features");
      const teamFeatures = screen.getByTestId("team-features");

      expect(recordingFeatures).toBeInTheDocument();
      expect(analyticsFeatures).toBeInTheDocument();
      expect(teamFeatures).toBeInTheDocument();
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
        expect(area).toHaveClass("aspect-[3/4]");
        expect(area).toHaveClass("lg:aspect-auto");
        expect(area).toHaveClass("lg:h-full");
      });
    });
  });

  describe("RecordingFeatures", () => {
    it("should render two recording feature cards", () => {
      render(<Features />);

      const recordingCard1 = screen.getByTestId("recording-card-1");
      const recordingCard2 = screen.getByTestId("recording-card-2");

      expect(recordingCard1).toBeInTheDocument();
      expect(recordingCard2).toBeInTheDocument();
    });

    it("should display correct content for recording tool card", () => {
      render(<Features />);

      const toolCard = screen.getByTestId("recording-card-1");
      expect(toolCard).toHaveTextContent("簡單易用的賽事記錄工具");
      expect(toolCard).toHaveTextContent(
        "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
      );
    });

    it("should display correct content for record browsing card", () => {
      render(<Features />);

      const browsingCard = screen.getByTestId("recording-card-2");
      expect(browsingCard).toHaveTextContent("即時瀏覽每筆賽事紀錄");
      expect(browsingCard).toHaveTextContent(
        "所有記錄即時同步，隨時查看歷史數據和比賽分析",
      );
    });

    it("should use right-image layout for both recording cards", () => {
      render(<Features />);

      const recordingCard1 = screen.getByTestId("recording-card-1");
      const recordingCard2 = screen.getByTestId("recording-card-2");

      expect(recordingCard1).toHaveClass("lg:flex-row");
      expect(recordingCard2).toHaveClass("lg:flex-row");
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

  describe("Content Structure", () => {
    it("should render all required demo areas", () => {
      render(<Features />);

      const recordingDemo1 = screen.getByTestId("demo-area-recording-1");
      const recordingDemo2 = screen.getByTestId("demo-area-recording-2");
      const analyticsDemo = screen.getByTestId("demo-area-analytics");
      const teamDemo = screen.getByTestId("demo-area-team");

      expect(recordingDemo1).toBeInTheDocument();
      expect(recordingDemo2).toBeInTheDocument();
      expect(analyticsDemo).toBeInTheDocument();
      expect(teamDemo).toBeInTheDocument();
    });
  });
});
