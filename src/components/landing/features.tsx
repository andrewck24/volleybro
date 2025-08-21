"use client";
import { cn } from "@/lib/utils";

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
      {/* Recording Tool Card */}
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

      {/* Record Browsing Card */}
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

// Analytics Features placeholder
const AnalyticsFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="analytics-features">
      <FeatureCard
        testId="analytics-card-placeholder"
        demoTestId="demo-area-analytics"
        title="數據分析展示"
        description="比賽數據分析相關功能介紹"
        layout="left-image"
        gradientClass="bg-gradient-to-br from-purple-500/10 to-pink-500/10"
      >
        <div className="text-center text-muted-foreground">
          分析功能展示區域
        </div>
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
