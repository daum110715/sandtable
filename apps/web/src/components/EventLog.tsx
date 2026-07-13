import type { DeductionEvent } from "../api/types.js";

export function EventLog({ events }: { events: readonly DeductionEvent[] }) {
  return (
    <section className="event-log" aria-label="事件日志">
      <h2>事件日志</h2>
      <p className="muted">按追加顺序回溯改写与推演（不可原地修改）</p>
      {events.length === 0 ? (
        <p className="muted">尚无事件。输入一条改写开始推演。</p>
      ) : (
        <ol className="event-list">
          {events.map((ev, i) => (
            <li key={ev.id}>
              <div className="event-meta">
                #{i + 1} · {ev.simulationTime}
                {ev.commandId ? ` · ${ev.commandId.slice(0, 8)}…` : ""}
              </div>
              <div className="event-rewrite">
                <span className="tag">改写</span> {ev.rewrite.text}
              </div>
              <div className="event-narrative">
                <span className="tag sim">推演</span> {ev.narrative.text}
              </div>
              <div className="event-changes muted">
                状态变更 {ev.stateChanges.length} 项
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
