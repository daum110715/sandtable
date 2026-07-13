import { describe, expect, it, vi } from "vitest";
import { logStructured } from "./log.js";

describe("logStructured", () => {
  it("writes JSON to console.info for info level", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logStructured({ level: "info", msg: "hello" });
    expect(spy).toHaveBeenCalledOnce();
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line.level).toBe("info");
    expect(line.msg).toBe("hello");
    expect(line.ts).toBeDefined();
    spy.mockRestore();
  });

  it("writes to console.warn for warn level", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logStructured({ level: "warn", msg: "warning" });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("writes to console.error for error level", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logStructured({ level: "error", msg: "fail" });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it("redacts secrets in msg", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logStructured({ level: "info", msg: "key=DEEPSEEK_API_KEY=secret123" });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line.msg).not.toContain("secret123");
    expect(line.msg).toContain("[REDACTED]");
    spy.mockRestore();
  });

  it("includes extra fields", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    logStructured({ level: "info", msg: "ok", requestId: "req-1" });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line.requestId).toBe("req-1");
    spy.mockRestore();
  });
});
