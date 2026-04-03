import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiInformationLine, RiAlertLine } from "react-icons/ri";

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const meta = {
  title: "Design System/Atoms/Alert",
  component: Alert,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "destructive"],
      control: { type: "select" },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Alert {...args}>
      <RiInformationLine />
      <AlertTitle>Note</AlertTitle>
      <AlertDescription>
        This is a default style alert message used to display general
        information.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args}>
      <RiAlertLine />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        This is a destructive alert message used to display errors or warnings.
      </AlertDescription>
    </Alert>
  ),
};
