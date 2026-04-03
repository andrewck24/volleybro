import type { Meta, StoryObj } from "@storybook/nextjs";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Design System/Molecules/Toaster",
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
  render: function ToasterExample() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() =>
          toast({
            title: "Notification",
            description: "This is a toaster notification.",
          })
        }
      >
        Show Toaster
      </Button>
    );
  },
};

export const Destructive: Story = {
  render: function ToasterDestructiveExample() {
    const { toast } = useToast();
    return (
      <Button
        variant="destructive"
        onClick={() =>
          toast({
            variant: "destructive",
            title: "Error",
            description: "Something went wrong.",
          })
        }
      >
        Show Error Toaster
      </Button>
    );
  },
};
