import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetSession } from "../api/client.js";
import { loadClientSession, saveClientSession } from "../session.js";

export function HomePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const existing = loadClientSession();

  const enter = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("请先写下世界设定。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const worldState = await resetSession({
        ...(title.trim() ? { title: title.trim() } : {}),
        description: trimmed,
      });
      saveClientSession({
        settingTitle: worldState.setting?.title ?? "未命名世界",
        settingDescription: worldState.setting?.description ?? trimmed,
        enteredAt: new Date().toISOString(),
      });
      navigate("/play");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "无法创建世界");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fork" id="main-content">
      <div className="fork__grid">
        <section className="fork__intro">
          <p className="kicker">入口 · 定义一个世界</p>
          <h1>
            从你的设定
            <br />
            开始推演
          </h1>
          <p className="fork__lede">
            不提供预设场景。定义任意世界、规则和初始关系；演员 Agent
            演绎后果，记录员 Agent
            写回结构化世界状态。事件日志只追加——因果可回溯。
          </p>
          <ul className="fork__axioms" aria-label="产品公理">
            <li>
              <span className="axiom-mark axiom-mark--rewrite">定</span>自由定义
            </li>
            <li>
              <span className="axiom-mark axiom-mark--deduce">推</span>AI
              实时推演
            </li>
            <li>
              <span className="axiom-mark axiom-mark--state">态</span>状态为权威
            </li>
          </ul>
          <p className="fork__note" role="note">
            推演内容是基于设定的假设演绎。1.0 聚焦「自定义 → 推演 → 状态一致」。
          </p>
        </section>

        <div className="fork__board">
          {existing ? (
            <div className="resume">
              <div className="resume__body">
                <span className="kicker">未闭合会话</span>
                <strong>{existing.settingTitle}</strong>
                <p>
                  {existing.settingDescription.slice(0, 72)}
                  {existing.settingDescription.length > 72 ? "…" : ""}
                </p>
              </div>
              <button
                type="button"
                className="btn btn--line"
                onClick={() => navigate("/play")}
              >
                继续推演
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="alert" role="alert">
              {error}
            </div>
          ) : null}

          <header className="board-head">
            <h2>世界设定</h2>
            <span className="mono">++</span>
          </header>

          <section className="plate plate--custom" aria-label="创建自定义世界">
            <div className="plate__index mono" aria-hidden>
              ++
            </div>
            <div className="plate__body">
              <p className="plate__period">完全由你指定</p>
              <h3>建立起点</h3>
              <p className="plate__summary">
                可定义时代、题材、角色、规则、资源、冲突和任意初始条件。
              </p>
              <label className="field">
                <span className="field__label">世界名称（可选）</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="例如：远星殖民地"
                />
              </label>
              <label className="field">
                <span className="field__label">世界设定</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={4000}
                  placeholder="例如：一群探险者在资源有限的陌生星球建立聚落；他们必须决定如何分配水源、知识与权力。"
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn--solid plate__go"
              disabled={loading}
              onClick={() => void enter()}
            >
              {loading ? "创建中…" : "以此开始推演"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
