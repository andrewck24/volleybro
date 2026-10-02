import { isSetOver, newSet, playRally } from "../set-model";

describe("set-model", () => {
  it("gives one side +1 per rally and ends at 25 with a 2-point lead", () => {
    for (let run = 0; run < 500; run++) {
      let s = newSet();
      while (!isSetOver(s)) {
        const prev = s;
        s = playRally(s);
        expect(s.home - prev.home + (s.away - prev.away)).toBe(1);
        expect(s.entries[0]).toBe(s.home > prev.home);
        expect(s.rallies).toBe(s.entries.length);
        expect(s.rallies).toBeLessThan(300);
      }
      // ended exactly when the rule was first met: 25 with lead, or deuce +2
      const hi = Math.max(s.home, s.away);
      const lo = Math.min(s.home, s.away);
      expect(hi).toBe(Math.max(25, lo + 2));
    }
  });

  it("does not end at 25-24 or 25-25, ends at 26-24 (deuce)", () => {
    let d = { home: 24, away: 24, rallies: 48, entries: [] as boolean[] };
    d = playRally(d, () => 0.1);
    expect(isSetOver(d)).toBe(false);
    d = playRally(d, () => 0.1);
    expect(isSetOver(d)).toBe(true);
    expect(d.home).toBe(26);
  });

  it("resets to an empty set", () => {
    expect(newSet()).toEqual({ home: 0, away: 0, rallies: 0, entries: [] });
  });
});
