import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import type { Meta, StoryObj } from "@storybook/nextjs";

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

export const MultipleToasts: Story = {
  render: function MultipleToastsExample() {
    const { toast } = useToast();
    return (
      <div className="flex gap-2">
        <Button
          onClick={() =>
            toast({ title: "Saved", description: "Changes saved." })
          }
        >
          Info Toast
        </Button>
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
          Error Toast
        </Button>
      </div>
    );
  },
};

export const WithAction: Story = {
  render: function ToasterWithActionExample() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() =>
          toast({
            title: "Update Available",
            description: "A new version is ready to install.",
            action: <ToastAction altText="Update Now">Update Now</ToastAction>,
          })
        }
      >
        Toast with Action
      </Button>
    );
  },
};
