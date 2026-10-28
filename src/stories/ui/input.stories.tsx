import { Input } from "@/components/ui/input";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Atoms/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div className="flex w-75 flex-col gap-3">
      <Input placeholder="Enter text..." />
      <Input defaultValue="Default text" />
      <Input disabled value="Disabled state" />
      <Input defaultValue="This is a very long input value that exceeds the visible width of the input field to demonstrate text overflow behavior" />
    </div>
  ),
};
