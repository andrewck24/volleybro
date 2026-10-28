import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiStarFill } from "react-icons/ri";

import { Badge } from "@/components/ui/badge";

const variants = ["default", "secondary", "court", "away", "outline"] as const;

const meta = {
  title: "Design System/Atoms/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: variants,
      control: { type: "select" },
    },
  },
  args: { children: "Badge" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {variants.map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
      <Badge {...args}>
        <RiStarFill />
        Favorite
      </Badge>
    </div>
  ),
};
