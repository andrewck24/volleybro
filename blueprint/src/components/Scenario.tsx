type ScenarioProps = {
  given: string;
  when: string;
  then: string;
};

export function Scenario({ given, when, then }: ScenarioProps) {
  return (
    <div>
      <div>
        <span>GIVEN</span> {given}
      </div>
      <div>
        <span>WHEN</span> {when}
      </div>
      <div>
        <span>THEN</span> {then}
      </div>
    </div>
  );
}
