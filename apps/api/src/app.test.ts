import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

const apps: Array<ReturnType<typeof buildApp>> = [];
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  while (dirs.length > 0) {
    const d = dirs.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

describe("API framework", () => {
  it("reports health without external services", async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", system: "sandtable" });
  });

  it("reports ready when sqlite is available", async () => {
    const app = buildApp({ dbPath: ":memory:", agentMode: "stub" });
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/ready" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ready",
      storage: "ok",
      agentMode: "stub",
    });
  });

  it("deduce writes event and is idempotent; reopen keeps data", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sandtable-api-m3-"));
    dirs.push(dir);
    const dbPath = join(dir, "api.sqlite");

    {
      const app = buildApp({ dbPath, agentMode: "stub" });
      apps.push(app);

      const first = await app.inject({
        method: "POST",
        url: "/api/v1/deduce",
        payload: { commandId: "api-cmd-1", rewriteText: "那天江上刮西北风" },
      });
      expect(first.statusCode).toBe(200);
      expect(first.json().outcome).toBe("applied");

      const dup = await app.inject({
        method: "POST",
        url: "/api/v1/deduce",
        payload: { commandId: "api-cmd-1", rewriteText: "那天江上刮西北风" },
      });
      expect(dup.json().outcome).toBe("duplicate");

      const events = await app.inject({ method: "GET", url: "/api/v1/events" });
      expect(events.json().length).toBe(1);

      await app.close();
      apps.pop();
    }

    {
      const app = buildApp({ dbPath, agentMode: "stub" });
      apps.push(app);
      const events = await app.inject({ method: "GET", url: "/api/v1/events" });
      expect(events.json().length).toBe(1);
      const state = await app.inject({ method: "GET", url: "/api/v1/world-state" });
      const wind =
        state.json().worldState.resources["resource-wind"]?.attributes?.direction;
      expect(wind).toBe("西北风");
    }
  });

  it("returns 503 with retryable when agent fails without writing", async () => {
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
    const app = buildApp({
      dbPath: ":memory:",
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
});
