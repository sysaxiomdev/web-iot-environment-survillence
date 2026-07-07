import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/swagger", label: "Swagger" },
  { to: "/devices", label: "Devices" },
  { to: "/readings", label: "Readings" },
  { to: "/simulator", label: "Simulator" },
  { to: "/alerts", label: "Alerts" },
  { to: "/settings", label: "Settings" },
];

function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [isNavOpen, setIsNavOpen] = useState(false);

  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {isNavOpen ? (
        <button
          type="button"
          className="app-shell__overlay"
          aria-label="Close navigation"
          onClick={() => setIsNavOpen(false)}
        />
      ) : null}

      <aside
        id="admin-sidebar"
        className={isNavOpen ? "app-shell__sidebar app-shell__sidebar--open" : "app-shell__sidebar"}
      >
        <div className="app-shell__sidebar-top">
          <div>
            <p className="eyebrow">IoT Environmental</p>
            <h1>Surveillance Console</h1>
            <p className="sidebar-copy">
              Live device health, readings, and alerts in one operational panel.
            </p>
          </div>
          <button
            type="button"
            className="nav-toggle nav-toggle--inside"
            onClick={() => setIsNavOpen(false)}
          >
            Close
          </button>
        </div>
        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
              }
              onClick={() => setIsNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="app-shell__main">
        <header className="app-shell__topbar">
          <div className="app-shell__topbar-brand">
            <button
              type="button"
              className="nav-toggle"
              onClick={() => setIsNavOpen((current) => !current)}
              aria-expanded={isNavOpen}
              aria-controls="admin-sidebar"
            >
              {isNavOpen ? "Close" : "Menu"}
            </button>
            <div>
              <p className="eyebrow">IoT Environmental</p>
              <strong className="mobile-title">Surveillance Console</strong>
            </div>
          </div>
          <div className="app-shell__topbar-actions">
            <button type="button" className="ghost-button app-shell__logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <div className="app-shell__content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
