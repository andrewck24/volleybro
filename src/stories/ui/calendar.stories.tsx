import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

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
        className="rounded-md border"
      />
    );
  },
};

export const WithDisabledDates: Story = {
  render: function CalendarDisabledExample() {
    const [date, setDate] = useState<Date | undefined>(FIXED_DATE);
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={{ dayOfWeek: [0, 6] }}
        className="rounded-md border"
      />
    );
  },
};
