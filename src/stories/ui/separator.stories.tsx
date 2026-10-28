import { Separator } from "@/components/ui/separator";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Atoms/Separator",
  component: Separator,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Orientations: Story = {
  render: () => (
    <div className="w-75 space-y-4">
      <div>Content Above</div>
      <Separator />
      <div>Content Between</div>
      <Separator content="OR" />
      <div className="flex h-10 items-center space-x-4">
        <div>Left</div>
        <Separator orientation="vertical" />
        <div>Right</div>
      </div>
    </div>
  ),
};
