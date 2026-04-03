import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

const meta = {
  title: "Design System/Atoms/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function CalendarExample() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const Range: Story = {
  render: function CalendarRangeExample() {
    const [range, setRange] = useState<{ from?: Date; to?: Date } | undefined>();
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        className="rounded-md border"
      />
    );
  },
};
