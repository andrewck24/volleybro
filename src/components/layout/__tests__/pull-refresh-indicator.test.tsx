import { PullRefreshIndicator } from "@/components/layout/pull-refresh-indicator";
import { render, screen } from "@testing-library/react";

it("keeps the decorative indicator hidden from assistive technology during refresh", () => {
  render(
    <PullRefreshIndicator
      state={{
        isPulling: false,
        isRefreshing: true,
        pullDistance: 80,
        progress: 1,
        refreshError: null,
      }}
    />,
  );

  expect(screen.getByTestId("pull-refresh-wrapper")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
});
