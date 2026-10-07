import { Landing } from "@/components/landing";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { WINDOWS, setUserAgent } from "@test/support/dom/user-agent";

beforeEach(() => {
  setUserAgent(WINDOWS);
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("Landing", () => {
  it("lays out one h1 and each section's h2, and every start button leads into the app", async () => {
    const { container } = render(<Landing />);
    // the lazy stats panel (next/dynamic) loads after the first paint
    await screen.findByText("總分");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
    const starts = screen.getAllByRole("link", { name: "開始記錄" });
    expect(starts.length).toBeGreaterThan(1);
    for (const link of starts) expect(link).toHaveAttribute("href", "/home");
    expect(await axe(container)).toHaveNoViolations();
  });
});
