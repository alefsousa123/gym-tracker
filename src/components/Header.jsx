
import { NavLink } from "react-router";

import BrandMark from "./BrandMark";

import {
  APP_NAME,
} from "../config/brand";

function Header() {
  return (
    <header className="header">
      <div className="header-content">

        {/* Application brand */}

        <NavLink
          to="/dashboard"
          className="logo"
          aria-label={`${APP_NAME} home`}
        >
          <BrandMark />

          <span className="brand-name">
            {APP_NAME}
          </span>
        </NavLink>

        {/* Main navigation */}

        <nav
          className="navigation"
          aria-label="Main navigation"
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
