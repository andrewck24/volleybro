import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { globalActions } from "@/lib/features/global-slice";

/**
 * A custom hook that implements pull-to-refresh functionality for touch devices.
 *
 * @param refresh - A callback function that will be executed when the pull-to-refresh action is completed.
 *                 This function can return void or an empty object.
 *
 * @returns An object containing two boolean states:
 *          - isRefreshing: Indicates whether the refresh action is currently in progress
 *          - isPulling: Indicates whether the user is currently pulling down to refresh
 *
 * @remarks
 * This hook handles touch events to detect pull-to-refresh gestures.
 * The refresh action is triggered when:
 * - The page is scrolled to the top (scrollY <= 0)
 * - The user pulls down more than 48 pixels
 *
 * After triggering the refresh:
 * 1. The refresh callback is executed
 * 2. A 300ms delay is applied
 * 3. The refreshing state is reset
 */
export const usePullToRefresh = (refresh: () => {} | void) => {
  const dispatch = useAppDispatch();
  const { isRefreshing, isPulling, isDisabled } = useAppSelector(
    (state) => state.global.refresh
  );
  const touchStartY = useRef(0);
  const scrollStartY = useRef(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isDisabled) return;
      touchStartY.current = e.touches[0].clientY;
      scrollStartY.current =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      dispatch(globalActions.setIsPulling(false));
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touchCurrentY = e.touches[0].clientY;
      const touchDistance = touchCurrentY - touchStartY.current;

      if (scrollStartY.current <= 0 && touchDistance > 48) {
        dispatch(globalActions.setIsPulling(true));
      } else {
        dispatch(globalActions.setIsPulling(false));
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchDistance = touchEndY - touchStartY.current;

      dispatch(globalActions.setIsPulling(false));

      if (scrollStartY.current <= 0 && touchDistance > 48) {
        dispatch(globalActions.setIsRefreshing(true));
        refresh();
        await new Promise((resolve) => setTimeout(resolve, 300));
        dispatch(globalActions.setIsRefreshing(false));
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [refresh, dispatch]);

  return { isRefreshing, isPulling };
};

export const useRefreshState = () => {
  const { isRefreshing, isPulling } = useAppSelector(
    (state) => state.global.refresh
  );
  return { isRefreshing, isPulling };
};
