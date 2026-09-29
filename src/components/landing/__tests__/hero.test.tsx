import { Hero } from "@/components/landing/hero";
import { act, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";

// The global motion stub has no AnimatePresence, which FlipWords needs; motion
// itself runs fine in jsdom, so use the real library here.
jest.mock("motion/react", () => jest.requireActual("motion/react"));
jest.mock("motion/react-m", () => jest.requireActual("motion/react-m"));

beforeEach(() => {
  jest
    .spyOn(window.navigator, "userAgent", "get")
    .mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Hero", () => {
  it("introduces the product with a headline and description", () => {
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("讓排球賽事記錄");
    expect(heading).toHaveTextContent("更加");
    expect(
      screen.getByText(/專為排球教練與管理者設計的數位化解決方案/),
    ).toBeInTheDocument();
  });

  it("starts the headline on the first rotating word and moves on to the next", () => {
    jest.useFakeTimers();
    render(<Hero />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("簡單");

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(heading).toHaveTextContent("快速");
  });

  it("lists the product's selling points", () => {
    render(<Hero />);

    for (const label of ["快速紀錄", "即時同步", "跨平台支援"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("offers a call to action that leads into the app", () => {
    render(<Hero />);

    expect(screen.getByRole("link", { name: "開始使用" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("shows the app interface image", () => {
    render(<Hero />);

    expect(
      screen.getByRole("img", { name: "VolleyBro App Interface" }),
    ).toHaveAttribute("src", "/landing/hero.svg");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Hero />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
