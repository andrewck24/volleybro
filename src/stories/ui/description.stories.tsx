import type { Meta, StoryObj } from "@storybook/nextjs";
import { RiArrowRightLine, RiInformationLine } from "react-icons/ri";

import {
  Description,
  DescriptionContent,
  DescriptionTitle,
} from "@/components/ui/description";

const meta = {
  title: "Design System/Molecules/Description",
  component: Description,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Description>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Description>
      <DescriptionTitle>Basic Description</DescriptionTitle>
      <DescriptionContent>
        This is the content of a description text
      </DescriptionContent>
    </Description>
  ),
};

export const WithStartIcon: Story = {
  render: () => (
    <Description startIcon={<RiInformationLine />}>
      <DescriptionTitle>With Start Icon</DescriptionTitle>
      <DescriptionContent>
        Description with an information icon on the left
      </DescriptionContent>
    </Description>
  ),
};

export const WithEndIcon: Story = {
  render: () => (
    <Description endIcon={<RiArrowRightLine />}>
      <DescriptionTitle>With End Icon</DescriptionTitle>
      <DescriptionContent>
        Description with an arrow icon on the right
      </DescriptionContent>
    </Description>
  ),
};

export const WithBothIcons: Story = {
  render: () => (
    <Description
      startIcon={<RiInformationLine />}
      endIcon={<RiArrowRightLine />}
    >
      <DescriptionTitle>Both Icons</DescriptionTitle>
      <DescriptionContent>Example with icons on both sides</DescriptionContent>
    </Description>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Description startIcon={<RiInformationLine />}>
      <DescriptionTitle>Long Description Title Example</DescriptionTitle>
      <DescriptionContent>
        This is a longer description content to demonstrate the layout when
        there is more text. Here you can place more detailed information to help
        users better understand the feature or content.
      </DescriptionContent>
    </Description>
  ),
};
