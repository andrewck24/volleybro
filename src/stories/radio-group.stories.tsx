import type { Meta, StoryObj } from "@storybook/nextjs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const meta = {
  title: "Design System/Atoms/RadioGroup",
  component: RadioGroup,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="1">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="1" id="r1" />
        <Label htmlFor="r1">Option 1</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="2" id="r2" />
        <Label htmlFor="r2">Option 2</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="3" id="r3" />
        <Label htmlFor="r3">Option 3</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="1">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="1" id="dr1" disabled />
        <Label htmlFor="dr1" className="text-muted-foreground">
          Disabled Option
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="2" id="dr2" />
        <Label htmlFor="dr2">Available Option</Label>
      </div>
    </RadioGroup>
  ),
};
