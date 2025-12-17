import {
  FeatureCard,
  FeatureCardsContainer,
} from "@/components/landing/features";
import { Points } from "@/components/match/stats/teams-stats/points";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MoveType } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

// Mock data for analytics demos
const mockTeamsStats: ITeamsStats = {
  home: {
    [MoveType.SERVING]: { success: 5, error: 3 },
    [MoveType.BLOCKING]: { success: 10, error: 2 },
    [MoveType.ATTACK]: { success: 28, error: 5 },
    [MoveType.RECEPTION]: { success: 20, error: 4 },
    [MoveType.DEFENSE]: { success: 17, error: 3 },
    [MoveType.SETTING]: { success: 22, error: 2 },
    [MoveType.UNFORCED]: { success: 7, error: 0 },
    rotation: 3,
    timeout: 1,
    substitution: 4,
    challenge: 1,
  },
  away: {
    [MoveType.SERVING]: { success: 4, error: 4 },
    [MoveType.BLOCKING]: { success: 8, error: 3 },
    [MoveType.ATTACK]: { success: 23, error: 7 },
    [MoveType.RECEPTION]: { success: 18, error: 5 },
    [MoveType.DEFENSE]: { success: 14, error: 4 },
    [MoveType.SETTING]: { success: 20, error: 3 },
    [MoveType.UNFORCED]: { success: 5, error: 0 },
    rotation: 2,
    timeout: 2,
    substitution: 3,
    challenge: 2,
  },
};

const playerRadarData = [
  { skill: "發球", value: 85, fullMark: 100 },
  { skill: "攔網", value: 92, fullMark: 100 },
  { skill: "攻擊", value: 78, fullMark: 100 },
  { skill: "接球", value: 88, fullMark: 100 },
  { skill: "防守", value: 82, fullMark: 100 },
  { skill: "舉球", value: 90, fullMark: 100 },
];

const radarChartConfig = {
  value: {
    label: "技能評分",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

export const AnalyticsFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="analytics-features">
      <FeatureCard
        testId="analytics-card-1"
        demoTestId="demo-area-analytics-1"
        title="賽事表現比較分析"
        description="透過視覺化圖表比較團隊表現，找出球隊優勢"
        layout="left-image"
        gradientClass="bg-gradient-to-br from-purple-500/10 to-pink-500/10"
      >
        <div
          data-testid="points-component"
          className="w-full rounded-lg bg-card p-4 lg:m-6"
        >
          <Points stats={mockTeamsStats} />
        </div>
      </FeatureCard>

      <FeatureCard
        testId="analytics-card-2"
        demoTestId="demo-area-analytics-2"
        title="深入分析球員表現（開發中）"
        description="運用圖表深入分析個別球員的技能表現和成長軌跡"
        layout="left-image"
        gradientClass="bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
      >
        <ChartContainer
          data-testid="radar-chart"
          config={radarChartConfig}
          className="aspect-square size-full min-h-75"
        >
          <RadarChart
            data={playerRadarData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="skill" className="text-xs" />
            <Radar
              dataKey="value"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </FeatureCard>
    </FeatureCardsContainer>
  );
};
