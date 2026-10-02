// PROTOTYPE (throwaway): the one fixture behind the Hero clock and landing
// sections 3-4. Pure literals plus a pure fold, no app imports, so the Hero
// side can load it without pulling the recording components into the first
// bundle.
export const DEMO_GAME_ID = "demo-game";

export const HOME_TEAM = { id: "demo-home", name: "海豚隊" };
export const AWAY_TEAM = { id: "demo-away", name: "獵鷹隊" };

export const HOME_PLAYERS = [
  { id: "p1", name: "陳冠宇", number: 1, position: "S" },
  { id: "p2", name: "林子謙", number: 5, position: "OH" },
  { id: "p3", name: "黃柏翰", number: 7, position: "OH" },
  { id: "p4", name: "張承恩", number: 9, position: "MB" },
  { id: "p5", name: "吳宇軒", number: 11, position: "OP" },
  { id: "p6", name: "李柏諺", number: 14, position: "MB" },
  { id: "p7", name: "王俊傑", number: 3, position: "L" },
];

export const AWAY_PLAYERS = [
  { id: "a1", name: "對手一號", number: 2 },
  { id: "a2", name: "對手二號", number: 4 },
];

// home/away are indexes into lib/scoring-moves `scoringMoves` (each away is one
// of the home move's `outcome`); `win` is that home move's `win`, stated here
// so this module stays import-free.
type RallySpec = { player: string; home: number; away: number; win: boolean };

export const SEED_RALLIES: RallySpec[] = [
  { player: "p3", home: 4, away: 3, win: true },
  { player: "p2", home: 5, away: 11, win: false },
  { player: "p1", home: 0, away: 6, win: true },
  { player: "p3", home: 4, away: 7, win: true },
  { player: "p5", home: 1, away: 9, win: false },
  { player: "p6", home: 2, away: 5, win: true },
  { player: "p3", home: 4, away: 3, win: true },
  { player: "p7", home: 6, away: 0, win: false },
];

// The rally the scroll flow records live. Same player id wherever rotation
// puts them on the court.
export const SENT_RALLY: RallySpec = {
  player: "p3",
  home: 4,
  away: 7,
  win: true,
};

export const foldRallies = (specs: RallySpec[]) => {
  let home = 0;
  let away = 0;
  return specs.map((s) => {
    if (s.win) home++;
    else away++;
    return { ...s, homeScore: home, awayScore: away };
  });
};

export const ALL_RALLIES = foldRallies([...SEED_RALLIES, SENT_RALLY]);
