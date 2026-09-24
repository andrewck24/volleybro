import { Spinner } from "@/components/ui/spinner";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Atoms/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
  args: { className: "size-8" },
};

export const InlineWithText: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner />
      同步中
    </div>
  ),
};
