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
  const [loading, setLoading] = useState(false);
  const existing = loadClientSession();

  useEffect(() => {
    void fetchScenarios()
      .then(setScenarios)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "无法加载场景列表（请启动 API）"),
      );
  }, []);

  const enter = async (scenarioId: string) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <main className="page home-page" id="main-content">
      <p className="eyebrow">历史模拟推演 AI</p>
      <h1>选择场景</h1>
      <p className="lede">
        从预设经典事件进入，或填写自定义背景。随后在对话中自由改写历史，AI
        根据世界状态推演——不是选择题。
      </p>
      <p className="banner-sim" role="note">
        推演内容为假设演绎，不伪装为史实。
      </p>

      {existing ? (
        <p className="resume-hint">
          检测到本机会话元数据（{existing.scenarioId}）。服务端状态以 API 为准；可
          <button type="button" className="linkish" onClick={() => navigate("/play")}>
            直接进入推演
          </button>
          ，或下方重新开始。
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <ul className="scenario-list">
        {scenarios.map((s) => (
          <li key={s.id} className="scenario-card">
            <h2>{s.title}</h2>
            <p className="period">{s.period}</p>
            <p>{s.summary}</p>
            {s.kind === "custom" ? (
              <label className="custom-label">
                自定义背景说明
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={3}
                  placeholder="例如：以夷陵之战为背景，刘备东征…"
                />
              </label>
            ) : null}
            <button
              type="button"
              className="primary"
              disabled={loading}
              onClick={() => void enter(s.id)}
            >
              {loading ? "进入中…" : "进入推演"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
