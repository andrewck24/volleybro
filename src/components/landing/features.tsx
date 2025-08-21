"use client";
import { Points } from "@/components/match/stats/teams-stats/points";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { MoveType } from "@/entities/record";
import type { ITeamsStats } from "@/lib/features/record/types";
import { cn } from "@/lib/utils";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

export const Features = () => {
  return (
    <section
      data-testid="features-section"
      className="flex w-full flex-col items-center justify-center gap-12 px-6 py-12 lg:px-12"
    >
      <RecordingFeatures />
      <AnalyticsFeatures />
      <TeamFeatures />
    </section>
  );
};

// RecordingFeatures component
const RecordingFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="recording-features">
      <FeatureCard
        testId="recording-card-1"
        demoTestId="demo-area-recording-1"
        title="簡單易用的賽事記錄工具"
        description="讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-blue-500/10 to-purple-500/10"
      >
        <div className="text-center text-muted-foreground">
          記錄工具展示區域
        </div>
      </FeatureCard>

      <FeatureCard
        testId="recording-card-2"
        demoTestId="demo-area-recording-2"
        title="即時瀏覽每筆賽事紀錄"
        description="所有記錄即時同步，隨時查看歷史數據和比賽分析"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-green-500/10 to-blue-500/10"
      >
        <div className="text-center text-muted-foreground">
          記錄瀏覽展示區域
        </div>
      </FeatureCard>
    </FeatureCardsContainer>
  );
};

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

// Analytics Features implementation
const AnalyticsFeatures = () => {
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
          className="aspect-square size-full"
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

// Team Features placeholder
const TeamFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="team-features">
      <FeatureCard
        testId="team-card-placeholder"
        demoTestId="demo-area-team"
        title="管理功能展示"
        description="團隊管理相關功能介紹"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-orange-500/10 to-red-500/10"
      >
        <div className="text-center text-muted-foreground">
          管理功能展示區域
        </div>
      </FeatureCard>
    </FeatureCardsContainer>
  );
};

interface FeatureCardsContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FeatureCardsContainer = ({
  children,
  ...props
}: FeatureCardsContainerProps) => {
  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-10"
      {...props}
    >
      {children}
    </div>
  );
};

// FeatureCard component interface
interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
  gradientClass: string;
  children: React.ReactNode;
  testId: string;
  demoTestId: string;
  layout: "left-image" | "right-image";
}

// Shared FeatureCard component
const FeatureCard = ({
  title,
  description,
  className,
  gradientClass,
  children,
  testId,
  demoTestId,
  layout,
}: FeatureCardProps) => {
  const layoutClass =
    layout === "right-image" ? "lg:flex-row" : "lg:flex-row-reverse";
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-6 lg:h-[70vh] lg:gap-8",
        layoutClass,
        className,
      )}
    >
      {/* Content section */}
      <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center lg:h-full">
        <h3 className="text-2xl font-semibold text-foreground">{title}</h3>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
      </div>

      {/* Demo area with 1:1 aspect ratio and gradient background */}
      <div
        data-testid={demoTestId}
        className={cn(
          "flex aspect-[3/4] w-full flex-1 items-center justify-center rounded-lg p-2 md:aspect-square lg:aspect-auto lg:h-full",
          gradientClass,
        )}
      >
        {children}
      </div>
    </div>
  );
};
