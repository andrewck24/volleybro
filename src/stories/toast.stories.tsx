import type { Meta, StoryObj } from "@storybook/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

const meta = {
  title: "Design System/Molecules/Toast",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div>
        <Story />
        <Toaster />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function ShowToast() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() =>
          toast({
            title: "Completed",
            description: "Operation completed successfully",
          })
        }
      >
        Show Toast
      </Button>
    );
  },
};

export const WithAction: Story = {
  render: function ShowActionToast() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() =>
          toast({
            title: "Update Available",
            description: "A new version is ready to install",
            action: (
              <Button variant="outline" size="sm">
                Update Now
              </Button>
            ),
          })
        }
      >
        Toast with Action
      </Button>
    );
  },
};

export const Destructive: Story = {
  render: function ShowDestructiveToast() {
    const { toast } = useToast();
    return (
      <Button
        variant="destructive"
        onClick={() =>
          toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong",
          })
        }
      >
        Error Toast
      </Button>
    );
  },
};
