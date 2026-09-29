import { Highlights } from "@/components/landing/highlights";
import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";

// Run the real motion library instead of the global stub, which has no scroll hooks.
jest.unmock("motion/react");
jest.unmock("motion/react-m");

describe("Highlights", () => {
  const expectedHighlights = [
    {
      title: "提供簡單易用的賽事記錄工具",
      description: "讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業",
      icon: "game",
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

  it("renders a semantic section with mobile and desktop layouts", () => {
    render(<Highlights />);

    expect(screen.getByTestId("highlights-section").tagName).toBe("SECTION");
    expect(
      screen.getByTestId("highlights-cards-container-mobile"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sticky-container")).toBeInTheDocument();
    expect(
      screen.getByTestId("highlights-cards-container"),
    ).toBeInTheDocument();
  });

  it("renders every highlight once per layout (8 cards)", () => {
    render(<Highlights />);

    expect(screen.getAllByTestId("highlight-card")).toHaveLength(8);
    expectedHighlights.forEach(({ title, description }) => {
      expect(screen.getAllByText(title)).toHaveLength(2);
      expect(screen.getAllByText(description)).toHaveLength(2);
    });
  });

  it("renders an icon inside each feature badge", () => {
    render(<Highlights />);

    expectedHighlights.forEach(({ icon }) => {
      const badges = screen.getAllByTestId(`highlight-badge-${icon}`);
      expect(badges).toHaveLength(2);
      badges.forEach((badge) => {
        expect(badge).not.toBeEmptyDOMElement();
      });
    });
  });

  it("keeps the mobile and desktop layouts each holding all four highlights", () => {
    render(<Highlights />);

    ["highlights-cards-container-mobile", "highlights-cards-container"].forEach(
      (id) => {
        expect(
          within(screen.getByTestId(id)).getAllByTestId("highlight-card"),
        ).toHaveLength(4);
      },
    );
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Highlights />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
