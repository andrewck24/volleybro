// The one demo set (25:21) behind the hero, stats and walkthrough. It imports
// nothing from the app, so the hero side loads it without the recording code.
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

// home/away are indexes into lib/scoring-moves `scoringMoves` (away is one of
// the home move's `outcome`); `win` mirrors that home move's `win`, stated here
// so this module stays import-free.
export type RallySpec = {
  player: string;
  home: number;
  away: number;
  win: boolean;
};

const r = (player: string, home: number, away: number, win: boolean) => ({
  player,
  home,
  away,
  win,
});

// Rallies 1-12: the state the walkthrough opens on (7:5). Two of the losses are
// the opponent's attack points (home 7→away 4, home 3→away 4), so the ATTACK
// bar is 2:2 and the sent rally visibly moves it to 3:2.
const OPENING: RallySpec[] = [
  r("p3", 4, 3, true),
  r("p2", 5, 11, false),
  r("p1", 0, 6, true),
  r("p3", 4, 7, true),
  r("p5", 1, 9, false),
  r("p7", 7, 4, false),
  r("p6", 2, 5, true),
  r("p4", 9, 1, true),
  r("p7", 6, 0, false),
  r("p2", 3, 4, false),
  r("p5", 13, 7, true),
  r("p3", 11, 5, true),
];

/** Rally 13 — the one the walkthrough records live and the stats count (+1 ATTACK). */
export const SENT_RALLY: RallySpec = r("p3", 4, 7, true);

// The rest of the set, as W/L; moves cycle through these templates.
const TAIL = "LLLWLLWLLLWWWLWWLWLLWWLWWLWLWWLWW";
const WINS = [
  r("p2", 4, 3, true),
  r("p6", 2, 5, true),
  r("p4", 10, 3, true),
  r("p1", 0, 6, true),
  r("p5", 4, 7, true),
];
const LOSSES = [
  r("p7", 6, 0, false),
  r("p3", 5, 2, false),
  r("p7", 7, 4, false),
  r("p2", 1, 9, false),
];

let w = 0;
let l = 0;
export const SET_RALLIES: RallySpec[] = [
  ...OPENING,
  SENT_RALLY,
  ...[...TAIL].map((c) =>
    c === "W" ? WINS[w++ % WINS.length]! : LOSSES[l++ % LOSSES.length]!,
  ),
];

/** How many rallies the recorded game holds before the walkthrough's live rally. */
export const SEED_COUNT = OPENING.length;

/** One rally beat in ms: the clock's interval, and `--rally-beat` for the animations tied to it. */
export const INTERVAL = 2200;

/** The set with the running score after each rally. */
export const FOLDED_RALLIES = (() => {
  let home = 0;
  let away = 0;
  return SET_RALLIES.map((rally) => {
    if (rally.win) home++;
    else away++;
    return { ...rally, homeScore: home, awayScore: away };
  });
})();

const DIFF_SERIES = [
  0,
  ...FOLDED_RALLIES.map((rally) => rally.homeScore - rally.awayScore),
];

/** Running point differential (home − away) from 0 after `rallies` rallies. */
export const diffsAt = (rallies: number) => DIFF_SERIES.slice(0, rallies + 1);
