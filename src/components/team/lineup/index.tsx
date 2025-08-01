"use client";
import LoadingCard from "@/components/custom/loading/card";
import LoadingCourt from "@/components/custom/loading/court";
import LineupCourt from "@/components/team/lineup/court";
import { LineupPanels } from "@/components/team/lineup/panels";
import { Button } from "@/components/ui/button";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useEffect } from "react";
import { RiSaveLine } from "react-icons/ri";

const Lineup = ({ team, members, handleSave }) => {
  const dispatch = useAppDispatch();
  const { lineups, status } = useAppSelector((state) => state.lineup);
  const liberoReplaceMode =
    lineups[status.lineupIndex]?.options.liberoReplaceMode;
  const liberoReplacePosition =
    lineups[status.lineupIndex]?.options.liberoReplacePosition;
  const hasPairedSwitchPosition =
    liberoReplaceMode === 0 ||
    (liberoReplacePosition === "OP"
      ? lineups[status.lineupIndex]?.starting.some(
          (player) => player._id && player.position === "OP",
        )
      : lineups[status.lineupIndex]?.starting.some((player, index) => {
          const oppositeIndex = index >= 3 ? index - 3 : index + 3;
          return (
            player._id &&
            player.position === liberoReplacePosition &&
            lineups[status.lineupIndex].starting[oppositeIndex]._id &&
            lineups[status.lineupIndex].starting[oppositeIndex].position ===
              liberoReplacePosition
          );
        }));

  useEffect(() => {
    if (team && team.lineups) dispatch(lineupActions.initialize(team.lineups));
  }, [team, dispatch]);

  if (!team || !members || !lineups.length) {
    return (
      <>
        <LoadingCourt />
        <LoadingCard className="w-full flex-1" />
        <div className="flex w-full flex-col px-4">
          <Button size="lg" className="motion-safe:animate-pulse" />
        </div>
      </>
    );
  }

  return (
    <>
      <LineupCourt members={members} />
      <LineupPanels
        members={members}
        hasPairedSwitchPosition={hasPairedSwitchPosition}
      />
      {!status.optionMode && (
        <div className="flex w-full flex-col px-4 pt-2">
          <Button
            size="lg"
            onClick={() => handleSave(lineups)}
            disabled={!status.edited || !hasPairedSwitchPosition}
          >
            <RiSaveLine />
            儲存陣容
          </Button>
        </div>
      )}
    </>
  );
};

export default Lineup;
