"use client";
import type { ProgressStep } from "@/components/game/panel/entry-progress";
import { cn } from "@/lib/utils";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

// Minimum horizontal pointer travel (px) before a drag is recognized as a
// swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 40;

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

  // Capture-on-intent swipe: a pointer drag only becomes a swipe once it
  // crosses SWIPE_THRESHOLD_PX. Once recognized, the step change fires
  // immediately and the click the browser would otherwise synthesize on
  // pointerup is suppressed so the segment's tap handler doesn't also fire.
  const dragRef = useRef<{ startX: number; triggered: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, triggered: false };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.triggered) return;

    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;

    drag.triggered = true;
    suppressClickRef.current = true;

    const target = activeStep + (dx < 0 ? 1 : -1);
    if (reachableSteps.includes(target)) {
      onStepChange(target);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <div
      data-slot="EntryProgressBar"
      className="flex w-full flex-col gap-1 px-2 pt-2"
    >
      <div
        data-slot="EntryProgressBarTrack"
        data-testid="entry-progress-bar-track"
        className="flex w-full gap-1"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
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
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
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
