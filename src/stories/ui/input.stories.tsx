import type { Meta, StoryObj } from "@storybook/nextjs";
import { Input } from "@/components/ui/input";

const meta = {
  title: "Design System/Atoms/Input",
  component: Input,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Input placeholder="Enter text..." className="w-[300px]" />,
};

export const WithValue: Story = {
  render: () => (
    <Input value="Default text" onChange={() => {}} className="w-[300px]" />
  ),
};

export const Disabled: Story = {
  render: () => <Input disabled value="Disabled state" className="w-[300px]" />,
};
