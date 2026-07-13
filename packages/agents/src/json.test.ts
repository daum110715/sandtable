import { describe, expect, it } from "vitest";
import { AgentError } from "./errors.js";
import { parseJsonObject } from "./json.js";

describe("parseJsonObject", () => {
  it("parses plain json", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses fenced json", () => {
    expect(parseJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it("throws AgentError on garbage", () => {
    expect(() => parseJsonObject("not-json")).toThrow(AgentError);
  });
});
