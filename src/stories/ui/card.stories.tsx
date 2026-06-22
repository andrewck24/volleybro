import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiDeleteBinLine, RiEditFill, RiMore2Fill } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardBtnGroup,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const meta = {
  title: "Design System/Molecules/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-112.5">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          This is the content area of the card, which can contain any content.
        </p>
      </CardContent>
    </Card>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Card className="w-112.5">
      <CardHeader>
        <CardTitle>Instructions</CardTitle>
        <CardDescription>
          This is the supplementary description text for the card
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Main Content Area</p>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">Updated on 2024/03/21</p>
      </CardFooter>
    </Card>
  ),
};

export const WithActions: Story = {
  render: () => (
    <Card className="w-112.5">
      <CardHeader>
        <CardTitle>
          Action Example
          <CardBtnGroup>
            <Button variant="ghost" size="icon">
              <RiEditFill />
            </Button>
            <Button variant="ghost" size="icon">
              <RiDeleteBinLine />
            </Button>
            <Button variant="ghost" size="icon">
              <RiMore2Fill />
            </Button>
          </CardBtnGroup>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>
          This card demonstrates how to add action buttons in the title area.
        </p>
      </CardContent>
    </Card>
  ),
};
