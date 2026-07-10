"use client";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import { useStepSwipe } from "@/components/game/panel/use-step-swipe";
import { cn } from "@/lib/utils";

const LOCKED_TITLE = "上一步尚未完成，暫時無法切換";

export const EntryProgressBar = ({
  steps,
  activeStep,
  reachableSteps,
  onStepChange,
}: {
  steps: ProgressStep[];
  activeStep: number;
  reachableSteps: number[];
  onStepChange: (index: number) => void;
}) => {
  const activeCaption = steps[activeStep]?.caption ?? "";
  const swipe = useStepSwipe({ activeStep, reachableSteps, onStepChange });

  return (
    <div
      data-slot="EntryProgressBar"
      className="flex w-full flex-col gap-1 px-2 pt-2"
    >
      <div
        data-slot="EntryProgressBarTrack"
        data-testid="entry-progress-bar-track"
        className="flex w-full gap-1"
        {...swipe}
      >
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isReachable = reachableSteps.includes(index);

          return (
            <button
              key={step.key}
              type="button"
              aria-label={step.caption}
              aria-current={isActive ? "step" : undefined}
              aria-disabled={!isReachable}
              title={isReachable ? undefined : LOCKED_TITLE}
              onClick={() => {
                if (!isReachable) return;
                onStepChange(index);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out",
                // Every completed-or-active step fills with primary; only
                // pending steps stay muted (mockup design.tsx:717-724).
                index <= activeStep ? "bg-primary" : "bg-muted",
                isActive ? "flex-[2.5]" : "flex-1",
                !isReachable && "cursor-not-allowed opacity-50",
              )}
            />
          );
        })}
      </div>
      {/* key forces a remount so the fade/slide-in animation replays on step change */}
      <p
        key={activeCaption}
        className="text-center text-sm text-muted-foreground duration-200 animate-in fade-in slide-in-from-bottom-1"
      >
        {activeCaption}
      </p>
    </div>
  );
};
