import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  withRetry,
  fetchScenarios,
  fetchWorldState,
  fetchEvents,
  resetSession,
  deduceOnce,
  newCommandId,
} from "./client.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const errorResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("ApiError", () => {
  it("marks 5xx as retryable by default", () => {
    const e = new ApiError(503, {
      error: "timeout",
      code: "timeout",
      retryable: true,
    });
    expect(e.retryable).toBe(true);
    expect(e.code).toBe("timeout");
    expect(e.status).toBe(503);
    expect(e.name).toBe("ApiError");
  });

  it("marks 4xx as non-retryable by default", () => {
    const e = new ApiError(400, { error: "bad request" });
    expect(e.retryable).toBe(false);
  });

  it("uses HTTP status as message when body.error is missing", () => {
    const e = new ApiError(500, {});
    expect(e.message).toBe("HTTP 500");
  });

  it("uses body.error as message", () => {
    const e = new ApiError(422, { error: "validation failed" });
    expect(e.message).toBe("validation failed");
  });
});

describe("withRetry", () => {
  it("retries retryable errors then succeeds", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new ApiError(503, { error: "slow", retryable: true });
      return "ok";
    });
    await expect(withRetry(fn, { attempts: 2 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable", async () => {
    const fn = vi.fn(async () => {
      throw new ApiError(422, { error: "bad", retryable: false });
    });
    await expect(withRetry(fn, { attempts: 3 })).rejects.toMatchObject({
      status: 422,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry callback", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new ApiError(503, { error: "slow", retryable: true });
      return "ok";
    });
    const onRetry = vi.fn();
    await withRetry(fn, { attempts: 2, onRetry });
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledWith(expect.any(ApiError), 1);
  });

  it("does not retry non-ApiError errors", async () => {
    const fn = vi.fn(async () => {
      throw new TypeError("network");
    });
    await expect(withRetry(fn, { attempts: 3 })).rejects.toThrow("network");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("fetchScenarios", () => {
  it("fetches scenarios from API", async () => {
    const scenarios = [{ id: "chibi", title: "赤壁之战" }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ scenarios }));
    const result = await fetchScenarios();
    expect(result).toEqual(scenarios);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/scenarios"),
    );
  });

  it("throws ApiError on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(500, { error: "server error" }),
    );
    await expect(fetchScenarios()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("fetchWorldState", () => {
  it("fetches world state from API", async () => {
    const worldState = { worldlineId: "w1", simulationTime: "t0" };
    mockFetch.mockResolvedValueOnce(jsonResponse({ worldState }));
    const result = await fetchWorldState();
    expect(result).toEqual(worldState);
  });
});

describe("fetchEvents", () => {
  it("fetches events from API", async () => {
    const events = [{ id: "e1" }, { id: "e2" }];
    mockFetch.mockResolvedValueOnce(jsonResponse({ events }));
    const result = await fetchEvents();
    expect(result).toEqual(events);
  });
});

describe("resetSession", () => {
  it("posts scenarioId and returns world state", async () => {
    const worldState = { worldlineId: "w1" };
    mockFetch.mockResolvedValueOnce(jsonResponse({ worldState }));
    const result = await resetSession("chibi");
    expect(result).toEqual(worldState);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/session/reset"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("deduceOnce", () => {
  it("posts deduce request and returns result", async () => {
    const deduceResult = {
      outcome: "applied",
      event: { id: "e1" },
      worldState: {},
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(deduceResult));
    const result = await deduceOnce({
      commandId: "cmd-1",
      rewriteText: "test",
    });
    expect(result).toEqual(deduceResult);
  });

  it("throws ApiError on non-OK response", async () => {
    mockFetch.mockResolvedValueOnce(
      errorResponse(429, { error: "rate limited", retryable: true }),
    );
    await expect(
      deduceOnce({ commandId: "cmd-1", rewriteText: "test" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("newCommandId", () => {
  it("returns a string", () => {
    expect(typeof newCommandId()).toBe("string");
  });

  it("returns unique values", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newCommandId()));
    expect(ids.size).toBe(100);
  });

  it("uses crypto.randomUUID when available", () => {
    const spy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue(
        "test-uuid" as `${string}-${string}-${string}-${string}-${string}`,
      );
    expect(newCommandId()).toBe("test-uuid");
    spy.mockRestore();
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    // @ts-expect-error testing fallback
    delete crypto.randomUUID;
    const id = newCommandId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    crypto.randomUUID = original;
  });
});
