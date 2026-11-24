import { rallyPlayerId } from "../object-id";

const OID = "507f1f77bcf86cd799439011";

describe("rallyPlayerId", () => {
  it.each([
    ["null", null, null],
    ["an empty string", "", null],
    ["an ObjectId", OID, OID],
  ])("accepts %s", (_, input, output) => {
    expect(rallyPlayerId.parse(input)).toBe(output);
  });

  it.each([["p1"], [OID.slice(1)], [`${OID} `]])(
    "rejects the string %j",
    (input) => {
      expect(rallyPlayerId.safeParse(input).success).toBe(false);
    },
  );

  it.each([[undefined], [7], [{}]])("rejects the value %j", (input) => {
    expect(rallyPlayerId.safeParse(input).success).toBe(false);
  });
});
