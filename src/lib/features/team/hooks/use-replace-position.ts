import { useAppSelector } from "@/lib/redux/hooks";

export const useReplacePosition = () => {
  const { lineups } = useAppSelector((state) => state.lineup);
  const liberoReplaceMode = lineups[0]?.options.liberoReplaceMode;
  const liberoReplacePosition = lineups[0]?.options.liberoReplacePosition;
  const hasPairedReplacePosition =
    liberoReplaceMode === 0 ||
    (liberoReplacePosition === "OP"
      ? lineups[0]?.starting.some(
          (player) => player._id && player.position === "OP",
        )
      : lineups[0]?.starting.some((player, index) => {
          const oppositeIndex = index >= 3 ? index - 3 : index + 3;
          return (
            player._id &&
            player.position === liberoReplacePosition &&
            lineups[0].starting[oppositeIndex]._id &&
            lineups[0].starting[oppositeIndex].position ===
              liberoReplacePosition
          );
        }));

  return {
    liberoReplaceMode,
    liberoReplacePosition,
    hasPairedReplacePosition,
  };
};
