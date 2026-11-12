"use client";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";

const SWIPE_THRESHOLD_PX = 40;

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
