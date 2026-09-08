import { TeamSchema } from "@/components/team/form";
import {
  CreateTeamSchema,
  TeamUpdateSchema,
} from "@/interface/validations/team";
describe("what the team form submits", () => {
  it.each([
    ["a name and a nickname", { name: "RyuJin", nickname: "RYUJIN" }],
    ["a name and an empty nickname", { name: "RyuJin", nickname: "" }],
  ])("passes both server schemas with %s", (_label, values) => {
    expect(TeamSchema.safeParse(values).success).toBe(true);

    expect(CreateTeamSchema.safeParse(values).success).toBe(true);
    expect(TeamUpdateSchema.safeParse(values).success).toBe(true);
  });
});
