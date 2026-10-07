import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiStarFill } from "react-icons/ri";

import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Design System/Atoms/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "secondary", "away", "outline"],
      control: { type: "select" },
    },
  },
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "default" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Away: Story = { args: { variant: "away" } };
export const Outline: Story = { args: { variant: "outline" } };

export const WithIcon: Story = {
  render: (args) => (
    <Badge {...args}>
      <RiStarFill />
      Favorite
    </Badge>
  ),
};
