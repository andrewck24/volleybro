import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Atoms/Label",
  component: Label,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Label>Label Text</Label>,
};

export const WithInput: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="input">Username</Label>
      <Input id="input" placeholder="Enter username" className="w-75" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="disabled-input" className="text-muted-foreground">
        Disabled State
      </Label>
      <Input
        id="disabled-input"
        disabled
        value="Cannot edit"
        className="w-75"
      />
    </div>
  ),
};
