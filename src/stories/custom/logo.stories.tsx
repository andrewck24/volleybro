import type { Meta, StoryObj } from "@storybook/nextjs";
import { Logo } from "@/components/custom/logo";

const meta = {
  title: "Design System/Composites/Logo",
  component: Logo,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-6">
      <Logo {...args} className="max-w-24" />
      <Logo {...args} />
      <Logo {...args} className="max-w-64" />
    </div>
  ),
};
