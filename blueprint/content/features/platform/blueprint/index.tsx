import repositoryNativeSlices from "./decisions/D2-repository-native-slices.json";
import changeScopedAdrPromotion from "./decisions/D3-change-scoped-adr-promotion.json";

import { PlatformFeaturePage } from "@/components/PlatformFeaturePage";

export default function BlueprintFeature() {
  return (
    <PlatformFeaturePage
      title="Blueprint"
      summary="Repository-owned durable knowledge for Changes, implementation slices, and human delivery review."
      currentBehavior={[
        "Change Overview, Design, implementation-slice JSON, and Review remain in Git while work is active.",
        "Blueprint renders current capability knowledge and interactive delivery explanations for human review.",
        "Archive promotes verified decisions and current constraints into the narrowest Feature target.",
      ]}
      constraints={[
        "Blueprint is tracker-neutral and must remain understandable when operational issues expire or are deleted.",
        "Code and tests remain the authority for actual behavior; Blueprint records durable rationale and reviewed knowledge.",
        "Execution claims, retries, workspace paths, and provider text are runtime facts, not durable Feature content.",
      ]}
      decisions={[repositoryNativeSlices, changeScopedAdrPromotion]}
    />
  );
}
