import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";
import { RiArrowRightLine, RiHome2Fill } from "react-icons/ri";

const children = (
  <>
    <RiHome2Fill />
    Button
  </>
);

const variants = [
  "default",
  "destructive",
  "court",
  "outline",
  "secondary",
  "ghost",
  "link",
  "glass",
  "segmented",
] as const;

const meta = {
  title: "Design System/Atoms/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: variants,
      control: { type: "select" },
    },
    size: {
      options: ["default", "lg", "icon"],
      control: { type: "select" },
    },
  },
  args: {
    variant: "default",
    size: "default",
    children: children,
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {variants.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} disabled />
      <Button {...args} size="icon">
        <RiHome2Fill />
      </Button>
      <Button {...args} loading loadingText="Saving..." />
      <Button
        {...args}
        variant="destructive"
        loading
        loadingText="Deleting..."
      />
      <Button {...args} loading />
      <Button {...args} loading>
        Next
        <RiArrowRightLine />
      </Button>
    </div>
  ),
};
