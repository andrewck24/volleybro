import { useAppSelector } from "@/lib/redux/hooks";

export const useReplacePosition = () => {
  const lineup = useAppSelector(
    (state) => state.lineup.lineups[state.lineup.status.lineupIndex],
  );
  const liberoReplaceMode = lineup?.options.liberoReplaceMode;
  const liberoReplacePosition = lineup?.options.liberoReplacePosition;
  const hasPairedReplacePosition =
    liberoReplaceMode === 0 ||
    (liberoReplacePosition === "OP"
      ? lineup?.starting.some((player) => player.id && player.position === "OP")
      : lineup?.starting.some((player, index) => {
          const oppositeIndex = index >= 3 ? index - 3 : index + 3;
          const opposite = lineup.starting[oppositeIndex];
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
