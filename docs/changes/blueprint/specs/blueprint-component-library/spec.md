## ADDED Requirements

### Requirement: Typed component props — no runtime errors from missing data

#### Scenario: Component with missing required prop fails at build time

- **WHEN** a `.mdx` or `.tsx` file uses a component with a missing required prop
- **THEN** `pnpm --filter blueprint build` fails with a TypeScript error
- **AND** the error message names the missing prop and the component

#### Scenario: Component renders correctly with all required props

- **WHEN** a component receives all required props of correct types
- **THEN** it renders without throwing a runtime error

### Requirement: Tier 1 artifact display components

All 8 Tier 1 components are available for use in `.mdx` and `.tsx` files.

#### Scenario: Scenario component renders GIVEN/WHEN/THEN structure

- **WHEN** `<Scenario given="..." when="..." then="..." />` is used
- **THEN** the rendered output displays labeled given, when, and then sections

#### Scenario: ApproachComparison renders comparison table

- **WHEN** `<ApproachComparison approaches={[...]} />` is used with an array of `{name, pros, cons}` objects
- **THEN** a comparison table renders with one row per approach

#### Scenario: RiskTable renders severity-ordered rows

- **WHEN** `<RiskTable risks={[...]} />` is used
- **THEN** risks are displayed with name, severity badge, and mitigation column

#### Scenario: AnnotatedDiff renders code diff with inline annotations

- **WHEN** `<AnnotatedDiff diff="..." annotations={[...]} />` is used
- **THEN** diff lines render with syntax highlighting and annotation callouts at the annotated line numbers

#### Scenario: SeverityBadge renders correct color for each severity level

##### Example: Severity badge colors

| severity | expected color token |
|----------|---------------------|
| critical | red |
| warning  | yellow |
| info     | blue |
| ok       | green |

- **GIVEN** `<SeverityBadge level="critical" />`
- **THEN** the badge renders with the red color token

#### Scenario: Verdict component renders pass/fail/partial state

- **WHEN** `<Verdict status="pass" />`, `<Verdict status="fail" />`, or `<Verdict status="partial" />` is used
- **THEN** the component renders with a corresponding icon and label

#### Scenario: ExampleTable renders example rows from spec

- **WHEN** `<ExampleTable rows={[...]} headers={[...]} />` is used
- **THEN** a table renders with the provided headers and data rows

### Requirement: Tier 2 feature showcase and status components

#### Scenario: TaskProgress renders done/total counts with progress bar

- **WHEN** `<TaskProgress done={4} total={7} />` is used
- **THEN** a progress bar and "4/7" label render

##### Example: TaskProgress display

- **GIVEN** `<TaskProgress done={0} total={5} />`
- **THEN** progress bar is empty (0%) and label shows "0/5"
- **GIVEN** `<TaskProgress done={5} total={5} />`
- **THEN** progress bar is full (100%) and label shows "5/5"

#### Scenario: Timeline renders ordered events

- **WHEN** `<Timeline events={[{date, label, description}]} />` is used
- **THEN** events render in chronological order with date, label, and description

#### Scenario: PRWriteup renders PR metadata

- **WHEN** `<PRWriteup number={308} title="..." status="merged" />` is used
- **THEN** PR number, title, and a "merged" badge render

### Requirement: InteractiveFlowchart internal state management

#### Scenario: Click state is isolated to the component instance

- **WHEN** two `<InteractiveFlowchart>` components exist on the same page
- **THEN** clicking a node in one component does not affect the detail panel of the other
