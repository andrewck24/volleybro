import type { Meta, StoryObj } from "@storybook/nextjs";
import Link from "next/link";
import { FiSettings, FiUser } from "react-icons/fi";
import { RiGroupLine } from "react-icons/ri";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";

const meta = {
  title: "Design System/Atoms/Item",
  component: Item,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "outline", "muted"],
      control: { type: "select" },
    },
    size: {
      options: ["default", "sm"],
      control: { type: "select" },
    },
  },
  args: {
    variant: "default",
    size: "default",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "320px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Navigable form — entire row is clickable via asChild + Link. Right side contains non-interactive status only. */
export const NavigableWithLink: Story = {
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123/players/456">
        <ItemMedia variant="icon">
          <FiUser />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Alice Chen</ItemTitle>
          <ItemDescription>#7 OH</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Badge>先發</Badge>
        </ItemActions>
      </Link>
    </Item>
  ),
};

/** Navigable form — entire row is clickable via asChild + button. */
export const NavigableWithButton: Story = {
  render: (args) => (
    <Item asChild {...args}>
      <button onClick={() => {}}>
        <ItemMedia variant="icon">
          <RiGroupLine />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Thunder</ItemTitle>
        </ItemContent>
      </button>
    </Item>
  ),
};

/** Static with actions form — row itself is not clickable. Right side contains interactive buttons. */
export const StaticWithActions: Story = {
  render: (args) => (
    <Item {...args}>
      <ItemMedia variant="icon">
        <FiUser />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Alice Chen</ItemTitle>
        <ItemDescription>#7 OH</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon" onClick={() => {}}>
          <FiSettings />
        </Button>
      </ItemActions>
    </Item>
  ),
};

/** Action footer pattern — navigable row with accept/reject buttons placed outside the Link (siblings, not children). Used for invitations. */
export const ActionFooterPattern: Story = {
  render: (args) => (
    <div>
      <Item asChild {...args}>
        <Link href="/team/456">
          <ItemMedia variant="icon">
            <RiGroupLine />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Thunder</ItemTitle>
            <ItemDescription>Invited you to join</ItemDescription>
          </ItemContent>
        </Link>
      </Item>
      <div className="flex gap-1 pl-12 pb-2">
        <Button size="sm" onClick={() => {}}>
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => {}}>
          Reject
        </Button>
      </div>
    </div>
  ),
};

/** ItemGroup with separator — groups multiple items with visual separation. */
export const GroupWithSeparator: Story = {
  render: (args) => (
    <ItemGroup>
      <Item asChild {...args}>
        <Link href="/team/123/players/1">
          <ItemMedia variant="icon">
            <FiUser />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Alice Chen</ItemTitle>
            <ItemDescription>#7 OH</ItemDescription>
          </ItemContent>
        </Link>
      </Item>
      <ItemSeparator />
      <Item asChild {...args}>
        <Link href="/team/123/players/2">
          <ItemMedia variant="icon">
            <FiUser />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Bob Lin</ItemTitle>
            <ItemDescription>#12 MB</ItemDescription>
          </ItemContent>
        </Link>
      </Item>
      <ItemSeparator />
      <Item asChild {...args}>
        <Link href="/team/123/players/3">
          <ItemMedia variant="icon">
            <FiUser />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Carol Wu</ItemTitle>
            <ItemDescription>#3 S</ItemDescription>
          </ItemContent>
        </Link>
      </Item>
    </ItemGroup>
  ),
};

/** Outline variant */
export const VariantOutline: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123">
        <ItemMedia variant="icon">
          <RiGroupLine />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Thunder</ItemTitle>
        </ItemContent>
      </Link>
    </Item>
  ),
};

/** Muted variant */
export const VariantMuted: Story = {
  args: { variant: "muted" },
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123">
        <ItemMedia variant="icon">
          <RiGroupLine />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Thunder</ItemTitle>
        </ItemContent>
      </Link>
    </Item>
  ),
};

/** Small size */
export const SizeSm: Story = {
  args: { size: "sm" },
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123/players/456">
        <ItemMedia variant="icon">
          <FiUser />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Alice Chen</ItemTitle>
        </ItemContent>
      </Link>
    </Item>
  ),
};
