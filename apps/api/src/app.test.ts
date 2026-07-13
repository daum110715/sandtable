import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  while (dirs.length > 0) {
    const d = dirs.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

const appOpts = {
  agentMode: "stub" as const,
  silentLog: true,
  deduceRateLimit: 0,
};

describe("API endpoints", () => {
  it("reports health without external services", async () => {
    const app = await buildApp({ ...appOpts });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.json()).toMatchObject({
      status: "ok",
      system: "sandtable",
    });
  });

  it("reports ready when sqlite is available", async () => {
    const app = await buildApp({ ...appOpts, dbPath: ":memory:" });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ready", storage: "ok" });
  });

  it("lists scenarios", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/api/v1/scenarios" });
    expect(res.statusCode).toBe(200);
    expect(res.json().scenarios.length).toBeGreaterThanOrEqual(1);
  });

  it("idempotent deduce: same commandId does not duplicate events", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const payload = { commandId: "idem-1", rewriteText: "那天江上刮西北风" };
    const a = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload,
    });
    const b = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload,
    });
    expect(a.json().outcome).toBe("applied");
    expect(b.json().outcome).toBe("duplicate");
    const events = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(events.json().length).toBe(1);
    const m = await app.inject({ method: "GET", url: "/api/v1/metrics" });
    expect(m.json().metrics.deduceDuplicate).toBe(1);
    expect(m.json().metrics.deduceApplied).toBe(1);
  });

  it("survives process restart without losing confirmed events", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sandtable-api-m6-"));
    dirs.push(dir);
    const dbPath = join(dir, "api.sqlite");

    {
      const app = await buildApp({ ...appOpts, dbPath });
      apps.push(app);
      await app.inject({
        method: "POST",
        url: "/api/v1/deduce",
        payload: { commandId: "api-cmd-1", rewriteText: "那天江上刮西北风" },
      });
      await app.close();
      apps.pop();
    }

    {
      const app = await buildApp({ ...appOpts, dbPath });
      apps.push(app);
      const events = await app.inject({ method: "GET", url: "/api/v1/events" });
      expect(events.json().length).toBe(1);
      const state = await app.inject({
        method: "GET",
        url: "/api/v1/world-state",
      });
      expect(
        state.json().worldState.resources["resource-wind"]?.attributes
          ?.direction,
      ).toBe("西北风");
    }
  });

  it("model failure does not write state or events", async () => {
    const { AgentError } = await import("@sandtable/agents");
    const actor = {
      id: "x" as never,
      deduce: async () => {
        throw new AgentError("timeout", "model slow", { retryable: true });
      },
    };
    const recorder = {
      id: "y" as never,
      record: async () => ({ stateChanges: [], narrative: { text: "" } }),
    };
    const app = await buildApp({
      ...appOpts,
      actor,
      recorder,
      agentMode: "model",
    });
    apps.push(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "fail-1", rewriteText: "test" },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ code: "timeout", retryable: true });
    const events = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(events.json().length).toBe(0);
  });

  it("rejects invalid input", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "bad space", rewriteText: "x" },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe("validation_error");
  });

  it("rate limits deduce requests", async () => {
    const app = await buildApp({ ...appOpts, deduceRateLimit: 2 });
    apps.push(app);
    const payload = (id: string) => ({
      commandId: id,
      rewriteText: "曹操退守许都",
    });
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/deduce",
          payload: payload("r1"),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/deduce",
          payload: payload("r2"),
        })
      ).statusCode,
    ).toBe(200);
    const limited = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: payload("r3"),
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.json().code).toBe("rate_limited");
    expect(limited.headers["retry-after"]).toBeDefined();
  });

  it("resets session clearing events", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "r1", rewriteText: "那天江上刮西北风" },
    });
    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/session/reset",
      payload: { scenarioId: "chibi" },
    });
    expect(reset.statusCode).toBe(200);
    const events = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(events.json().length).toBe(0);
  });

  it("streams deduce progress over SSE", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/deduce/stream",
      payload: { commandId: "sse-1", rewriteText: "那天江上刮西北风" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("event: progress");
    expect(res.body).toContain("event: result");
  });
});
