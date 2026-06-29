"use client";
import { ApproachComparison } from "@/components/ApproachComparison";
import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";

const routingDecisions = [
  {
    name: "Intercepting routes with @modal parallel slot (chosen)",
    pros: [
      "URL updates on navigation — back button, direct linking, and copy-paste URL sharing all work",
      "Hard navigation bypasses the intercepting route and renders the workspace version automatically",
      "No additional routing logic needed for the modal/workspace split",
    ],
    cons: [
      "Next.js intercepting routes + parallel slots have known edge cases (cache invalidation, hard-refresh behavior)",
      "Requires default.tsx in slot directory to prevent 404 on hard refresh",
    ],
  },
  {
    name: "Inline modals triggered by buttons without URL change (rejected)",
    pros: ["Simpler implementation — no intercepting routes or parallel slots"],
    cons: [
      "Breaks browser back button",
      "No direct linking or copy-paste URL sharing",
      "Harder to test and reason about navigation state",
    ],
  },
];

const modalComponentDecisions = [
  {
    name: "shadcn Dialog (chosen)",
    pros: [
      "Works identically on desktop (centered modal) and mobile (bottom sheet) via existing DialogContent styles",
      "Maximize affordance fits naturally in a Dialog header",
      "Already used throughout the codebase — no new component dependency",
    ],
    cons: ["None significant"],
  },
  {
    name: "Sheet component (rejected)",
    pros: ["Explicit bottom-sheet semantics on mobile"],
    cons: [
      "Desktop behavior differs — Sheet always slides from a side edge",
      "Maximize affordance less natural in a Sheet header",
    ],
  },
];

const formLibraryDecisions = [
  {
    name: "React Hook Form with zodResolver (chosen)",
    pros: [
      "Eliminates manual error state management (ZodError caught, mapped, stored in useState)",
      "Uses existing src/components/ui/form.tsx (FormProvider, FormField, FormMessage) — no new UI components",
      "FormLabel already includes FormMessage so error display is zero additional JSX",
      "Consistent with existing game forms that already use RHF",
    ],
    cons: [
      "Migration effort for existing team/player forms",
      "RHF migration changes form behavior (validation timing, error display) — mitigated by default onSubmit mode matching current behavior",
    ],
  },
  {
    name: "Raw useState + manual ZodError handling (status quo, rejected)",
    pros: ["No migration needed"],
    cons: [
      "Manual error state management grows worse as field counts increase",
      "Inconsistency with game forms (already on RHF) will worsen over time",
    ],
  },
];

const risks = [
  {
    name: "Next.js intercepting routes + parallel slots edge cases",
    severity: "warning" as const,
    mitigation:
      "Each slot directory includes default.tsx returning null (already required by tab-navigation spec); workspace routes at app/(workspace)/team/ serve as the hard-refresh fallback",
  },
  {
    name: "Large directory rename (protected) → (tabs) may break absolute imports",
    severity: "info" as const,
    mitigation:
      "Route group names are not part of URLs or import paths in Next.js; only src/app/(protected)/layout.tsx is directly referenced and only by its own file tree",
  },
  {
    name: "sessionStorage key collisions if two tabs edit the same entity simultaneously",
    severity: "info" as const,
    mitigation:
      "sessionStorage is tab-scoped by design; two browser tabs have separate sessionStorage instances",
  },
  {
    name: "RHF migration changes form validation timing and error display",
    severity: "warning" as const,
    mitigation:
      "Default RHF mode is onSubmit, matching current manual Zod-on-submit behavior; FormLabel includes FormMessage so errors appear inline as before",
  },
];

export default function Design() {
  return (
    <div className="space-y-8">
      <p>
        The <code>(protected)</code> route group provided the tab navigation shell but was
        misleadingly named. Edit pages lived inside it as parallel route slots, rendering
        with the bottom nav bar visible during focused editing. Team and player forms used
        raw <code>useState</code> + manual ZodError parsing while game forms already used
        React Hook Form. This change renames the route group, introduces an intercepting-route
        modal pattern, and migrates all team/player forms to RHF.
      </p>

      <h2>Routing Architecture</h2>
      <ApproachComparison approaches={routingDecisions} />

      <h2>Modal Component</h2>
      <ApproachComparison approaches={modalComponentDecisions} />

      <h2>Form Library</h2>
      <ApproachComparison approaches={formLibraryDecisions} />

      <h2>Key Implementation Contracts</h2>

      <h3>Maximize flow</h3>
      <p>
        When the user clicks the maximize button in the Dialog header,{" "}
        <code>EditDialogContainer</code> calls <code>suppressLeaveWarning()</code> then{" "}
        <code>window.location.assign(fullPageHref)</code>. Hard navigation bypasses the
        intercepting route and renders the workspace version. The workspace form reads the
        same <code>useFormDraft</code> key and restores state from sessionStorage.
      </p>

      <h3>useFormDraft merge strategy</h3>
      <p>
        The persisted draft is merged over caller-supplied <code>defaultValues</code> (
        <code>{"{ ...defaultValues, ...draft }"}</code>). This keeps the baseline field shape
        stable despite <code>JSON.stringify</code> dropping <code>undefined</code> fields.
        Persistence is gated on <code>form.formState.isDirty</code> so the pristine initial
        snapshot is never written.
      </p>

      <h3>Dialog header scroll containment</h3>
      <p>
        <code>EditDialogContainer</code> wraps <code>{"{children}"}</code> in an{" "}
        <code>overflow-y-auto</code> div. The header is not <code>sticky</code> — it is
        naturally pinned at the top of <code>DialogContent</code> while only the form content
        scrolls.
      </p>

      <h3>Workspace wrappers co-location rule</h3>
      <p>
        <code>*Workspace</code> components are co-located in the same file as their base form
        component (e.g., <code>EditTeamWorkspace</code> lives in{" "}
        <code>src/components/team/form.tsx</code> alongside <code>TeamForm</code>). A separate{" "}
        <code>workspace/</code> directory is not created.
      </p>

      <h2>Key Scenarios</h2>

      <Scenario
        given="The user is within the (tabs) layout and navigates to /team/{teamId}/edit via soft navigation"
        when="The @modal intercepting route captures the navigation"
        then="The team edit form renders inside a Dialog overlay; the tab content remains visible behind it; the URL updates to /team/{teamId}/edit"
      />

      <Scenario
        given="The user fills a team edit Dialog partially and clicks the maximize button"
        when="suppressLeaveWarning() is called, then window.location.assign('/team/{teamId}/edit') is invoked"
        then="No native beforeunload prompt appears; the Dialog closes; the workspace form mounts with values restored from sessionStorage"
      />

      <Scenario
        given="The user has unsaved changes in an edit Dialog and clicks the close button"
        when="form.formState.isDirty is true"
        then="An AlertDialog confirmation appears; if confirmed, clearDraft() is called and the Dialog closes; if cancelled, the Dialog remains open"
      />

      <Scenario
        given="A form with optional fields left empty mounts, unmounts, and remounts (e.g. Dialog reopen)"
        when="useFormDraft merges the draft over defaultValues"
        then="The rehydrated baseline retains the full field shape; React Hook Form reports isDirty as false; no discard AlertDialog is triggered"
      />

      <h2>Risks</h2>
      <RiskTable risks={risks} />
    </div>
  );
}
