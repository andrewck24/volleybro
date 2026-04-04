import type { Meta, StoryObj } from "@storybook/nextjs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

const meta = {
  title: "Design System/Molecules/Tabs",
  component: Tabs,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Card>
          <CardContent className="pt-6">
            Account settings content will be displayed here
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="password">
        <Card>
          <CardContent className="pt-6">
            Password settings content will be displayed here
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="tab1">Category 1</TabsTrigger>
        <TabsTrigger value="tab2">Category 2</TabsTrigger>
        <TabsTrigger value="tab3">Category 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">This is content for category 1</TabsContent>
      <TabsContent value="tab2">This is content for category 2</TabsContent>
      <TabsContent value="tab3">This is content for category 3</TabsContent>
    </Tabs>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">This is active tab content</TabsContent>
      <TabsContent value="disabled">
        {"This content won't be shown"}
      </TabsContent>
    </Tabs>
  ),
};
