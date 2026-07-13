import { describe, expect, it } from "vitest";
import { AgentError } from "./errors.js";
import { parseJsonObject } from "./json.js";

describe("parseJsonObject", () => {
  it("parses plain json", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses fenced json with language tag", () => {
    expect(parseJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("parses fenced json without language tag", () => {
    expect(parseJsonObject('```\n{"a":3}\n```')).toEqual({ a: 3 });
  });

  it("extracts json from surrounding text", () => {
    expect(parseJsonObject('here is the result: {"a":4} done')).toEqual({
      a: 4,
    });
  });

  it("throws AgentError on garbage", () => {
    expect(() => parseJsonObject("not-json")).toThrow(AgentError);
  });

  it("sets cause from parse error", () => {
    try {
      parseJsonObject("not-json");
    } catch (e) {
      expect((e as AgentError).code).toBe("invalid_output");
      expect((e as AgentError).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("parses nested objects", () => {
    const input =
      '{"narrative":"text","intendedChanges":[{"description":"d"}]}';
    const result = parseJsonObject(input) as Record<string, unknown>;
    expect(result.narrative).toBe("text");
    expect(Array.isArray(result.intendedChanges)).toBe(true);
  });

  it("handles whitespace around json", () => {
    expect(parseJsonObject('  {"a":5}  ')).toEqual({ a: 5 });
  });
});
