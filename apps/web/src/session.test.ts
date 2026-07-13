import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearClientSession,
  loadClientSession,
  saveClientSession,
} from "./session.js";

const STORAGE_KEY = "sandtable.session.v1";
const mockStore = new Map<string, string>();
const session = {
  settingTitle: "测试世界",
  settingDescription: "由测试定义的世界",
  enteredAt: "2026-07-13T00:00:00.000Z",
};

beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => mockStore.get(key) ?? null,
    setItem: (key: string, value: string) => mockStore.set(key, value),
    removeItem: (key: string) => mockStore.delete(key),
  });
});

describe("client session", () => {
  it("returns null when storage is empty or invalid", () => {
    expect(loadClientSession()).toBeNull();
    mockStore.set(STORAGE_KEY, "not-json{{{");
    expect(loadClientSession()).toBeNull();
  });

  it("persists the custom world setting", () => {
    saveClientSession(session);
    expect(mockStore.get(STORAGE_KEY)).toBe(JSON.stringify(session));
    expect(loadClientSession()).toEqual(session);
  });

  it("clears the saved session", () => {
    saveClientSession(session);
    clearClientSession();
    expect(loadClientSession()).toBeNull();
  });
});
