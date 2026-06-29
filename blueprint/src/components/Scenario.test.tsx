import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Scenario } from "./Scenario";

describe("Scenario", () => {
  it("renders GIVEN, WHEN, THEN labels and prop values", () => {
    render(
      <Scenario
        given="the user is on the login page"
        when="they submit valid credentials"
        then="they are redirected to the dashboard"
      />
    );

    expect(screen.getByText("GIVEN")).toBeInTheDocument();
    expect(screen.getByText("WHEN")).toBeInTheDocument();
    expect(screen.getByText("THEN")).toBeInTheDocument();

    expect(screen.getByText("the user is on the login page")).toBeInTheDocument();
    expect(screen.getByText("they submit valid credentials")).toBeInTheDocument();
    expect(screen.getByText("they are redirected to the dashboard")).toBeInTheDocument();
  });
});
