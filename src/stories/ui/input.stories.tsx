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

export const Default: Story = {
  render: () => <Input placeholder="Enter text..." className="w-75" />,
};

export const WithValue: Story = {
  render: () => <Input defaultValue="Default text" className="w-75" />,
};

export const Disabled: Story = {
  render: () => <Input disabled value="Disabled state" className="w-75" />,
};

export const LongValue: Story = {
  render: () => (
    <Input
      value="This is a very long input value that exceeds the visible width of the input field to demonstrate text overflow behavior"
      className="w-75"
    />
  ),
};
