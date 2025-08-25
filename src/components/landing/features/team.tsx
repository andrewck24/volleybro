import {
  FeatureCard,
  FeatureCardsContainer,
  FeatureDemoImage,
} from "@/components/landing/features";

export const TeamFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="team-features">
      <FeatureCard
        testId="team-card-1"
        demoTestId="demo-area-team-1"
        title="建立完整隊伍名單"
        description="輕鬆建立和管理球員資料，掌握每位成員的基本資訊和比賽表現"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-orange-500/10 to-red-500/10"
      >
        <FeatureDemoImage
          feature="team"
          number={1}
          alt="Team roster management interface"
        />
      </FeatureCard>

      <FeatureCard
        testId="team-card-2"
        demoTestId="demo-area-team-2"
        title="智慧陣容安排"
        description="根據球員能力與狀況，快速安排最適合的先發陣容"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-emerald-500/10 to-teal-500/10"
      >
        <FeatureDemoImage
          feature="team"
          number={2}
          alt="Smart lineup arrangement interface"
        />
      </FeatureCard>
    </FeatureCardsContainer>
  );
};
