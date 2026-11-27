import { DarkMode } from "@/components/user/menu/dark-mode";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockSetTheme = jest.fn();
jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: mockSetTheme }),
}));

describe("DarkMode", () => {
  beforeEach(() => mockSetTheme.mockClear());

  it("offers the three themes with the current one marked and a cancel at the bottom", async () => {
    render(<DarkMode />);

    await userEvent.click(screen.getByRole("button", { name: "深色模式" }));

    const sheet = await screen.findByRole("dialog", { name: "深色模式" });
    expect(
      within(sheet)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["系統", "亮色", "深色", "取消"]);
    expect(screen.getByRole("button", { name: "亮色" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "深色" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("applies the chosen theme and closes", async () => {
    render(<DarkMode />);
    await userEvent.click(screen.getByRole("button", { name: "深色模式" }));

    fireEvent.click(await screen.findByRole("button", { name: "深色" }));

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("closes on cancel without changing the theme", async () => {
    render(<DarkMode />);
    await userEvent.click(screen.getByRole("button", { name: "深色模式" }));

    fireEvent.click(await screen.findByRole("button", { name: "取消" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(mockSetTheme).not.toHaveBeenCalled();
  });
});
