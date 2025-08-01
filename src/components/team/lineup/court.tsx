import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { RiLoopRightLine } from "react-icons/ri";
import {
  Court,
  Outside,
  Inside,
  PlayerCard,
  AdjustButton,
} from "@/components/custom/court";

export const LineupCourt = ({ members }) => {
  const dispatch = useAppDispatch();
  const { lineups, status } = useAppSelector((state) => state.lineup);

  return (
    <Court>
      <Outside className="inner">
        {status.optionMode === "" ? (
          <AdjustButton onClick={() => dispatch(lineupActions.rotateLineup())}>
            <RiLoopRightLine />
            輪轉
          </AdjustButton>
        ) : (
          <AdjustButton />
        )}
        {lineups[status.lineupIndex]?.liberos &&
          lineups[status.lineupIndex].liberos.map((libero, index) => {
            const member = members?.find((m) => m._id === libero._id);
            const player = member
              ? {
                  ...member,
                  position: libero?.position || "",
                }
              : null;
            return (
              <PlayerCard
                key={index}
                player={player}
                toggled={
                  status.editingMember.list === "liberos" &&
                  status.editingMember.zone === index + 1
                }
                list="liberos"
                zone={index + 1}
                onClick={() =>
                  dispatch(
                    lineupActions.setEditingPlayer({
                      _id: libero?._id || null,
                      list: "liberos",
                      zone: index + 1,
                    })
                  )
                }
              />
            );
          })}
        {lineups[status.lineupIndex]?.liberos.length < 2 && (
          <PlayerCard
            player={null}
            toggled={
              status.editingMember.list === "liberos" &&
              status.editingMember.zone ===
                lineups[status.lineupIndex]?.liberos.length + 1
            }
            list="liberos"
            zone={lineups[status.lineupIndex]?.liberos.length + 1}
            onClick={() =>
              dispatch(
                lineupActions.setEditingPlayer({
                  _id: null,
                  list: "liberos",
                  zone: lineups[status.lineupIndex]?.liberos.length + 1,
                })
              )
            }
          />
        )}
      </Outside>
      <Inside>
        {lineups[status.lineupIndex]?.starting &&
          lineups[status.lineupIndex].starting.map((starting, index) => {
            const member = members?.find((m) => m._id === starting._id);
            const player = member
              ? {
                  ...member,
                  position: starting?.position || "",
                }
              : null;
            return (
              <PlayerCard
                key={index}
                player={player}
                toggled={
                  status.editingMember.list === "starting" &&
                  status.editingMember.zone === index + 1
                }
                list="starting"
                zone={index + 1}
                onClick={() =>
                  dispatch(
                    lineupActions.setEditingPlayer({
                      _id: starting?._id || null,
                      list: "starting",
                      zone: index + 1,
                    })
                  )
                }
              />
            );
          })}
      </Inside>
    </Court>
  );
};

export default LineupCourt;
