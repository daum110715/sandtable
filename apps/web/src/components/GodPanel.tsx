import type { WorldState } from "../api/types.js";

const entries = <T,>(rec: Record<string, T>): Array<[string, T]> => Object.entries(rec);

export function GodPanel({ worldState }: { worldState: WorldState | null }) {
  if (!worldState) {
    return (
      <aside className="god-panel" aria-label="上帝面板">
        <h2>上帝面板</h2>
        <p className="muted">加载世界状态…</p>
      </aside>
    );
  }

  return (
    <aside className="god-panel" aria-label="上帝面板">
      <header className="panel-header">
        <h2>上帝面板</h2>
        <p className="eyebrow">只读 · 推演状态</p>
      </header>
      <p className="sim-time">
        模拟时刻 <strong>{worldState.simulationTime}</strong>
      </p>

      <section>
        <h3>势力</h3>
        <ul>
          {entries(worldState.factions).map(([id, f]) => (
            <li key={id}>
              <strong>{f.name}</strong>
              {f.strength !== undefined ? ` · 兵力 ${f.strength}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>人物</h3>
        <ul>
          {entries(worldState.persons).map(([id, p]) => (
            <li key={id}>
              <strong>{p.name}</strong>
              {p.role ? ` · ${p.role}` : ""}
              {p.status ? ` · ${p.status}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>资源</h3>
        <ul>
          {entries(worldState.resources).map(([id, r]) => (
            <li key={id}>
              <strong>{r.name}</strong> · {r.type} · qty {r.quantity}
              {r.attributes?.direction !== undefined
                ? ` · 向 ${String(r.attributes.direction)}`
                : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>地点</h3>
        <ul>
          {entries(worldState.locations).map(([id, l]) => (
            <li key={id}>
              {l.name}
              {l.type ? ` · ${l.type}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>关系</h3>
        <ul>
          {entries(worldState.relations).map(([id, r]) => (
            <li key={id}>
              {r.type}
              {r.strength !== undefined ? ` · ${r.strength}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
