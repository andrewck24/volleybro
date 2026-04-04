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

export const Default: Story = {};

export const Small: Story = {
  args: { className: "max-w-24" },
};

export const Large: Story = {
  args: { className: "max-w-64" },
};
