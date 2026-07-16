import { Drawer, DrawerOverlay } from "@/components/ui/drawer";
import { render, screen } from "@testing-library/react";

describe("DrawerOverlay", () => {
  it("covers the web content viewport without safe-area overreach", () => {
    render(
      <Drawer open>
        <DrawerOverlay data-testid="drawer-overlay" />
      </Drawer>,
    );

    expect(screen.getByTestId("drawer-overlay")).toHaveClass("inset-0");
  });
});
