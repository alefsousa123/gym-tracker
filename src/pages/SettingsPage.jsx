
import { Link } from "react-router";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useTheme,
} from "../context/ThemeContext";

import "./SettingsPage.css";

// ==========================================
// SETTINGS PAGE
// ==========================================

function SettingsPage() {
  const { profile } = useTrainingProfile();

  const { homeEquipment } = useEquipment();

  const {
    theme,
    changeTheme,
  } = useTheme();

  const hasProfile = Boolean(profile);

  const equipmentCount =
    homeEquipment.length;

  const equipmentStatus =
    equipmentCount === 0
      ? "Bodyweight Only"
      : `${equipmentCount} equipment item${
          equipmentCount === 1 ? "" : "s"
        } selected`;

  return (
    <div className="settings-page">

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <header className="settings-page-heading">
        <span className="settings-eyebrow">
          PERSONALIZATION
        </span>

        <h1>Settings</h1>

        <p>
          Manage your training profile,
          equipment, and application
          preferences.
        </p>
      </header>

      {/* ==================================
          TRAINING SETTINGS
      ================================== */}

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Training Settings</h2>

          <p>
            Customize your training
            experience.
          </p>
        </div>

        <div className="settings-card-grid">

          {/* Training Profile */}

          <Link
            to="/settings/profile"
            className="settings-card"
          >
            <div className="settings-card-icon">
              <span aria-hidden="true">
                ◎
              </span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>Training Profile</h3>

                <span
                  className={
                    `settings-status ${
                      hasProfile
                        ? "is-configured"
                        : ""
                    }`
                  }
                >
                  {hasProfile
                    ? "Configured"
                    : "Not Configured"}
                </span>
              </div>

              <p>
                Manage your goals,
                experience level,
                training location,
                weekly frequency,
                and preferred units.
              </p>

              <span className="settings-card-action">
                {hasProfile
                  ? "Edit Training Profile"
                  : "Set Up Training Profile"}
                {" →"}
              </span>
            </div>
          </Link>

          {/* Equipment */}

          <Link
            to="/settings/equipment"
            className="settings-card"
          >
            <div className="settings-card-icon">
              <span aria-hidden="true">
                ◈
              </span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>My Equipment</h3>

                <span className="settings-status is-configured">
                  {equipmentStatus}
                </span>
              </div>

              <p>
                Manage your available
                equipment and find exercises
                that match your training
                setup.
              </p>

              <span className="settings-card-action">
                Manage Equipment →
              </span>
            </div>
          </Link>

        </div>
      </section>

      {/* ==================================
          APPLICATION SETTINGS
      ================================== */}

      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Application Settings</h2>

          <p>
            Choose how Gym Tracker
            looks and feels.
          </p>
        </div>

        <div className="settings-card-grid">

          {/* Appearance */}

          <div className="settings-card settings-appearance-card">
            <div className="settings-card-icon">
              <span aria-hidden="true">
                ◐
              </span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>Appearance</h3>

                <span className="settings-status is-configured">
                  {theme === "light"
                    ? "Light"
                    : "Dark"}
                </span>
              </div>

              <p>
                Choose your preferred
                color theme. Your selection
                is saved automatically
                in this browser.
              </p>

              <div
                className="settings-theme-options"
                role="group"
                aria-label="Color theme"
              >

                {/* Light Theme */}

                <button
                  type="button"
                  className={
                    `settings-theme-option ${
                      theme === "light"
                        ? "is-selected"
                        : ""
                    }`
                  }
                  aria-pressed={
                    theme === "light"
                  }
                  onClick={() =>
                    changeTheme("light")
                  }
                >
                  <span
                    className="settings-theme-icon"
                    aria-hidden="true"
                  >
                    ☀
                  </span>

                  <span className="settings-theme-name">
                    Light Theme
                  </span>

                  <span className="settings-theme-indicator">
                    {theme === "light"
                      ? "✓"
                      : ""}
                  </span>
                </button>

                {/* Dark Theme */}

                <button
                  type="button"
                  className={
                    `settings-theme-option ${
                      theme === "dark"
                        ? "is-selected"
                        : ""
                    }`
                  }
                  aria-pressed={
                    theme === "dark"
                  }
                  onClick={() =>
                    changeTheme("dark")
                  }
                >
                  <span
                    className="settings-theme-icon"
                    aria-hidden="true"
                  >
                    ☾
                  </span>

                  <span className="settings-theme-name">
                    Dark Theme
                  </span>

                  <span className="settings-theme-indicator">
                    {theme === "dark"
                      ? "✓"
                      : ""}
                  </span>
                </button>

              </div>

              <small className="settings-appearance-note">
                We are updating the visual
                design gradually. The theme
                currently applies to the
                navigation, footer, and
                Settings page. Other pages
                retain their existing dark
                styling during the redesign.
              </small>
            </div>
          </div>

          {/* Future Account Settings */}

          <div className="settings-card is-planned">
            <div className="settings-card-icon">
              <span aria-hidden="true">
                ♙
              </span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>Account & Security</h3>

                <span className="settings-status">
                  Planned
                </span>
              </div>

              <p>
                Account management and
                security features will
                become available after
                authentication is added.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================
          STORAGE INFORMATION
      ================================== */}

      <div className="settings-storage-note">
        <strong>
          Local Storage
        </strong>

        <p>
          Your training settings,
          equipment choices, workout
          history, and theme preference
          are stored locally in this
          browser.
        </p>

        <p>
          Cloud synchronization and
          account-based storage will
          be developed in a later stage.
        </p>
      </div>

    </div>
  );
}

export default SettingsPage;
