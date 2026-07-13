import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  loadClientSession,
  saveClientSession,
  clearClientSession,
} from "./session.js";

const STORAGE_KEY = "sandtable.session.v1";

const mockStore = new Map<string, string>();

beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStore.set(key, value),
    removeItem: (key: string) => mockStore.delete(key),
  });
});

describe("loadClientSession", () => {
  it("returns null when localStorage is empty", () => {
    expect(loadClientSession()).toBeNull();
  });

  it("returns parsed session when present", () => {
    const session = {
      scenarioId: "chibi",
      enteredAt: "2026-07-13T00:00:00.000Z",
    };
    mockStore.set(STORAGE_KEY, JSON.stringify(session));
    expect(loadClientSession()).toEqual(session);
  });

  it("returns null on invalid JSON", () => {
    mockStore.set(STORAGE_KEY, "not-json{{{");
    expect(loadClientSession()).toBeNull();
  });
});

describe("saveClientSession", () => {
  it("writes JSON to localStorage", () => {
    const session = {
      scenarioId: "chibi",
      enteredAt: "2026-07-13T00:00:00.000Z",
    };
    saveClientSession(session);
    expect(mockStore.get(STORAGE_KEY)).toBe(JSON.stringify(session));
  });

  it("includes optional customBackground", () => {
    const session = {
      scenarioId: "custom",
      customBackground: "三国时期",
      enteredAt: "2026-07-13T00:00:00.000Z",
    };
    saveClientSession(session);
    const loaded = loadClientSession();
    expect(loaded?.customBackground).toBe("三国时期");
  });
});

describe("clearClientSession", () => {
  it("removes session from localStorage", () => {
    const session = {
      scenarioId: "chibi",
      enteredAt: "2026-07-13T00:00:00.000Z",
    };
    saveClientSession(session);
    clearClientSession();
    expect(loadClientSession()).toBeNull();
  });
});
