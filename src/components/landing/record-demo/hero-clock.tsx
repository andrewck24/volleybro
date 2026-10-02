"use client";
// PROTOTYPE (throwaway). Stand-in for the Hero rally clock: its own
// setInterval and React state, no store, no context shared with sections 3-4;
// it only reads the same fixture (teams, players, rally scores and moves).
import {
  ALL_RALLIES,
  AWAY_TEAM,
  HOME_PLAYERS,
  HOME_TEAM,
} from "@/components/landing/record-demo/demo-data";
import { useCounter } from "@/components/landing/record-demo/use-counter";
import { scoringMoves } from "@/lib/scoring-moves";
import { useEffect, useState } from "react";

export const HeroClock = ({ variant }: { variant: string }) => {
  const [i, setI] = useState(ALL_RALLIES.length - 1);
  useCounter("clock");

  useEffect(() => {
    const id = setInterval(
      () => setI((n) => (n + 1) % ALL_RALLIES.length),
      2200,
    );
    return () => clearInterval(id);
  }, []);

  const r = ALL_RALLIES[i]!;
  const player = HOME_PLAYERS.find((p) => p.id === r.player)!;
  return (
    <div
      data-testid="hero-clock"
      className="flex items-center justify-center gap-4 p-3 text-sm"
    >
      <span>variant={variant}</span>
      <span className="font-bold">
        {HOME_TEAM.name} {r.homeScore} : {r.awayScore} {AWAY_TEAM.name}
      </span>
      <span className="text-muted-foreground">
        {player.number}號 {scoringMoves[r.home]!.text}
        {r.win ? " +" : " -"}
      </span>
    </div>
  );
};
