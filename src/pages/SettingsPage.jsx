
import { Link } from "react-router";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useEquipment,
} from "../context/EquipmentContext";

import "./SettingsPage.css";

function SettingsPage() {
  const { profile } = useTrainingProfile();

  const { homeEquipment } = useEquipment();

  const hasProfile = Boolean(profile);

  const equipmentCount = homeEquipment.length;

  const equipmentStatus =
    equipmentCount === 0
      ? "Bodyweight Only"
      : `${equipmentCount} equipment item${
          equipmentCount === 1 ? "" : "s"
        } selected`;

  return (
    <div className="settings-page">
      {/* Page heading */}
      <header className="settings-page-heading">
        <span className="settings-eyebrow">
          PERSONALIZATION
        </span>

        <h1>Settings</h1>

        <p>
          Manage your training profile, available equipment,
          and application preferences.
        </p>
      </header>

      {/* Training settings */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Training Settings</h2>

          <p>
            Customize your training experience.
          </p>
        </div>

        <div className="settings-card-grid">
          {/* Training profile */}
          <Link
            to="/settings/profile"
            className="settings-card"
          >
            <div className="settings-card-icon">
              <span aria-hidden="true">◎</span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>Training Profile</h3>

                <span
                  className={
                    `settings-status ${
                      hasProfile ? "is-configured" : ""
                    }`
                  }
                >
                  {hasProfile
                    ? "Configured"
                    : "Not Configured"}
                </span>
              </div>

              <p>
                Manage your training goals, experience
                level, training location, weekly
                frequency, and preferred units.
              </p>

              <span className="settings-card-action">
                {hasProfile
                  ? "Edit Training Profile"
                  : "Set Up Training Profile"}
                {" →"}
              </span>
            </div>
          </Link>

          {/* Home equipment */}
          <Link
            to="/settings/equipment"
            className="settings-card"
          >
            <div className="settings-card-icon">
              <span aria-hidden="true">◈</span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>My Equipment</h3>

                <span className="settings-status is-configured">
                  {equipmentStatus}
                </span>
              </div>

              <p>
                Select your home equipment and explore
                exercises compatible with your
                available setup.
              </p>

              <span className="settings-card-action">
                Manage Equipment →
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Future application settings */}
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Application Settings</h2>

          <p>
            Additional options will become available
            as Gym Tracker develops.
          </p>
        </div>

        <div className="settings-card-grid">
          <div className="settings-card is-planned">
            <div className="settings-card-icon">
              <span aria-hidden="true">⚙</span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>App Preferences</h3>

                <span className="settings-status">
                  Planned
                </span>
              </div>

              <p>
                Appearance, accessibility, and
                other application preferences.
              </p>
            </div>
          </div>

          <div className="settings-card is-planned">
            <div className="settings-card-icon">
              <span aria-hidden="true">♙</span>
            </div>

            <div className="settings-card-content">
              <div className="settings-card-title-row">
                <h3>Account & Security</h3>

                <span className="settings-status">
                  Planned
                </span>
              </div>

              <p>
                Account management and security
                settings will be added after
                authentication is implemented.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Information about current storage */}
      <div className="settings-storage-note">
        <strong>Development Note</strong>

        <p>
          Training preferences and equipment selections
          are currently stored in React memory. Permanent
          storage and account synchronization will be
          implemented in future stages.
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
