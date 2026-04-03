import type { Meta, StoryObj } from "@storybook/nextjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const meta = {
  title: "Design System/Molecules/Accordion",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-80">
      <AccordionItem value="item-1">
        <AccordionTrigger>What is VolleyBro?</AccordionTrigger>
        <AccordionContent>
          VolleyBro is a volleyball team management and match recording app.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>How do I create a team?</AccordionTrigger>
        <AccordionContent>
          Navigate to the team page and click the create button.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>How do I record a match?</AccordionTrigger>
        <AccordionContent>
          Select a team, configure the lineup, and start recording.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-80">
      <AccordionItem value="item-1">
        <AccordionTrigger>Section One</AccordionTrigger>
        <AccordionContent>Content for section one.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Section Two</AccordionTrigger>
        <AccordionContent>Content for section two.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
