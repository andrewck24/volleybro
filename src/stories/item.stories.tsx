import type { Meta, StoryObj } from "@storybook/nextjs";
import Link from "next/link";
import { FiSettings, FiUser } from "react-icons/fi";
import { RiGroupLine } from "react-icons/ri";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemAvatar,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

const meta = {
  title: "Design System/Atoms/Item",
  component: Item,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      options: ["default", "primary", "outline", "muted"],
      control: { type: "select" },
    },
    size: {
      options: ["default", "lg"],
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

export const NavigablePersonRow: Story = {
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123/players/456">
        <ItemMedia variant="image">
          <ItemAvatar alt="Alice Chen" fallback={<FiUser />} />
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

export const StaticWithActions: Story = {
  render: (args) => (
    <Item {...args}>
      <ItemMedia variant="icon">
        <RiGroupLine />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Thunder</ItemTitle>
        <ItemDescription>12 active players</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon" onClick={() => {}}>
          <FiSettings />
        </Button>
      </ItemActions>
    </Item>
  ),
};

export const TeamLoadingState: Story = {
  render: (args) => (
    <Item {...args}>
      <ItemMedia variant="icon">
        <RiGroupLine />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Skeleton className="h-4 w-24" />
        </ItemTitle>
      </ItemContent>
    </Item>
  ),
};

export const InvitationOverlayPattern: Story = {
  render: (args) => (
    <Item className="relative items-start hover:bg-accent/50" {...args}>
      <Link
        href="/team/456"
        className="absolute inset-0 z-0"
        aria-label="前往隊伍"
      />
      <ItemMedia variant="icon">
        <RiGroupLine className="h-4 w-4" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="h-8">Thunder</ItemTitle>
        <ItemFooter className="relative z-10 w-fit">
          <Button size="sm" className="pr-3 pl-2" onClick={() => {}}>
            接受邀請
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="pr-3 pl-2"
            onClick={() => {}}
          >
            拒絕邀請
          </Button>
        </ItemFooter>
      </ItemContent>
    </Item>
  ),
};

export const GroupWithSeparator: Story = {
  render: (args) => (
    <ItemGroup>
      <Item asChild {...args}>
        <Link href="/team/123/players/1">
          <ItemMedia variant="image">
            <ItemAvatar alt="Alice Chen" fallback={<FiUser />} />
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
          <ItemMedia variant="image">
            <ItemAvatar alt="Bob Lin" fallback={<FiUser />} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Bob Lin</ItemTitle>
            <ItemDescription>#12 MB</ItemDescription>
          </ItemContent>
        </Link>
      </Item>
    </ItemGroup>
  ),
};

export const VariantPrimary: Story = {
  args: { variant: "primary" },
  render: (args) => (
    <Item asChild {...args}>
      <button type="button">
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

export const SizeLarge: Story = {
  args: { size: "lg" },
  render: (args) => (
    <Item asChild {...args}>
      <Link href="/team/123">
        <ItemMedia variant="icon">
          <RiGroupLine />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Thunder</ItemTitle>
          <ItemDescription>Large spacing variant</ItemDescription>
        </ItemContent>
      </Link>
    </Item>
  ),
};
