import { LineupError } from "@/components/team/lineup/panel/options/lineup-error";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("LineupError", () => {
  it("is an alert whose single acknowledge button closes it", async () => {
    const user = userEvent.setup();
    const setOpen = jest.fn();
    render(<LineupError open setOpen={setOpen} />);
    const alert = screen.getByRole("alertdialog", {
      name: "無法儲存當前陣容配置",
    });

    expect(within(alert).getAllByRole("button")).toHaveLength(1);
    const acknowledge = within(alert).getByRole("button", { name: "知道了" });
    await user.click(acknowledge);
    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
