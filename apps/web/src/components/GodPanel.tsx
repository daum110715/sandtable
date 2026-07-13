import type { ReactNode } from "react";
import type { WorldState } from "../api/types.js";

const entries = <T,>(rec: Record<string, T>): Array<[string, T]> => Object.entries(rec);

function Block({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="ledger">
      <header className="ledger__head">
        <h3>{title}</h3>
        <span className="mono">{String(count).padStart(2, "0")}</span>
      </header>
      {children}
    </section>
  );
}

function meter(n: number | undefined, max = 250000): number {
  if (n === undefined) return 0;
  return Math.max(4, Math.min(100, Math.round((n / max) * 100)));
}

export function GodPanel({ worldState }: { worldState: WorldState | null }) {
  if (!worldState) {
    return (
      <div className="god">
        <p className="god__wait">调取世界状态…</p>
      </div>
    );
  }

  const factions = entries(worldState.factions);
  const persons = entries(worldState.persons);
  const resources = entries(worldState.resources);
  const locations = entries(worldState.locations);
  const relations = entries(worldState.relations);

  return (
    <div className="god">
      <header className="god__head">
        <p className="kicker">只读投影 · 权威快照</p>
        <h2>世界状态</h2>
        <dl className="god__clock">
          <dt>模拟时刻</dt>
          <dd className="mono">{worldState.simulationTime}</dd>
        </dl>
      </header>

      <Block title="势力" count={factions.length}>
        <ul className="rows">
          {factions.map(([id, f]) => (
            <li key={id} className="row">
              <span className="row__name">{f.name}</span>
              <span className="row__val mono">
                {f.strength !== undefined ? f.strength.toLocaleString("zh-CN") : "—"}
              </span>
              {f.strength !== undefined ? (
                <span className="meter" aria-hidden>
                  <i style={{ width: `${meter(f.strength)}%` }} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="人物" count={persons.length}>
        <ul className="rows">
          {persons.map(([id, p]) => (
            <li key={id} className="row row--stack">
              <span className="row__name">{p.name}</span>
              <span className="row__sub">{[p.role, p.status].filter(Boolean).join(" · ") || "—"}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="资源" count={resources.length}>
        <ul className="rows">
          {resources.map(([id, r]) => (
            <li key={id} className="row row--stack">
              <span className="row__name">
                {r.name}
                <em className="mono">{r.type}</em>
              </span>
              <span className="row__sub mono">
                qty {r.quantity}
                {r.attributes?.direction !== undefined
                  ? ` · ${String(r.attributes.direction)}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="地点" count={locations.length}>
        <div className="loci">
          {locations.map(([id, l]) => (
            <span key={id} className="locus">
              {l.name}
            </span>
          ))}
        </div>
      </Block>

      <Block title="关系" count={relations.length}>
        <ul className="rows">
          {relations.map(([id, r]) => (
            <li key={id} className="row">
              <span className="row__name">{r.type}</span>
              {r.strength !== undefined ? (
                <span className="row__val mono">{r.strength}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>
    </div>
  );
}
