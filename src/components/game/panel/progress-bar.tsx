"use client";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import { cn } from "@/lib/utils";

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

  return (
    <div
      data-slot="EntryProgressBar"
      className="flex w-full flex-col gap-1 px-2 pt-2"
    >
      <div className="flex w-full gap-1">
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
              onClick={() => {
                if (!isReachable) return;
                onStepChange(index);
              }}
              className={cn(
                "h-1.5 rounded-full bg-muted transition-all duration-300 ease-out",
                isActive ? "flex-[3] bg-primary" : "flex-1",
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
