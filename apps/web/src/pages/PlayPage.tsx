import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  deduceStream,
  fetchEvents,
  fetchWorldState,
  newCommandId,
} from "../api/client.js";
import type { DeductionEvent, WorldState } from "../api/types.js";
import { EventLog } from "../components/EventLog.js";
import { GodPanel } from "../components/GodPanel.js";
import { loadClientSession } from "../session.js";

type ChatItem =
  | { kind: "rewrite"; text: string; commandId: string }
  | { kind: "narrative"; text: string; outcome?: string }
  | { kind: "system"; text: string };

type SideTab = "world" | "events";

const SUGGESTIONS = [
  "引入一个会改变资源分配的新发现",
  "让两个原本对立的团体开始合作",
  "设定中的关键规则出现意外例外",
] as const;

export function PlayPage() {
  const session = loadClientSession();
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [events, setEvents] = useState<readonly DeductionEvent[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>("world");
  const pendingCommandId = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const hydrate = useCallback(async () => {
    const [ws, ev] = await Promise.all([fetchWorldState(), fetchEvents()]);
    setWorldState(ws);
    setEvents(ev);
    const restored: ChatItem[] = [];
    for (const e of ev) {
      restored.push({
        kind: "rewrite",
        text: e.rewrite.text,
        commandId: e.commandId ?? e.id,
      });
      restored.push({
        kind: "narrative",
        text: e.narrative.text,
        outcome: "applied",
      });
    }
    setChat(restored);
  }, []);

  useEffect(() => {
    void hydrate().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "无法恢复会话"),
    );
  }, [hydrate]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat, progress]);

  const runSubmit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (text.length > 4000) {
      setError("改写过长（最多 4000 字）");
      return;
    }

    const commandId = pendingCommandId.current ?? newCommandId();
    pendingCommandId.current = commandId;
    setBusy(true);
    setError(null);
    setProgress("接收改写");
    setChat((c) => [...c, { kind: "rewrite", text, commandId }]);
    setInput("");

    try {
      const result = await deduceStream(
        { commandId, rewriteText: text },
        { onProgress: (_p, message) => setProgress(message) },
      );
      setWorldState(result.worldState);
      setEvents((prev) => {
        if (prev.some((x) => x.id === result.event.id)) return prev;
        return [...prev, result.event];
      });
      setChat((c) => [
        ...c,
        {
          kind: "narrative",
          text: result.event.narrative.text,
          outcome: result.outcome,
        },
      ]);
      if (result.outcome === "duplicate") {
        setChat((c) => [
          ...c,
          {
            kind: "system",
            text: "重复提交：已返回既有事件，未再次推进世界。",
          },
        ]);
      }
      pendingCommandId.current = null;
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? `${err.message}${err.retryable ? "（可重试）" : ""}`
          : err instanceof Error
            ? err.message
            : "推演失败";
      setError(msg);
      setChat((c) => [...c, { kind: "system", text: msg }]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSubmit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void runSubmit();
    }
  };

  const scenarioLabel =
    worldState?.setting.title ?? session?.settingTitle ?? "未命名世界";

  const renderThread = (): ReactNode[] => {
    const nodes: ReactNode[] = [];
    let pair = 0;
    for (let i = 0; i < chat.length; i++) {
      const item = chat[i]!;
      if (item.kind === "system") {
        nodes.push(
          <div key={`sys-${i}`} className="sys" role="status">
            {item.text}
          </div>,
        );
        continue;
      }
      if (item.kind === "rewrite") {
        const next = chat[i + 1];
        const narrative = next?.kind === "narrative" ? next : null;
        pair += 1;
        const n = String(pair).padStart(2, "0");
        nodes.push(
          <article key={`pair-${i}`} className="pair">
            <div className="pair__rail mono" aria-hidden>
              {n}
            </div>
            <div className="pair__stack">
              <div className="cut">
                <span className="tag tag--rewrite">改写</span>
                <p>{item.text}</p>
              </div>
              {narrative ? (
                <div className="fallout">
                  <div className="fallout__head">
                    <span className="tag tag--deduce">推演</span>
                    {narrative.outcome === "duplicate" ? (
                      <span className="tag tag--mute">幂等返回</span>
                    ) : null}
                  </div>
                  <p>{narrative.text}</p>
                </div>
              ) : null}
            </div>
          </article>,
        );
        if (narrative) i += 1;
        continue;
      }
      if (item.kind === "narrative") {
        pair += 1;
        nodes.push(
          <article key={`nar-${i}`} className="pair">
            <div className="pair__rail mono" aria-hidden>
              {String(pair).padStart(2, "0")}
            </div>
            <div className="pair__stack">
              <div className="fallout">
                <div className="fallout__head">
                  <span className="tag tag--deduce">推演</span>
                  {item.outcome === "duplicate" ? (
                    <span className="tag tag--mute">幂等返回</span>
                  ) : null}
                </div>
                <p>{item.text}</p>
              </div>
            </div>
          </article>,
        );
      }
    }
    return nodes;
  };

  return (
    <div className="stage" id="main-content">
      <section className="stage__main" aria-label="改写与推演">
        <header className="stage__bar">
          <div className="stage__meta">
            <span className="chip chip--hot">{scenarioLabel}</span>
            {worldState ? (
              <span className="chip chip--mono" title="模拟时刻">
                {worldState.simulationTime}
              </span>
            ) : null}
            <span className="chip">假设推演</span>
          </div>
          <div className="stage__actions">
            <Link className="btn btn--ghost btn--sm" to="/">
              分岔口
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void hydrate()}
              disabled={busy}
            >
              同步
            </button>
          </div>
        </header>

        {worldState?.setting.description ? (
          <p className="stage__bg">{worldState.setting.description}</p>
        ) : null}

        <div className="thread" ref={listRef} aria-live="polite">
          {chat.length === 0 ? (
            <div className="thread__empty">
              <p className="kicker">卷首空白</p>
              <h2>写下第一笔改写</h2>
              <p>
                任意颗粒度均可——一句风向、一条盟约、一次退兵。
                <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd>{" "}
                提交后，推演写入事件日志与世界状态。
              </p>
              <div className="seeds">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="seed"
                    onClick={() => setInput(s)}
                  >
                    <span className="seed__mark" aria-hidden>
                      改
                    </span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {renderThread()}

          {progress ? (
            <div className="phase" role="status">
              <span className="phase__dot" aria-hidden />
              <span>{progress}</span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="alert alert--inline" role="alert">
            {error}
          </div>
        ) : null}

        <form className="write" onSubmit={onSubmit}>
          <div className="write__frame">
            <label className="sr-only" htmlFor="rewrite-input">
              改写内容
            </label>
            <div className="write__edge" aria-hidden>
              改
            </div>
            <textarea
              id="rewrite-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="在此推动世界变化…"
              rows={3}
              disabled={busy}
            />
            <div className="write__bar">
              <span className="write__hint mono">
                {input.length > 0 ? `${input.length}/4000` : "Ctrl / ⌘ + Enter"}
              </span>
              <button
                type="submit"
                className="btn btn--solid btn--sm"
                disabled={busy || !input.trim()}
              >
                {busy ? "推演中…" : "提交推演"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="stage__side" aria-label="世界状态与事件">
        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={sideTab === "world" ? "tabs__btn is-on" : "tabs__btn"}
            aria-selected={sideTab === "world"}
            onClick={() => setSideTab("world")}
          >
            世界状态
          </button>
          <button
            type="button"
            role="tab"
            className={sideTab === "events" ? "tabs__btn is-on" : "tabs__btn"}
            aria-selected={sideTab === "events"}
            onClick={() => setSideTab("events")}
          >
            事件日志
            {events.length > 0 ? (
              <span className="tabs__n mono">{events.length}</span>
            ) : null}
          </button>
        </div>
        <div className="stage__panel">
          {sideTab === "world" ? (
            <GodPanel worldState={worldState} />
          ) : (
            <EventLog events={events} />
          )}
        </div>
      </aside>
    </div>
  );
}
