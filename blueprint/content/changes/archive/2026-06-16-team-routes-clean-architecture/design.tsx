"use client";

import { ApproachComparison } from "@/components/ApproachComparison";
import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";

export const toc = [
  { title: "Context", url: "#context", depth: 2 },
  { title: "Decision: Rename embedded player reference", url: "#decision-rename", depth: 2 },
  { title: "Decision: Bidirectional mapping", url: "#decision-mapping", depth: 2 },
  { title: "Decision: Persist lineups via findByIdAndUpdate", url: "#decision-persist", depth: 2 },
  { title: "Decision: Centralize game read/write mapping", url: "#decision-centralize", depth: 2 },
  { title: "Decision: Route team endpoints through controllers", url: "#decision-route", depth: 2 },
  { title: "Decision: Audit-first one-time migration", url: "#decision-migration", depth: 2 },
  { title: "Risks", url: "#risks", depth: 2 },
];

export default function Design() {
  return (
    <div className="space-y-10">
      <section>
        <h2 id="context">Context</h2>
        <p>
          Empirically verified against mongoose 9.4.1: lineup player subschemas set{" "}
          <code>{`{ _id: false }`}</code> and declare the player reference on an explicit{" "}
          <code>_id</code> ObjectId path. Because <code>id</code> is a read-only Mongoose virtual
          with no setter, every client/domain write silently drops the embedded player reference.
          The single-game read path only maps the top-level <code>_id → id</code>; nested player
          references stay as <code>_id</code>.
        </p>
      </section>

      <section>
        <h2 id="decision-rename">Decision: Rename embedded player reference from _id to nullable playerId</h2>
        <ApproachComparison
          approaches={[
            {
              name: "Rename _id → playerId (chosen)",
              pros: [
                "Eliminates the read-only virtual collision — playerId can be written",
                "Allows null to represent an empty slot explicitly",
                "Follows the ObjectId reference convention used elsewhere in the codebase",
              ],
              cons: [
                "Requires a one-time data migration for existing documents",
                "Shared lineupSchema change affects both team and game schemas simultaneously",
              ],
            },
            {
              name: "toJSON transform on _id",
              pros: ["No schema rename needed"],
              cons: [
                "Forks a second mapping path, fragile for nested subdocuments",
                "Does not fix the write-drop problem",
              ],
            },
            {
              name: "String-typed id field",
              pros: ["Avoids ObjectId conversion"],
              cons: [
                "Diverges from the ObjectId reference convention",
                "Loses type validation and join semantics",
              ],
            },
            {
              name: "Keep _id as-is",
              pros: ["No migration needed"],
              cons: [
                "Cannot express an empty reference",
                "Keeps the virtual write-drop bug permanently",
              ],
            },
          ]}
        />
      </section>

      <section>
        <h2 id="decision-mapping">Decision: Bidirectional mapping in the repository layer</h2>
        <p>
          The repository is the single translation boundary between the domain shape (
          <code>id: string | null</code>) and the persisted shape (<code>playerId: ObjectId | null</code>
          ). Read mappers convert <code>playerId → id</code>; write mappers convert{" "}
          <code>id → playerId</code>. Domain entities, Zod schemas, Redux, and React keep using{" "}
          <code>id</code> only.
        </p>
        <Scenario
          given="A lineup slot stored with playerId ObjectId 64b000000000000000000001"
          when="the team repository reads the team document"
          then="the lineup slot is exposed as id: '64b000000000000000000001' with no playerId field visible to the domain"
        />
        <Scenario
          given="A lineup slot with id: null submitted by the client"
          when="the team repository persists the lineup"
          then="the slot is stored as { playerId: null, position } — an object, never a bare null element"
        />
      </section>

      <section>
        <h2 id="decision-persist">Decision: Persist lineups via findByIdAndUpdate</h2>
        <p>
          <code>ITeamRepository.updateLineups(teamId, lineups)</code>: maps each lineup through the
          write mapper, calls <code>findByIdAndUpdate(teamId, {"{" } lineups {"}"}, {"{" } new: true {"}"} )</code>,
          throws <code>NotFoundError</code> when absent, and returns <code>toTeam(doc).lineups</code>.
          Updates <code>removePlayerFromLineups</code> to <code>$pull</code> by{" "}
          <code>playerId</code> instead of <code>_id</code>.
        </p>
      </section>

      <section>
        <h2 id="decision-centralize">Decision: Centralize game read and write mapping in the game repository</h2>
        <p>
          Extend <code>toGame</code> to map every embedded player reference (set lineups, team
          player/staff snapshots, rally detail, substitution entry <code>players.in/out</code>) to
          domain <code>id</code> on read. Add a <code>toGameDoc</code> write mapper applied in{" "}
          <code>create</code>/<code>update</code> mapping domain <code>id → playerId</code>. Game
          use cases and frontend consumers are unchanged.
        </p>
        <Scenario
          given="A game document with home starting slot 0 having playerId ObjectId 64b000000000000000000001"
          when="the game repository reads the game"
          then="sets[0].lineups.home[0] exposes id: '64b000000000000000000001'"
        />
      </section>

      <section>
        <h2 id="decision-route">Decision: Route team endpoints through controllers and use cases</h2>
        <p>
          <code>GET</code>/<code>PATCH /api/teams/[teamId]</code> and{" "}
          <code>PATCH /api/teams/[teamId]/lineups</code> each delegate to a thin use case (
          <code>GetTeamUseCase</code>, <code>UpdateTeamUseCase</code>,{" "}
          <code>UpdateTeamLineupsUseCase</code>) via a controller, mirroring{" "}
          <code>createTeamController</code>, bound with new <code>TYPES</code> symbols in the DI
          container. Authorization guards and input validation remain in the route layer.
        </p>
      </section>

      <section>
        <h2 id="decision-migration">Decision: Audit-first one-time migration</h2>
        <p>
          An audit script (dry-run) scans every embedded reference renamed by the schema change and
          reports counts of legacy <code>_id</code> references, resolvable references, and empty
          slots without writing. The migration script then renames <code>_id → playerId</code>,
          normalizes empty lineup slots to <code>{"{" } playerId: null, position {"}"}</code>, and is
          idempotent (a second run makes no changes). <code>substitution.players.in/out</code> is
          left intact as it was already well-named.
        </p>
        <Scenario
          given="A team lineup slot stored under the legacy _id path"
          when="the migration script runs"
          then="the slot is stored under playerId and a second run of the script reports zero modifications"
        />
      </section>

      <section>
        <h2 id="risks">Risks</h2>
        <RiskTable
          risks={[
            {
              name: "Real production data state is unknown; references may have been dropped on prior writes",
              severity: "warning",
              mitigation:
                "Audit script runs first (dry-run) so migration decisions are based on observed data, not assumptions",
            },
            {
              name: "Renaming the shared lineupSchema field affects game persistence and reads simultaneously",
              severity: "warning",
              mitigation:
                "Centralize mapping in both repositories and migrate team and game documents together in one idempotent script",
            },
            {
              name: "Thin pass-through team use cases add ceremony",
              severity: "info",
              mitigation:
                "Accepted to satisfy uniform Clean Architecture layering for team routes; cost is three small files mirroring CreateTeamUseCase",
            },
            {
              name: "Repository unit tests mock Mongoose, so real subdocument behavior is not exercised",
              severity: "info",
              mitigation:
                "Write mappers make id ↔ playerId explicit and independent of Mongoose defaults; manual verification covers the real persistence round-trip",
            },
          ]}
        />
      </section>
    </div>
  );
}
