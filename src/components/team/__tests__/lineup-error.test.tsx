import { LineupError } from "@/components/team/lineup/panel/options/lineup-error";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("LineupError", () => {
  it("is an alert that closes only through its acknowledge button", async () => {
    const user = userEvent.setup();
    const setOpen = jest.fn();
    render(<LineupError open setOpen={setOpen} />);
    const alert = screen.getByRole("alertdialog", {
      name: "無法儲存當前陣容配置",
    });

    await user.keyboard("{Escape}");
    expect(setOpen).not.toHaveBeenCalled();

    expect(within(alert).getAllByRole("button")).toHaveLength(1);
    const acknowledge = within(alert).getByRole("button", { name: "知道了" });
    expect(acknowledge).toHaveFocus();
    await user.click(acknowledge);
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
