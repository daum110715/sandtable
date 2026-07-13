import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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

export function PlayPage() {
  const session = loadClientSession();
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [events, setEvents] = useState<readonly DeductionEvent[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 网络重试用同一 commandId，避免重复事件 */
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
      restored.push({ kind: "narrative", text: e.narrative.text, outcome: "applied" });
    }
    setChat(restored);
  }, []);

  useEffect(() => {
    void hydrate().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : "无法恢复会话"),
    );
  }, [hydrate]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat, progress]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const commandId = pendingCommandId.current ?? newCommandId();
    pendingCommandId.current = commandId;
    setBusy(true);
    setError(null);
    setProgress("提交中…");
    setChat((c) => [...c, { kind: "rewrite", text, commandId }]);
    setInput("");

    try {
      const result = await deduceStream(
        { commandId, rewriteText: text },
        {
          onProgress: (_phase, message) => setProgress(message),
        },
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
          { kind: "system", text: "重复提交：已返回既有事件，未再次推进世界。" },
        ]);
      }
      pendingCommandId.current = null;
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? `${err.message}${err.retryable ? "（可重试，将使用同一命令 id）" : ""}`
          : err instanceof Error
            ? err.message
            : "推演失败";
      setError(msg);
      setChat((c) => [...c, { kind: "system", text: msg }]);
      // 保留 pendingCommandId 以便重试幂等
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div className="play-layout">
      <div className="play-main">
        <header className="play-header">
          <div>
            <p className="eyebrow">
              {session?.scenarioId === "custom" ? "自定义背景" : "赤壁之战"}
            </p>
            <h1 className="play-title">改写与推演</h1>
            {session?.customBackground ? (
              <p className="muted custom-bg">背景：{session.customBackground}</p>
            ) : null}
          </div>
          <div className="play-actions">
            <Link to="/">换场景</Link>
            <button type="button" className="linkish" onClick={() => void hydrate()}>
              刷新状态
            </button>
          </div>
        </header>

        <p className="banner-sim" role="note">
          以下为 AI 推演，不伪装为史实。
        </p>

        <div className="chat-log" ref={listRef} aria-live="polite">
          {chat.length === 0 ? (
            <p className="muted">试着输入：那天江上刮西北风</p>
          ) : null}
          {chat.map((item, i) => (
            <div key={i} className={`chat-bubble ${item.kind}`}>
              {item.kind === "rewrite" ? (
                <>
                  <span className="tag">你的改写</span>
                  <p>{item.text}</p>
                </>
              ) : null}
              {item.kind === "narrative" ? (
                <>
                  <span className="tag sim">推演叙事</span>
                  <p>{item.text}</p>
                  {item.outcome === "duplicate" ? (
                    <p className="muted">（幂等：duplicate）</p>
                  ) : null}
                </>
              ) : null}
              {item.kind === "system" ? <p className="muted">{item.text}</p> : null}
            </div>
          ))}
          {progress ? <p className="progress">{progress}</p> : null}
        </div>

        {error ? <p className="error">{error}</p> : null}

        <form className="composer" onSubmit={(e) => void submit(e)}>
          <label className="sr-only" htmlFor="rewrite-input">
            改写内容
          </label>
          <textarea
            id="rewrite-input"
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            placeholder="自由输入任意颗粒度的改写…"
            rows={2}
            disabled={busy}
          />
          <button type="submit" className="primary" disabled={busy || !input.trim()}>
            {busy ? "推演中…" : "提交改写"}
          </button>
        </form>

        <EventLog events={events} />
      </div>

      <GodPanel worldState={worldState} />
    </div>
  );
}
