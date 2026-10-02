import { CTASection } from "@/components/landing/cta-section";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { WINDOWS, setUserAgent } from "@test/support/dom/user-agent";

beforeEach(() => {
  setUserAgent(WINDOWS);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CTASection", () => {
  it("presents the slogan and supporting copy under a level-2 heading", () => {
    render(<CTASection />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "準備好革新你的排球管理方式了嗎？",
    );
    expect(
      screen.getByText(/立即體驗 VolleyBro 的強大功能/),
    ).toBeInTheDocument();
  });

  it("shows the app interface image", () => {
    render(<CTASection />);

    const image = screen.getByRole("img", { name: "VolleyBro App Interface" });
    expect(image).toHaveAttribute("src", "/landing/hero.svg");
  });

  it("offers a call to action that leads into the app", () => {
    render(<CTASection />);

    const link = screen.getByRole("link", { name: "立即開始使用" });
    expect(link).toHaveAttribute("href", "/home");
    expect(screen.getByTestId("cta-section-button")).toBe(link);
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<CTASection />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
