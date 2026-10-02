"use client";
// PROTOTYPE (throwaway). Variant b: only the presentational parts of the
// recording UI, driven by props and one useState. No Redux, no SWR, no pending
// writes: nothing to stub. The cost is that the store-bound compositions
// (GameCourt lineup/rotation, GamePanel step derivation, move lists) are
// re-assembled here, so they can drift from the real screen.
import { Court, Inside, Outside, PlayerCard } from "@/components/custom/court";
import { Panel } from "@/components/custom/panel";
import { PreviewCard } from "@/components/game/preview";
import {
  getEntryProgress,
  type EntryProgress,
} from "@/components/game/panel/entry-progress";
import { Container, MoveButton } from "@/components/game/panel/moves";
import { EntryProgressBar } from "@/components/game/panel/progress-bar";
import { SENT_RALLY } from "@/components/landing/record-demo/demo-data";
import { demoGame } from "@/components/landing/record-demo/demo-game";
import { StatsSection } from "@/components/landing/record-demo/stats-section";
import { StepsSection } from "@/components/landing/record-demo/steps-section";
import { useCounter } from "@/components/landing/record-demo/use-counter";
import { EntryType, deriveSetStats } from "@/entities/game";
import type {
  EntryView,
  GameView,
  RallyView,
  ReduxEntryDraft,
} from "@/lib/features/game/types";
import { backMoves, scoringMoves } from "@/lib/scoring-moves";
import { FiMinus, FiPlus } from "react-icons/fi";
import { useState } from "react";

const set = demoGame.sets[0]!;
const players = demoGame.teams.home.players;
const SEED_COUNT = set.entries.length;

// same rotation rule as useLineup/getGeneralModeLineup, re-derived
const rotation = deriveSetStats(set.entries, { options: set.options }).home
  .rotation;
const starting = set.lineups.home.starting.slice();
starting.push(...starting.splice(0, rotation % 6));

const sentRally: RallyView = {
  win: SENT_RALLY.win,
  home: {
    score: 6,
    type: scoringMoves[SENT_RALLY.home]!.type,
    num: SENT_RALLY.home,
    player: { id: SENT_RALLY.player, zone: 4 },
  },
  away: {
    score: 3,
    type: scoringMoves[SENT_RALLY.away]!.type,
    num: SENT_RALLY.away,
  },
};

const withSent = (g: GameView): GameView => ({
  ...g,
  sets: g.sets.map((s, i) =>
    i === 0
      ? {
          ...s,
          entries: [
            ...s.entries,
            {
              type: EntryType.RALLY,
              id: "sent",
              seq: SEED_COUNT,
              ...sentRally,
            },
          ],
        }
      : s,
  ),
});
const sentGame = withSent(demoGame);

const Frame = ({ step }: { step: number }) => {
  useCounter("frame");
  const picked = step >= 1;
  const draft = {
    home: {
      player: picked ? { id: SENT_RALLY.player, zone: 4 } : { id: "", zone: 0 },
      num: step >= 2 ? SENT_RALLY.home : null,
      type: step >= 2 ? sentRally.home.type : null,
    },
    away: { num: step >= 2 ? SENT_RALLY.away : null },
  } as unknown as ReduxEntryDraft;
  const progress: EntryProgress = getEntryProgress(draft);
  const preview = picked
    ? ({
        type: EntryType.RALLY,
        ...sentRally,
        home: { ...sentRally.home, ...(step < 2 && { type: undefined }) },
      } as unknown as EntryView)
    : set.entries.at(-1);

  return (
    <div className="flex size-full flex-col gap-1 bg-background">
      <div className="w-full shrink-0 overflow-hidden rounded-lg">
        <Court>
          <Outside className="inner">{null}</Outside>
          <Inside>
            {starting.map((s, i) => {
              const p = players.find((x) => x.id === s.id)!;
              return (
                <PlayerCard
                  key={s.id}
                  player={{ ...p, position: s.position ?? "" }}
                  toggled={picked && p.id === SENT_RALLY.player}
                  list="starting"
                  zone={i + 1}
                  onClick={() => {}}
                />
              );
            })}
          </Inside>
        </Court>
      </div>
      <Panel className="min-h-0 gap-0 overflow-hidden rounded-lg pb-2">
        <EntryProgressBar
          steps={progress.steps}
          activeStep={progress.activeStep}
          reachableSteps={progress.reachableSteps}
          onStepChange={() => {}}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden bg-card p-2">
          <Container className={step === 0 ? "grid-cols-1" : undefined}>
            {step < 2
              ? backMoves.map((m) => (
                  <MoveButton
                    key={m.num}
                    move={m}
                    toggled={false}
                    onClick={() => {}}
                  >
                    {m.text}
                    {m.win ? <FiPlus /> : <FiMinus />}
                  </MoveButton>
                ))
              : scoringMoves
                  .filter((m) =>
                    scoringMoves[SENT_RALLY.home]!.outcome.includes(m.num),
                  )
                  .map((m) => (
                    <MoveButton
                      key={m.num}
                      move={m}
                      toggled={m.num === SENT_RALLY.away}
                      onClick={() => {}}
                    >
                      {`對方${m.text}`}
                      {m.win ? <FiPlus /> : <FiMinus />}
                    </MoveButton>
                  ))}
          </Container>
        </div>
      </Panel>
      <PreviewCard
        entry={preview}
        players={players}
        isEditing={picked}
        isPulsing={picked && !progress.submittable}
        isComplete={progress.submittable}
        onSubmit={() => {}}
      />
    </div>
  );
};

export const VariantB = () => {
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState(false);
  useCounter("root");

  return (
    <>
      <StepsSection
        onStep={(n) => {
          setStep(n);
          setSent(false);
        }}
      >
        <Frame step={step} />
      </StepsSection>
      <StatsSection
        game={sent ? sentGame : demoGame}
        onEnter={() => setSent(true)}
      />
    </>
  );
};
