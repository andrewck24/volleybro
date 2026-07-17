"use client";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

// Minimum horizontal pointer travel (px) before a drag is recognized as a
// swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 40;

/**
 * Capture-on-intent horizontal swipe for stepping the entry flow. A pointer
 * drag only becomes a swipe once it crosses SWIPE_THRESHOLD_PX; once recognized
 * the step change fires immediately and the click the browser would otherwise
 * synthesize on pointerup is suppressed (via onClickCapture) so neither a
 * progress segment nor an underlying move button also fires its tap handler.
 * Shared by the progress bar track and the moves body so both surfaces swipe.
 */
export const useStepSwipe = ({
  activeStep,
  reachableSteps,
  onStepChange,
}: {
  activeStep: number;
  reachableSteps: number[];
  onStepChange: (index: number) => void;
}) => {
  const dragRef = useRef<{ startX: number; triggered: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = (e: ReactPointerEvent) => {
    dragRef.current = { startX: e.clientX, triggered: false };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.triggered) return;

    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;

    drag.triggered = true;
    suppressClickRef.current = true;

    const target = activeStep + (dx < 0 ? 1 : -1);
    if (reachableSteps.includes(target)) onStepChange(target);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  // Runs in the capture phase (parent -> child) so stopping propagation here
  // cancels the click before it reaches the segment/button underneath.
  const onClickCapture = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.stopPropagation();
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture,
  };
};
