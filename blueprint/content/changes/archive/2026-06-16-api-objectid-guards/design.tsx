"use client";

import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";

export const toc = [
  { title: "Context", url: "#context", depth: 2 },
  {
    title: "Key Decision: Where to place the guard",
    url: "#key-decision",
    depth: 2,
  },
  { title: "Caller Convention", url: "#caller-convention", depth: 2 },
  { title: "Key Scenarios", url: "#key-scenarios", depth: 2 },
  { title: "Risks", url: "#risks", depth: 2 },
];

const guardApproaches = [
  {
    name: "Shared assertObjectId at route boundary (chosen)",
    pros: [
      "Single source of truth for ObjectId format validation",
      "Zero side-effects on invalid input — no DB connection, no auth check",
      "One-liner insertion at each call site",
      "Error message names the specific parameter (teamId, gameId, playerId)",
    ],
    cons: [
      "Must be applied manually at each new route that accepts an ObjectId segment",
    ],
  },
  {
    name: "Teach translateRepositoryError to catch BSONError",
    pros: ["No call-site changes needed"],
    cons: [
      "Hides input validation concern inside the infrastructure layer",
      "Generic error messages don't identify which parameter was malformed",
      "DB connection and auth calls still run before the error is caught",
    ],
  },
  {
    name: "withValidatedParams(schema) wrapper factory",
    pros: ["Could enforce validation via type-level schema"],
    cons: [
      "Requires wrapper to understand Next.js async props.params destructuring",
      "Added complexity with no benefit over a one-line assertObjectId call",
    ],
  },
];

export default function Design() {
  return (
    <div className="space-y-8">
      <section>
        <h2 id="context">Context</h2>
        <p>
          All API route handlers that accept a MongoDB ObjectId as a URL path
          segment should validate that segment before any side-effectful call.
          Only <code>teams/[teamId]/route.ts</code> did this via a local{" "}
          <code>assertValidObjectId</code> function. Ten other handlers passed
          the raw path string to the authorization or database layer, where an
          invalid string caused a <code>BSONError</code> that surfaced as an
          unhandled 500.
        </p>
      </section>

      <section>
        <h2 id="key-decision">Key Decision: Where to place the guard</h2>
        <table>
          <thead>
            <tr>
              <th>Approach</th>
              <th>Pros</th>
              <th>Cons</th>
            </tr>
          </thead>
          <tbody>
            {guardApproaches.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>
                  <ul>
                    {a.pros.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <ul>
                    {a.cons.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 id="caller-convention">Caller Convention</h2>
        <p>
          Each handler calls <code>assertObjectId</code> immediately after{" "}
          <code>const {"{ xId }"} = await props.params</code>, before{" "}
          <code>connectToMongoDB</code> and before any authorization check.
          Placement before <code>connectToMongoDB</code> avoids unnecessary
          connection overhead on invalid requests.
        </p>
      </section>

      <section>
        <h2 id="key-scenarios">Key Scenarios</h2>
        <div className="space-y-4">
          <Scenario
            given="A route handler receives a 24-character hexadecimal path segment"
            when="assertObjectId is called"
            then="It returns void and handler execution continues normally"
          />
          <Scenario
            given="A route handler receives a path segment that does not match /^[0-9a-fA-F]{24}$/"
            when="assertObjectId is called"
            then="It throws ValidationError → withErrorHandler returns 400 with code: VALIDATION, reason: INVALID_INPUT, and no DB or auth call is made"
          />
          <Scenario
            given="assertObjectId is called with param = 'teamId' and an invalid id"
            when="The ValidationError is serialized"
            then="The error detail reads 'Invalid teamId format'"
          />
        </div>
      </section>

      <section>
        <h2 id="risks">Risks</h2>
        <RiskTable
          risks={[
            {
              name: "Forgetting a new route handler",
              severity: "warning",
              mitigation:
                "Unit and integration tests cover all current call sites; new routes must be reviewed at PR time",
            },
            {
              name: "OBJECT_ID_RE duplication across files",
              severity: "info",
              mitigation:
                "Fixed post-review: OBJECT_ID_RE exported from guards.ts and imported in team.ts",
            },
            {
              name: "Silent green tests (try/catch without expect.assertions)",
              severity: "warning",
              mitigation:
                "Fixed post-review: expect.assertions(N) added to affected tests so Jest fails when catch is never entered",
            },
            {
              name: "game.repository.mongo.ts duplication",
              severity: "info",
              mitigation:
                "Intentionally left as-is — that check is a cursor pagination concern inside the infrastructure layer, not a route boundary concern",
            },
          ]}
        />
      </section>
    </div>
  );
}
