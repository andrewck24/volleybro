import { PlatformFeaturePage } from "@/components/PlatformFeaturePage";

export default function AgentOrchestrationFeature() {
  return (
    <PlatformFeaturePage
      title="Agent orchestration"
      summary="Optional execution coordination that reuses the repository-owned delivery contract."
      currentBehavior={[
        "Symphony polls eligible work, claims a Change, creates an isolated workspace, and invokes the approved Apply contract.",
        "Manual Apply remains valid when Symphony is stopped, unavailable, or intentionally not used.",
        "Runtime claims, retries, workspace paths, and provider execution evidence remain operational or ephemeral.",
      ]}
      constraints={[
        "Symphony does not own requirements, Blueprint data, implementation planning, verification, Archive, or human acceptance.",
        "The current dispatch unit is one Change; per-slice scheduling requires a separate repository adapter.",
        "Provider prompts, responses, reasoning, and transcripts must not become durable repository knowledge.",
      ]}
    />
  );
}
