import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";

import { Button } from "@/components/ui/button";
import { RiHome2Fill } from "react-icons/ri";

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

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Design System/Atoms/Button",
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: "centered",
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
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
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
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

// One snapshot per look instead of one story per variant.
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
      {/* No loadingText: children (icon + label) fall back into the loading
          state, so a spinner sits next to the original icon. */}
      <Button {...args} loading />
    </div>
  ),
};
