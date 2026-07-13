import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  withRetry,
  fetchScenarios,
  fetchWorldState,
  fetchEvents,
  resetSession,
  deduceOnce,
  deduceStreamOnce,
  deduceStream,
  newCommandId,
} from "./client.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  mockFetch.mockReset();
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

/** Build a Response with a ReadableStream body for SSE tests. */
const sseResponse = (blocks: string[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const block of blocks) {
        controller.enqueue(encoder.encode(block));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
};

const deduceResult = {
  outcome: "applied" as const,
  event: {
    id: "e1",
    simulationTime: "t1",
    rewrite: { text: "r", submittedAt: "" },
    narrative: { text: "n" },
    stateChanges: [],
    recordedAt: "",
  },
  worldState: { worldlineId: "w1", simulationTime: "t1" },
};

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

  it("does not set code when body.code is undefined", () => {
    const e = new ApiError(500, { error: "err" });
    expect(e.code).toBeUndefined();
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

  it("defaults to 2 attempts", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new ApiError(503, { error: "slow", retryable: true });
      return "ok";
    });
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
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

describe("deduceStreamOnce", () => {
  it("parses SSE progress and result events", async () => {
    const blocks = [
      'event: progress\ndata: {"phase":"accepted","message":"已接收"}\n\n',
      'event: progress\ndata: {"phase":"deducing","message":"推演中"}\n\n',
      `event: result\ndata: ${JSON.stringify(deduceResult)}\n\n`,
    ];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));

    const onProgress = vi.fn();
    const onResult = vi.fn();
    const result = await deduceStreamOnce(
      { commandId: "cmd-1", rewriteText: "test" },
      { onProgress, onResult },
    );

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith("accepted", "已接收");
    expect(onProgress).toHaveBeenCalledWith("deducing", "推演中");
    expect(onResult).toHaveBeenCalledOnce();
    expect(result).toEqual(deduceResult);
  });

  it("throws ApiError on SSE error event", async () => {
    const blocks = [
      'event: error\ndata: {"error":"rate limited","code":"rate_limited","retryable":true}\n\n',
    ];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));

    const onError = vi.fn();
    await expect(
      deduceStreamOnce(
        { commandId: "cmd-1", rewriteText: "test" },
        { onError },
      ),
    ).rejects.toMatchObject({ code: "rate_limited", status: 429 });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("maps validation_error to 400", async () => {
    const blocks = [
      'event: error\ndata: {"error":"bad input","code":"validation_error","retryable":false}\n\n',
    ];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));
    await expect(
      deduceStreamOnce({ commandId: "cmd-1", rewriteText: "test" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("falls back to deduceOnce when SSE fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    mockFetch.mockResolvedValueOnce(jsonResponse(deduceResult));

    const result = await deduceStreamOnce({
      commandId: "cmd-1",
      rewriteText: "test",
    });
    expect(result).toEqual(deduceResult);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("falls back to deduceOnce when body is null", async () => {
    const res = new Response(null, { status: 200 });
    mockFetch.mockResolvedValueOnce(res);
    mockFetch.mockResolvedValueOnce(jsonResponse(deduceResult));

    const result = await deduceStreamOnce({
      commandId: "cmd-1",
      rewriteText: "test",
    });
    expect(result).toEqual(deduceResult);
  });

  it("throws 502 when SSE ends without result", async () => {
    mockFetch.mockResolvedValueOnce(sseResponse([]));
    await expect(
      deduceStreamOnce({ commandId: "cmd-1", rewriteText: "test" }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("sends correct request headers", async () => {
    const blocks = [`event: result\ndata: ${JSON.stringify(deduceResult)}\n\n`];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));
    await deduceStreamOnce({ commandId: "cmd-1", rewriteText: "test" });
    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[1].headers).toMatchObject({
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    });
    expect(call[1].method).toBe("POST");
  });

  it("parses multi-line data fields", async () => {
    const multiLineData = JSON.stringify({
      ...deduceResult,
      extra: "line1\nline2",
    });
    const blocks = [`event: result\ndata: ${multiLineData}\n\n`];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));
    const result = await deduceStreamOnce({
      commandId: "cmd-1",
      rewriteText: "test",
    });
    expect(result.outcome).toBe("applied");
  });

  it("ignores blocks with no data lines", async () => {
    const blocks = [
      "event: progress\n\n",
      `event: result\ndata: ${JSON.stringify(deduceResult)}\n\n`,
    ];
    mockFetch.mockResolvedValueOnce(sseResponse(blocks));
    const result = await deduceStreamOnce({
      commandId: "cmd-1",
      rewriteText: "test",
    });
    expect(result).toEqual(deduceResult);
  });
});

describe("deduceStream", () => {
  it("wraps deduceStreamOnce with retry on retryable error", async () => {
    let n = 0;
    mockFetch.mockImplementation(async () => {
      n += 1;
      if (n === 1)
        return sseResponse([
          'event: error\ndata: {"error":"slow","code":"network","retryable":true}\n\n',
        ]);
      return sseResponse([
        `event: result\ndata: ${JSON.stringify(deduceResult)}\n\n`,
      ]);
    });

    const onProgress = vi.fn();
    const result = await deduceStream(
      { commandId: "cmd-1", rewriteText: "test" },
      { onProgress },
    );
    expect(result).toEqual(deduceResult);
    expect(onProgress).toHaveBeenCalledWith(
      "deducing",
      expect.stringContaining("自动重试"),
    );
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
