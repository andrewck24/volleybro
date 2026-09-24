import { Position } from "@/entities/team";
import { UpdateLineupsSchema } from "@/interface/validations/team";
import type { LineupView } from "@/lib/features/team/types";
import { lineupActions } from "@/lib/features/team/lineup-slice";
import { makeStore } from "@/lib/redux/store";

type Store = ReturnType<typeof makeStore>;

const playerIds = Array.from(
  { length: 8 },
  (_, i) => `507f1f77bcf86cd79943901${i}`,
);

const loadedFromApi: LineupView[] = [
  {
    options: {
      liberoReplaceMode: 0 as const,
      liberoReplacePosition: Position.NONE,
    },
    starting: playerIds
      .slice(0, 6)
      .map((id) => ({ id, position: Position.OH })),
    liberos: [],
    substitutes: [],
  },
];

const editedBy = (edit: (store: Store) => void) => {
  const store = makeStore();
  store.dispatch(lineupActions.initialize(loadedFromApi));
  edit(store);
  return JSON.parse(JSON.stringify(store.getState().lineup.lineups));
};

describe("the lineup the editor saves", () => {
  it.each([
    ["straight after loading", () => {}],
    [
      "after adding a substitute",
      (s: Store) =>
        s.dispatch(lineupActions.addSubstitutePlayer(playerIds[6]!)),
    ],
    [
      "after adding then removing a substitute",
      (s: Store) => {
        s.dispatch(lineupActions.addSubstitutePlayer(playerIds[6]!));
        s.dispatch(lineupActions.removeSubstitutePlayer(playerIds[6]!));
      },
    ],
    ["after rotating", (s: Store) => s.dispatch(lineupActions.rotateLineup())],
    [
      "after changing the libero replacement option",
      (s: Store) =>
        s.dispatch(
          lineupActions.setLiberoReplace({
            liberoReplaceMode: 1,
            liberoReplacePosition: Position.MB,
          }),
        ),
    ],
  ])("passes the server's schema %s", (_label, edit) => {
    expect(UpdateLineupsSchema.safeParse(editedBy(edit)).success).toBe(true);
  });
});
