import {
  SegmentedPicker,
  SegmentedPickerItem,
} from "@/components/ui/segmented-picker";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setup = (onValueChange = jest.fn()) => {
  render(
    <SegmentedPicker label="陣容配置" value="1" onValueChange={onValueChange}>
      <SegmentedPickerItem value="0">1</SegmentedPickerItem>
      <SegmentedPickerItem value="1">2</SegmentedPickerItem>
      <SegmentedPickerItem value="2">3</SegmentedPickerItem>
    </SegmentedPicker>,
  );
  return { onValueChange, user: userEvent.setup() };
};

describe("SegmentedPicker", () => {
  it("exposes a radiogroup named by its label with the value item checked", () => {
    setup();
    expect(screen.getByRole("radiogroup", { name: "陣容配置" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "2" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1" })).not.toBeChecked();
  });

  it("reports the value of a clicked item", async () => {
    const { onValueChange, user } = setup();
    await user.click(screen.getByRole("radio", { name: "3" }));
    expect(onValueChange).toHaveBeenCalledWith("2");
  });

  it("selects the focused item while its navigation key remains down", async () => {
    const { onValueChange, user } = setup();
    await user.tab();
    await user.keyboard("{ArrowRight>}");
    expect(screen.getByRole("radio", { name: "3" })).toHaveFocus();
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith("2"));
    await user.keyboard("{/ArrowRight}");
  });
});
