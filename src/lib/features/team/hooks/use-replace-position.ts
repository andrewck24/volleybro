import { useAppSelector } from "@/lib/redux/hooks";

export const useReplacePosition = () => {
  const { lineups } = useAppSelector((state) => state.lineup);
  const liberoReplaceMode = lineups[0]?.options.liberoReplaceMode;
  const liberoReplacePosition = lineups[0]?.options.liberoReplacePosition;
  const hasPairedReplacePosition =
    liberoReplaceMode === 0 ||
    (liberoReplacePosition === "OP"
      ? lineups[0]?.starting.some(
          (player) => player.id && player.position === "OP",
        )
      : lineups[0]?.starting.some((player, index) => {
          const oppositeIndex = index >= 3 ? index - 3 : index + 3;
          const opposite = lineups[0]?.starting[oppositeIndex];
          return (
            player.id &&
            player.position === liberoReplacePosition &&
            opposite?.id &&
            opposite.position === liberoReplacePosition
          );
        }));

  return {
    liberoReplaceMode,
    liberoReplacePosition,
    hasPairedReplacePosition,
  };
};
