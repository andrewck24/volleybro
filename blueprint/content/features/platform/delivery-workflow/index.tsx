import repositoryOwnedLifecycle from "./decisions/D1-repository-owned-lifecycle.json";
import repositoryNativeSlices from "./decisions/D2-repository-native-slices.json";

import { PlatformFeaturePage } from "@/components/PlatformFeaturePage";

export default function DeliveryWorkflowFeature() {
  return (
    <PlatformFeaturePage
      title="Delivery workflow"
      summary="A repository-owned, Manual-first lifecycle shared by developer sessions and optional Symphony execution."
      currentBehavior={[
        "Discuss, Propose, Prepare, Apply, Pre-PR review, developer acceptance, Archive, PR, and Merge are defined in WORKFLOW.md.",
        "Manual and Symphony Apply consume the same approved Blueprint implementation slices and verification commands.",
        "Branch-local Archive freezes the Change and promotes verified current knowledge before the PR opens.",
      ]}
      constraints={[
        "The repository must be deliverable without a running Symphony runtime.",
        "agent:ready is a human arming gate and is never added by agents or preparation automation.",
        "No PR opens before accepted Blueprint Review and branch-local Archive; merge performs no second knowledge sync.",
      ]}
      decisions={[repositoryOwnedLifecycle, repositoryNativeSlices]}
    />
  );
}
