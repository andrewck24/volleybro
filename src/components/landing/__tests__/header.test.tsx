import { Header } from "@/components/landing/header";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const scrollTo = (scrollY: number) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: scrollY,
  });
  fireEvent.scroll(window);
};

// The frosted-glass backdrop is the only visible effect of scrolling.
const isFrosted = () =>
  screen
    .getByTestId("header-glassmorphism-container")
    .className.includes("backdrop-blur-sm");

beforeEach(() => {
  jest
    .spyOn(window.navigator, "userAgent", "get")
    .mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );
});

afterEach(() => {
  scrollTo(0);
  jest.restoreAllMocks();
});

describe("Header", () => {
  it("shows the brand, the preview badge and a way into the app", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "VolleyBro" })).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "開始使用" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("frosts the bar once the page is scrolled and clears it back at the top", async () => {
    render(<Header />);
    expect(isFrosted()).toBe(false);

    scrollTo(100);
    await waitFor(() => expect(isFrosted()).toBe(true));

    scrollTo(0);
    await waitFor(() => expect(isFrosted()).toBe(false));
  });

  it("stops listening for scroll after unmount", () => {
    const remove = jest.spyOn(window, "removeEventListener");
    const { unmount } = render(<Header />);

    unmount();

    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
