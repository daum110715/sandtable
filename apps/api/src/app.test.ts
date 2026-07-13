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

  it("creates and advances a custom world through the default local path", async () => {
    const app = await buildApp(appOpts);
    apps.push(app);
    const reset = await app.inject({
      method: "POST",
      url: "/api/v1/session/reset",
      payload: {
        setting: {
          title: "浮岛联盟",
          description: "漂浮岛屿依靠有限水源维系贸易。",
        },
      },
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().worldState.setting).toEqual({
      title: "浮岛联盟",
      description: "漂浮岛屿依靠有限水源维系贸易。",
    });

    const deduce = await app.inject({
      method: "POST",
      url: "/api/v1/deduce",
      payload: { commandId: "custom-world-1", rewriteText: "建立共享水源机制" },
    });
    expect(deduce.statusCode).toBe(200);
    expect(deduce.json().worldState.simulationTime).toBe("阶段 1");
    expect(
      deduce.json().worldState.resources["resource-effect-1"],
    ).toMatchObject({
      type: "world-effect",
      attributes: { description: "建立共享水源机制" },
    });
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
});
