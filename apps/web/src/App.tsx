import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { HomePage } from "./pages/HomePage.js";
import { PlayPage } from "./pages/PlayPage.js";

export const navigationSections = [
  { path: "/", label: "分岔口", title: "定义世界" },
  { path: "/play", label: "推演台", title: "改写与推演" },
] as const;

export function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPlay = pathname.startsWith("/play");

  return (
    <div className={`shell${isPlay ? " shell--stage" : ""}`}>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <header className="mast">
        <NavLink to="/" end className="mast__brand">
          <span className="mast__sigil" aria-hidden>
            岔
          </span>
          <span className="mast__word">
            <strong>分岔</strong>
            <em>世界线推演</em>
          </span>
        </NavLink>

        <nav className="mast__nav" aria-label="主导航">
          {navigationSections.map((s) => (
            <NavLink
              key={s.path}
              to={s.path}
              end={s.path === "/"}
              className="mast__link"
            >
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="mast__trail">
          <span className="mast__badge" title="假设推演">
            假设演绎
          </span>
          <button
            type="button"
            className={isPlay ? "btn btn--ghost" : "btn btn--solid"}
            onClick={() => navigate(isPlay ? "/" : "/play")}
          >
            {isPlay ? "换世界" : "进入推演"}
          </button>
        </div>
      </header>

      <div className="shell__body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayPage />} />
        </Routes>
      </div>

      <nav className="dock" aria-label="移动端导航">
        {navigationSections.map((s) => (
          <NavLink
            key={s.path}
            to={s.path}
            end={s.path === "/"}
            className="dock__item"
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
