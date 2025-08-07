import type { Meta, StoryObj } from "@storybook/nextjs";
import { Separator } from "@/components/ui/separator";

const meta = {
  title: "Design System/Atoms/Separator",
  component: Separator,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>Content Above</div>
      <Separator />
      <div>Content Below</div>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-[100px] items-center space-x-4">
      <div>Left</div>
      <Separator orientation="vertical" />
      <div>Right</div>
    </div>
  ),
};

export const WithContent: Story = {
  render: () => (
    <div className="w-[300px] space-y-4">
      <div>Content Above</div>
      <Separator content="OR" />
      <div>Content Below</div>
    </div>
  ),
};
