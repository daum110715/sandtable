// @vitest-environment happy-dom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EventLog } from "./EventLog.js";
import type { DeductionEvent } from "../api/types.js";

afterEach(() => {
  cleanup();
});

const makeEvent = (
  id: string,
  overrides?: Partial<DeductionEvent>,
): DeductionEvent => ({
  id,
  simulationTime: "t0",
  recordedAt: "2026-07-13T00:00:00.000Z",
  rewrite: { text: `rewrite-${id}`, submittedAt: "2026-07-13T00:00:00.000Z" },
  narrative: { text: `narrative-${id}` },
  stateChanges: [],
  ...overrides,
});

describe("EventLog", () => {
  it("shows empty state when no events", () => {
    render(<EventLog events={[]} />);
    expect(screen.getByText(/尚无事件/)).toBeInTheDocument();
  });

  it("renders event list with indices", () => {
    const events = [makeEvent("e1"), makeEvent("e2")];
    render(<EventLog events={events} />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders rewrite and narrative text", () => {
    const events = [makeEvent("e1")];
    render(<EventLog events={events} />);
    expect(screen.getAllByText("rewrite-e1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("narrative-e1")).toBeInTheDocument();
  });

  it("renders tags", () => {
    const events = [makeEvent("e1")];
    render(<EventLog events={events} />);
    expect(screen.getByText("改写")).toBeInTheDocument();
    expect(screen.getByText("推演")).toBeInTheDocument();
  });

  it("renders simulation time", () => {
    const events = [makeEvent("e1", { simulationTime: "建安十三年冬" })];
    render(<EventLog events={events} />);
    expect(screen.getByText("建安十三年冬")).toBeInTheDocument();
  });

  it("renders state change count", () => {
    const events = [
      makeEvent("e1", {
        stateChanges: [{ op: "update" } as never, { op: "create" } as never],
      }),
    ];
    render(<EventLog events={events} />);
    expect(screen.getByText("2 变更")).toBeInTheDocument();
  });
});
