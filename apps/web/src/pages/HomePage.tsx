import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScenarios, resetSession } from "../api/client.js";
import type { Scenario } from "../api/types.js";
import { loadClientSession, saveClientSession } from "../session.js";

export function HomePage() {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<readonly Scenario[]>([]);
  const [customText, setCustomText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const existing = loadClientSession();

  useEffect(() => {
    void fetchScenarios()
      .then(setScenarios)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "无法加载场景列表（请先启动 API）"),
      );
  }, []);

  const enter = async (scenarioId: string) => {
    setLoadingId(scenarioId);
    setError(null);
    try {
      await resetSession(scenarioId);
      saveClientSession({
        scenarioId,
        enteredAt: new Date().toISOString(),
        ...(scenarioId === "custom" && customText.trim()
          ? { customBackground: customText.trim() }
          : {}),
      });
      navigate("/play");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "进入场景失败");
    } finally {
      setLoadingId(null);
    }
  };

  const presets = scenarios.filter((s) => s.kind === "preset");
  const custom = scenarios.find((s) => s.kind === "custom");

  return (
    <main className="fork" id="main-content">
      <div className="fork__grid">
        <section className="fork__intro">
          <p className="kicker">入口 · 选择一条起点</p>
          <h1>
            在这里切开
            <br />
            一条世界线
          </h1>
          <p className="fork__lede">
            不是选择题。你用任意颗粒度写下改写；演员 Agent 演绎后果，记录员 Agent
            写回结构化世界状态。事件日志只追加——因果可回溯。
          </p>
          <ul className="fork__axioms" aria-label="产品公理">
            <li>
              <span className="axiom-mark axiom-mark--rewrite">改</span>
              自由改写
            </li>
            <li>
              <span className="axiom-mark axiom-mark--deduce">推</span>
              AI 实时推演
            </li>
            <li>
              <span className="axiom-mark axiom-mark--state">态</span>
              状态为权威
            </li>
          </ul>
          <p className="fork__note" role="note">
            推演内容为假设演绎，不伪装为史实。1.0 聚焦「改写 → 推演 → 状态一致」。
          </p>
        </section>

        <div className="fork__board">
          {existing ? (
            <div className="resume">
              <div className="resume__body">
                <span className="kicker">未闭合会话</span>
                <strong>
                  {existing.scenarioId === "custom" ? "自定义背景" : existing.scenarioId}
                </strong>
                {existing.customBackground ? (
                  <p>{existing.customBackground.slice(0, 72)}
                    {existing.customBackground.length > 72 ? "…" : ""}
                  </p>
                ) : null}
              </div>
              <button type="button" className="btn btn--line" onClick={() => navigate("/play")}>
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
            <h2>场景</h2>
            <span className="mono">
              {scenarios.length > 0 ? String(scenarios.length).padStart(2, "0") : "—"}
            </span>
          </header>

          <ul className="plates">
            {scenarios.length === 0 && !error ? (
              <li className="plates__wait">调取场景…</li>
            ) : null}

            {presets.map((s, index) => (
              <li key={s.id} className="plate">
                <div className="plate__index mono" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="plate__body">
                  <p className="plate__period">{s.period}</p>
                  <h3>{s.title}</h3>
                  <p className="plate__summary">{s.summary}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--solid plate__go"
                  disabled={loadingId !== null}
                  onClick={() => void enter(s.id)}
                >
                  {loadingId === s.id ? "进入中…" : "从此切开"}
                </button>
              </li>
            ))}

            {custom ? (
              <li className="plate plate--custom">
                <div className="plate__index mono" aria-hidden>
                  ++
                </div>
                <div className="plate__body">
                  <p className="plate__period">{custom.period}</p>
                  <h3>{custom.title}</h3>
                  <p className="plate__summary">{custom.summary}</p>
                  <label className="field">
                    <span className="field__label">背景说明</span>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={3}
                      placeholder="例如：以夷陵之战为背景，蜀汉大军东进…"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn--solid plate__go"
                  disabled={loadingId !== null}
                  onClick={() => void enter(custom.id)}
                >
                  {loadingId === custom.id ? "进入中…" : "以自定义背景切开"}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </main>
  );
}
