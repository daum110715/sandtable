import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { PlayPage } from "./pages/PlayPage.js";

export const navigationSections = [
  { path: "/", label: "场景", title: "选择场景" },
  { path: "/play", label: "推演", title: "改写与推演" },
] as const;

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play" element={<PlayPage />} />
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
