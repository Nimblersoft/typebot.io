import { SessionStore } from "@typebot.io/runtime-session-store";
import { describe, expect, it } from "vitest";
import { evaluateSetVariableExpression } from "./evaluateSetVariableExpression";
import type { Variable } from "./schemas";

describe("evaluateSetVariableExpression — variable injection into code", () => {
  it("injects a string variable whose id starts with a digit without a SyntaxError", async () => {
    // Regression: variable ids beginning with a digit (e.g. "1afdde38...") are
    // not valid JS identifiers. parseVariables(fieldToParse: "id") used to emit
    // `const notes = 1afdde38... || ""` which threw, then fell back to raw-text
    // substitution of the value, throwing a second SyntaxError and returning the
    // raw string. The fix prefixes digit-leading ids with `_` before injection.
    const variables: Variable[] = [
      {
        id: "1afdde38ffaed69461d13b93",
        name: "crm_notes",
        value: "User wants AI integration for their running/fitness website.",
      },
    ];
    const sessionStore = new SessionStore();

    const { value, error } = await evaluateSetVariableExpression(
      {
        type: "code",
        code: 'const notes = {{crm_notes}} || ""; return notes;',
      },
      { variables, sessionStore },
    );

    expect(error).toBeUndefined();
    expect(value).toBe(
      "User wants AI integration for their running/fitness website.",
    );
    sessionStore.dispose();
  });

  it("handles multiline / multi-variable codes with digit-leading ids", async () => {
    const variables: Variable[] = [
      {
        id: "1afdde38ffaed69461d13b93",
        name: "crm_notes",
        value: "line one\nline two with 'quotes' and \"double\"",
      },
      {
        id: "2cedf4ecf329a04c2be55fc5",
        name: "crm_interests",
        value: "running, fitness, AI",
      },
    ];
    const sessionStore = new SessionStore();

    const { value, error } = await evaluateSetVariableExpression(
      {
        type: "code",
        code: [
          'const notes = {{crm_notes}} || "";',
          'const interests = {{crm_interests}} || "";',
          "return JSON.stringify({ notes, interests });",
        ].join("\n"),
      },
      { variables, sessionStore },
    );

    expect(error).toBeUndefined();
    expect(JSON.parse(value as string)).toEqual({
      notes: "line one\nline two with 'quotes' and \"double\"",
      interests: "running, fitness, AI",
    });
    sessionStore.dispose();
  });

  it("still works for variables whose id starts with a letter", async () => {
    const variables: Variable[] = [
      { id: "pih5wmcjm4mhnzbvfp9rjrm2", name: "lead_name", value: "Ada" },
    ];
    const sessionStore = new SessionStore();

    const { value, error } = await evaluateSetVariableExpression(
      { type: "code", code: 'return "Hello " + ({{lead_name}} || "there");' },
      { variables, sessionStore },
    );

    expect(error).toBeUndefined();
    expect(value).toBe("Hello Ada");
    sessionStore.dispose();
  });
});
