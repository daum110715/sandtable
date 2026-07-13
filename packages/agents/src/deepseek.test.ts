import { describe, expect, it, vi } from "vitest";
import { AgentError } from "./errors.js";
import { DeepSeekClient } from "./deepseek.js";

describe("DeepSeekClient", () => {
  it("posts chat completions and returns content", async () => {
    const fetchImpl = vi.fn(async () =>
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
    expect(String(call[0])).toContain("/chat/completions");
    expect(call[1].headers).toMatchObject({
      Authorization: "Bearer sk-test",
    });
  });

  it("maps abort to timeout", async () => {
    const fetchImpl = vi.fn(async (_u: unknown, init?: RequestInit) => {
      const err = new Error("aborted");
      err.name = "AbortError";
      // honor abort if already aborted
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
});
