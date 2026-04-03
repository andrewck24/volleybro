import type { Meta, StoryObj } from "@storybook/nextjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const meta = {
  title: "Design System/Molecules/Chart",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const barData = [
  { month: "Jan", wins: 8, losses: 4 },
  { month: "Feb", wins: 10, losses: 2 },
  { month: "Mar", wins: 6, losses: 6 },
  { month: "Apr", wins: 12, losses: 0 },
  { month: "May", wins: 9, losses: 3 },
];

const barConfig = {
  wins: { label: "Wins", color: "hsl(var(--chart-1))" },
  losses: { label: "Losses", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export const Bar_: Story = {
  name: "Bar",
  render: () => (
    <ChartContainer config={barConfig} className="h-64 w-96">
      <BarChart data={barData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="wins" fill="var(--color-wins)" radius={4} />
        <Bar dataKey="losses" fill="var(--color-losses)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
};

const lineData = [
  { round: "R1", score: 25 },
  { round: "R2", score: 22 },
  { round: "R3", score: 25 },
  { round: "R4", score: 18 },
  { round: "R5", score: 25 },
];

const lineConfig = {
  score: { label: "Score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export const Line_: Story = {
  name: "Line",
  render: () => (
    <ChartContainer config={lineConfig} className="h-64 w-96">
      <LineChart data={lineData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="round" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="score"
          stroke="var(--color-score)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  ),
};
