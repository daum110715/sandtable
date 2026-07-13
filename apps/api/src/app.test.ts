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

  it("does not expose preset scenarios", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/api/v1/scenarios" });
    expect(res.statusCode).toBe(404);
  });

  it("idempotent deduce: same commandId does not duplicate events", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const payload = { commandId: "idem-1", rewriteText: "建立共享补给站" };
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
        payload: { commandId: "api-cmd-1", rewriteText: "建立共享补给站" },
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
      expect(state.json().worldState.setting.title).toBe("未命名世界");
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
      rewriteText: "调整资源分配规则",
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
      payload: { commandId: "r1", rewriteText: "建立共享补给站" },
    });
    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/session/reset",
      payload: { setting: { title: "重置后的世界", description: "新的起点" } },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().worldState.setting.title).toBe("重置后的世界");
    const events = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(events.json().length).toBe(0);
  });

  it("streams deduce progress over SSE", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/deduce/stream",
      payload: { commandId: "sse-1", rewriteText: "建立共享补给站" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("event: progress");
    expect(res.body).toContain("event: result");
  });

  it("returns API info at /api/v1", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/api/v1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: "sandtable", storage: "sqlite" });
  });

  it("returns world state at /api/v1/world-state", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/api/v1/world-state" });
    expect(res.statusCode).toBe(200);
    expect(res.json().worldState).toBeDefined();
    expect(res.json().worldState.worldlineId).toBeDefined();
  });

  it("returns events at /api/v1/events", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/api/v1/events" });
    expect(res.statusCode).toBe(200);
    expect(res.json().events).toBeDefined();
    expect(res.json().length).toBe(0);
  });

  it("sets all security headers", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  it("returns 422 for non-retryable agent error", async () => {
    const { AgentError } = await import("@sandtable/agents");
    const actor = {
      id: "x" as never,
      deduce: async () => {
        throw new AgentError("rejected", "content policy", {
          retryable: false,
        });
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
      payload: { commandId: "reject-1", rewriteText: "test" },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({ code: "rejected", retryable: false });
  });

  it("uses X-Forwarded-For header for rate limiting", async () => {
    const app = await buildApp({ ...appOpts, deduceRateLimit: 1 });
    apps.push(app);
    const payload = { commandId: "xff-1", rewriteText: "test" };

    const first = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload,
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(first.statusCode).toBe(200);

    const second = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "xff-2", rewriteText: "test" },
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(second.statusCode).toBe(429);
  });

  it("reports metrics after deductions", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "m1", rewriteText: "test" },
    });
    const m = await app.inject({ method: "GET", url: "/api/v1/metrics" });
    expect(m.json().metrics.deduceTotal).toBe(1);
    expect(m.json().metrics.deduceApplied).toBe(1);
  });
});
