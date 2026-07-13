import { describe, expect, it, vi } from "vitest";
import { AgentError } from "./errors.js";
import {
  DeepSeekClient,
  createDeepSeekClientFromEnv,
  normalizeDeepSeekBaseUrl,
} from "./deepseek.js";

describe("DeepSeekClient", () => {
  it("posts chat completions and returns content", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            model: "deepseek-v4-flash",
            choices: [{ message: { content: '{"ok":true}' } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );

    const client = new DeepSeekClient({
      apiKey: "sk-test",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await client.complete({
      messages: [{ role: "user", content: "hi" }],
      json: true,
    });

    expect(result.text).toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(call[0])).toBe(
      "https://api.deepseek.com/v1/chat/completions",
    );
    expect(call[1].headers).toMatchObject({
      Authorization: "Bearer sk-test",
    });
  });

  it("maps abort to timeout", async () => {
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const err = new Error("aborted");
      err.name = "AbortError";
      if (init?.signal?.aborted) throw err;
      throw err;
    });

    const client = new DeepSeekClient({
      apiKey: "sk",
      defaultTimeoutMs: 1,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toBeInstanceOf(AgentError);
  });

  it("throws config error for empty API key", () => {
    expect(() => new DeepSeekClient({ apiKey: "" })).toThrow(AgentError);
    try {
      new DeepSeekClient({ apiKey: "" });
    } catch (e) {
      expect((e as AgentError).code).toBe("config");
    }
  });

  it("maps 401 to rejected", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("unauthorized", { status: 401 }),
    );
    const client = new DeepSeekClient({
      apiKey: "sk-bad",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      client.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ code: "rejected", retryable: false });
  });

  it("maps 429 to network (retryable)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("rate limited", { status: 429 }),
    );
    const client = new DeepSeekClient({
      apiKey: "sk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      client.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ code: "network", retryable: true });
  });

  it("maps 500 to network (retryable)", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("server error", { status: 500 }),
    );
    const client = new DeepSeekClient({
      apiKey: "sk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      client.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ code: "network", retryable: true });
  });

  it("throws invalid_output for empty content", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "" } }] }),
          { status: 200 },
        ),
    );
    const client = new DeepSeekClient({
      apiKey: "sk",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      client.complete({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("uses custom base URL and strips trailing slash", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200 },
        ),
    );
    const client = new DeepSeekClient({
      apiKey: "sk",
      baseUrl: "https://custom.api.com/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.complete({ messages: [{ role: "user", content: "x" }] });
    const url = (fetchImpl.mock.calls[0] as unknown as [string])[0];
    expect(url).toBe("https://custom.api.com/v1/chat/completions");
  });

  it("uses custom model", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" } }] }),
          { status: 200 },
        ),
    );
    const client = new DeepSeekClient({
      apiKey: "sk",
      model: "custom-model",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await client.complete({ messages: [{ role: "user", content: "x" }] });
    const body = JSON.parse(
      (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1]!
        .body as string,
    );
    expect(body.model).toBe("custom-model");
  });
});

describe("createDeepSeekClientFromEnv", () => {
  it("returns undefined when no API key", () => {
    expect(createDeepSeekClientFromEnv({})).toBeUndefined();
  });

  it("returns undefined for empty API key", () => {
    expect(
      createDeepSeekClientFromEnv({ DEEPSEEK_API_KEY: "  " }),
    ).toBeUndefined();
  });

  it("creates client with API key", () => {
    const client = createDeepSeekClientFromEnv({ DEEPSEEK_API_KEY: "sk-test" });
    expect(client).toBeDefined();
    expect(client!.provider).toBe("deepseek");
  });

  it("uses env vars for base URL and model", () => {
    const client = createDeepSeekClientFromEnv({
      DEEPSEEK_API_KEY: "sk",
      DEEPSEEK_BASE_URL: "https://custom.com",
      DEEPSEEK_MODEL: "custom-v1",
    });
    expect(client).toBeDefined();
    expect(client!.model).toBe("custom-v1");
  });
});

describe("normalizeDeepSeekBaseUrl", () => {
  it("appends /v1 for official host without version", () => {
    expect(normalizeDeepSeekBaseUrl("https://api.deepseek.com")).toBe(
      "https://api.deepseek.com/v1",
    );
  });

  it("keeps existing /v1", () => {
    expect(normalizeDeepSeekBaseUrl("https://api.deepseek.com/v1/")).toBe(
      "https://api.deepseek.com/v1",
    );
  });

  it("does not alter custom versioned gateways", () => {
    expect(
      normalizeDeepSeekBaseUrl("https://ark.example.com/api/v3"),
    ).toBe("https://ark.example.com/api/v3");
  });

  it("appends /v1 for OpenAI-compatible proxy hosts like api.b.ai", () => {
    expect(normalizeDeepSeekBaseUrl("https://api.b.ai")).toBe(
      "https://api.b.ai/v1",
    );
  });
});
