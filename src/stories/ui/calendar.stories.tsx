import { Calendar } from "@/components/ui/calendar";
import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { type DateRange } from "@daypicker/react";

const meta = {
  title: "Design System/Atoms/Calendar",
  component: Calendar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const FIXED_DATE = new Date("2025-01-15");

export const Default: Story = {
  render: function CalendarExample() {
    const [date, setDate] = useState<Date | undefined>(FIXED_DATE);
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        defaultMonth={FIXED_DATE}
        today={FIXED_DATE}
        className="rounded-md border"
      />
    );
  },
};

export const Range: Story = {
  render: function CalendarRangeExample() {
    const [range, setRange] = useState<DateRange | undefined>();
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        defaultMonth={FIXED_DATE}
        today={FIXED_DATE}
        className="rounded-md border"
      />
    );
  },
};
