import type { DeductionEvent } from "../api/types.js";

export function EventLog({ events }: { events: readonly DeductionEvent[] }) {
  return (
    <div className="elog">
      <header className="elog__head">
        <p className="kicker">只追加 · 按序回溯</p>
        <h2>事件日志</h2>
      </header>

      {events.length === 0 ? (
        <p className="elog__empty">
          尚无事件。提交改写后，改写与推演结果将按序归档于此。
        </p>
      ) : (
        <ol className="elog__list">
          {events.map((ev, i) => (
            <li key={ev.id} className="elog__item">
              <div className="elog__idx mono" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="elog__body">
                <div className="elog__meta mono">
                  <time>{ev.simulationTime}</time>
                  <span>{ev.stateChanges.length} 变更</span>
                </div>
                <div className="elog__block">
                  <span className="tag tag--rewrite">改写</span>
                  <p>{ev.rewrite.text}</p>
                </div>
                <div className="elog__block elog__block--nar">
                  <span className="tag tag--deduce">推演</span>
                  <p>{ev.narrative.text}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
