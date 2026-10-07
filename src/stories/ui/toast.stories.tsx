import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import type { Meta, StoryObj } from "@storybook/nextjs";

const meta = {
  title: "Design System/Molecules/Toast",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
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
            action: <ToastAction altText="Update Now">Update Now</ToastAction>,
          })
        }
      >
        Toast with Action
      </Button>
    );
  },
};

export const ErrorToast: Story = {
  render: function ShowErrorToast() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() =>
          toast({
            variant: "error",
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
