import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiAlertLine, RiInformationLine } from "react-icons/ri";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const meta = {
  title: "Design System/Atoms/Alert",
  component: Alert,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "error"],
      control: { type: "select" },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex w-112.5 flex-col gap-3">
      <Alert {...args}>
        <RiInformationLine />
        <AlertTitle>Note</AlertTitle>
        <AlertDescription>
          This is a default style alert message used to display general
          information.
        </AlertDescription>
      </Alert>
      <Alert {...args} variant="error">
        <RiAlertLine />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          This is an error alert message used to display errors or warnings.
        </AlertDescription>
      </Alert>
    </div>
  ),
};
