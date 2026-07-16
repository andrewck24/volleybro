"use client";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";

const nodes = [
  { id: "lineup", label: "Lineup", x: 60, y: 80 },
  { id: "rally", label: "Rally", x: 200, y: 80 },
  { id: "score", label: "Score", x: 340, y: 80 },
  { id: "rotation", label: "Rotation", x: 200, y: 170 },
  { id: "end-set", label: "End Set", x: 340, y: 170 },
];

const details: Record<string, { title: string; body: string }> = {
  lineup: {
    title: "Lineup Configuration",
    body: "Set the starting 6 players and their positions for the set. Libero substitution rules are enforced automatically.",
  },
  rally: {
    title: "Rally Recording",
    body: "Record the rally outcome: point to home or away. Substitutions, timeouts, and challenges can be triggered mid-rally.",
  },
  score: {
    title: "Live Score",
    body: "Score updates in real time. Set win at 25 (or 15 in the deciding set) with a minimum 2-point lead.",
  },
  rotation: {
    title: "Rotation Tracking",
    body: "When the home team wins a rally after a side-out, positions rotate clockwise. The libero swaps in for the middle blocker.",
  },
  "end-set": {
    title: "Set End & Summary",
    body: "When a set concludes, the score is locked, per-player stats are saved, and the next set begins from the service order.",
  },
};

export default function GameRecording() {
  return (
    <div>
      <p>
        The game recording flow guides the scorer through lineup setup,
        rally-by-rally input, and automatic rotation. Click a node to see
        details.
      </p>
      <InteractiveFlowchart nodes={nodes} details={details} />
    </div>
  );
}
