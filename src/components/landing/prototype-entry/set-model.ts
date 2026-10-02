// PROTOTYPE: pure model of one volleyball set driving the hero Entry list.
export type SetState = {
  home: number;
  away: number;
  rallies: number;
  /** newest first; true = home scored */
  entries: boolean[];
};

export const WIN_SCORE = 25;
export const MIN_LEAD = 2;

export const newSet = (): SetState => ({
  home: 0,
  away: 0,
  rallies: 0,
  entries: [],
});

export const isSetOver = ({ home, away }: SetState) =>
  Math.max(home, away) >= WIN_SCORE && Math.abs(home - away) >= MIN_LEAD;

/** One rally: exactly one side gets +1. `rand` is injectable for tests. */
export const playRally = (
  s: SetState,
  rand: () => number = Math.random,
): SetState => {
  const win = rand() < 0.5;
  return {
    home: s.home + (win ? 1 : 0),
    away: s.away + (win ? 0 : 1),
    rallies: s.rallies + 1,
    entries: [win, ...s.entries],
  };
};
