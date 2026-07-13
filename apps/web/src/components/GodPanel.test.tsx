// @vitest-environment happy-dom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GodPanel } from "./GodPanel.js";
import type { WorldState } from "../api/types.js";

afterEach(() => {
  cleanup();
});

const emptyWorldState: WorldState = {
  worldlineId: "w1",
  simulationTime: "t0",
  persons: {},
  factions: {},
  resources: {},
  locations: {},
  relations: {},
};

const fullWorldState: WorldState = {
  worldlineId: "w1",
  simulationTime: "建安十三年冬",
  persons: {
    p1: { id: "p1", name: "周瑜", role: "都督", status: "在世" },
    p2: { id: "p2", name: "诸葛亮" },
  },
  factions: {
    f1: { id: "f1", name: "孙吴", strength: 50000 },
    f2: { id: "f2", name: "刘备" },
  },
  resources: {
    r1: {
      id: "r1",
      name: "箭矢",
      type: "military",
      quantity: 100000,
      attributes: { direction: "西北风" },
    },
  },
  locations: {
    l1: { id: "l1", name: "赤壁", type: "battlefield" },
  },
  relations: {
    rel1: { id: "rel1", type: "alliance", strength: 80 },
  },
};

describe("GodPanel", () => {
  it("shows loading state when worldState is null", () => {
    render(<GodPanel worldState={null} />);
    expect(screen.getByText(/调取世界状态/)).toBeInTheDocument();
  });

  it("renders simulation time", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText("建安十三年冬")).toBeInTheDocument();
  });

  it("renders section headers", () => {
    render(<GodPanel worldState={emptyWorldState} />);
    expect(screen.getByText("势力")).toBeInTheDocument();
    expect(screen.getByText("人物")).toBeInTheDocument();
    expect(screen.getByText("资源")).toBeInTheDocument();
    expect(screen.getByText("地点")).toBeInTheDocument();
    expect(screen.getByText("关系")).toBeInTheDocument();
  });

  it("renders faction names and strength", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText("孙吴")).toBeInTheDocument();
    expect(screen.getByText("刘备")).toBeInTheDocument();
    expect(screen.getByText("50,000")).toBeInTheDocument();
  });

  it("renders person names and roles", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText("周瑜")).toBeInTheDocument();
    expect(screen.getByText("都督 · 在世")).toBeInTheDocument();
    expect(screen.getByText("诸葛亮")).toBeInTheDocument();
  });

  it("renders resource details", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText(/箭矢/)).toBeInTheDocument();
    expect(screen.getByText(/qty 100000/)).toBeInTheDocument();
    expect(screen.getByText(/西北风/)).toBeInTheDocument();
  });

  it("renders location names", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText("赤壁")).toBeInTheDocument();
  });

  it("renders relation type and strength", () => {
    render(<GodPanel worldState={fullWorldState} />);
    expect(screen.getByText("alliance")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
  });

  it("renders zero counts for empty state", () => {
    render(<GodPanel worldState={emptyWorldState} />);
    const zeros = screen.getAllByText("00");
    expect(zeros.length).toBeGreaterThanOrEqual(5);
  });
});
