import { PullRefreshIndicator } from "@/components/layout/pull-refresh-indicator";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Layout/PullRefreshIndicator",
  component: PullRefreshIndicator,
  decorators: [
    (Story) => (
      <div className="[&>[data-testid=pull-refresh-wrapper]]:flex!">
        <Story />
        <div className="border p-4">比賽紀錄</div>
      </div>
    ),
  ],
} satisfies Meta<typeof PullRefreshIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    state: {
      isPulling: false,
      isRefreshing: false,
      pullDistance: 0,
      progress: 0,
      refreshError: null,
    },
  },
};

export const Pulling: Story = {
  args: {
    state: {
      isPulling: true,
      isRefreshing: false,
      pullDistance: 40,
      progress: 0.5,
      refreshError: null,
    },
  },
};

export const Refreshing: Story = {
  args: {
    state: {
      isPulling: false,
      isRefreshing: true,
      pullDistance: 80,
      progress: 1,
      refreshError: null,
    },
  },
};
