import type { Meta, StoryObj } from "@storybook/nextjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Design System/Molecules/Popover",
  component: Popover,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm">This is popover content.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithTitle: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <h4 className="font-medium leading-none mb-2">Settings</h4>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
