
import { NavLink } from "react-router";

function Header() {
  return (
    <header className="header">
      <div className="header-content">
        {/* Logo links to the Home page */}
        <NavLink
          to="/"
          className="logo"
        >
          Gym Tracker
        </NavLink>

        {/* Main application navigation */}
        <nav
          className="navigation"
          aria-label="Main navigation"
          style={{
            flexWrap: "wrap",
            justifyContent: "center",
            rowGap: "12px",
          }}
        >
          <NavLink to="/dashboard">
            Dashboard
          </NavLink>

          <NavLink to="/workouts">
            Workouts
          </NavLink>

          <NavLink to="/exercises">
            Exercises
          </NavLink>

          <NavLink to="/progress">
            Progress
          </NavLink>

          <NavLink to="/settings">
            Settings
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;
