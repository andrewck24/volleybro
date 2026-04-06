import {
  FeatureCard,
  FeatureCardsContainer,
  FeatureDemoImage,
} from "@/components/landing/features";

export const GameFeatures = () => {
  return (
    <FeatureCardsContainer data-testid="game-features">
      <FeatureCard
        testId="game-card-1"
        demoTestId="demo-area-game-1"
        title="簡單易用的賽事記錄工具"
        description="讓教練能夠快速記錄比賽數據，告別繁瑣的紙筆作業"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-blue-500/10 to-purple-500/10"
      >
        <FeatureDemoImage
          feature="game"
          number={1}
          alt="Match recording tool interface"
        />
      </FeatureCard>

      <FeatureCard
        testId="game-card-2"
        demoTestId="demo-area-game-2"
        title="即時瀏覽每筆賽事紀錄"
        description="所有記錄即時同步，隨時查看歷史數據和比賽分析"
        layout="right-image"
        gradientClass="bg-gradient-to-br from-green-500/10 to-blue-500/10"
      >
        <FeatureDemoImage
          feature="game"
          number={2}
          alt="Match records browsing interface"
        />
      </FeatureCard>
    </FeatureCardsContainer>
  );
};
