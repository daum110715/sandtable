import { NavLink, Route, Routes } from "react-router-dom";

export const navigationSections = [
  { path: "/", label: "世界", title: "赤壁 · 建安十三年" },
  { path: "/actions", label: "行动", title: "行动意图" },
  { path: "/timeline", label: "时间线", title: "世界线事件" },
  { path: "/archive", label: "档案", title: "历史档案" }
] as const;

function Placeholder({ title }: { title: string }) {
  return (
    <main className="page" id="main-content">
      <p className="eyebrow">技术原型</p>
      <h1>{title}</h1>
      <p className="lede">
        框架已经就位。这里将承载移动端优先的历史沙盒体验，业务内容将在领域协议冻结后逐步接入。
      </p>
      <section className="status-card" aria-labelledby="framework-status">
        <h2 id="framework-status">框架状态</h2>
        <dl>
          <div><dt>前端</dt><dd>React PWA</dd></div>
          <div><dt>交互</dt><dd>触控优先</dd></div>
          <div><dt>世界</dt><dd>服务端权威</dd></div>
        </dl>
      </section>
    </main>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <Routes>
        {navigationSections.map((section) => (
          <Route key={section.path} path={section.path} element={<Placeholder title={section.title} />} />
        ))}
      </Routes>
      <nav className="bottom-nav" aria-label="主要导航">
        {navigationSections.map((section) => (
          <NavLink key={section.path} to={section.path} end={section.path === "/"}>
            {section.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
