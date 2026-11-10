
import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import "./TrainingProfilePage.css";

const trainingGoals = [
  {
    value: "build-muscle",
    label: "Build Muscle",
    description: "Focus on developing muscle size.",
  },
  {
    value: "build-strength",
    label: "Build Strength",
    description: "Focus on improving strength.",
  },
  {
    value: "improve-endurance",
    label: "Improve Endurance",
    description: "Improve muscular endurance.",
  },
  {
    value: "body-recomposition",
    label: "Body Recomposition",
    description: "Focus on body composition goals.",
  },
  {
    value: "general-fitness",
    label: "General Fitness",
    description: "Focus on fitness and consistency.",
  },
];

const experienceLevels = [
  {
    value: "beginner",
    label: "Beginner",
    description: "New to resistance training.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some consistent training experience.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Extensive training experience.",
  },
];

const trainingLocations = [
  {
    value: "gym",
    label: "At the Gym",
    description: "Access to gym equipment.",
  },
  {
    value: "home",
    label: "At Home",
    description: "Train with your home equipment.",
  },
  {
    value: "both",
    label: "Both",
    description: "Train at home and at the gym.",
  },
];

const sessionDurations = [30, 45, 60, 75, 90];

function createFormState(profile) {
  return {
    primaryGoal:
      profile?.primaryGoal ??
      profile?.trainingGoal ??
      "",

    secondaryGoal:
      profile?.secondaryGoal ?? "",

    experienceLevel:
      profile?.experienceLevel ?? "beginner",

    trainingLocation:
      profile?.trainingLocation ?? "gym",

    trainingDaysPerWeek: String(
      profile?.trainingDaysPerWeek ?? 3
    ),

    sessionDurationMinutes: String(
      profile?.sessionDurationMinutes ?? 60
    ),

    weightUnit:
      profile?.weightUnit ?? "kg",
  };
}

function TrainingProfilePage() {
  const { profile, saveProfile } =
    useTrainingProfile();

  const [form, setForm] = useState(() =>
    createFormState(profile)
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(createFormState(profile));
  }, [profile]);

  function updateField(field, value) {
    setForm((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      if (
        field === "primaryGoal" &&
        updated.secondaryGoal === value
      ) {
        updated.secondaryGoal = "";
      }

      return updated;
    });

    setError("");
    setSuccess("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.primaryGoal) {
      setError("Please select your primary training goal.");
      return;
    }

    if (
      form.secondaryGoal &&
      form.secondaryGoal === form.primaryGoal
    ) {
      setError(
        "Primary and secondary goals must be different."
      );
      return;
    }

    const days = Number(form.trainingDaysPerWeek);
    const duration = Number(
      form.sessionDurationMinutes
    );

    if (
      !Number.isInteger(days) ||
      days < 1 ||
      days > 7
    ) {
      setError(
        "Choose a valid number of training days."
      );
      return;
    }

    if (!sessionDurations.includes(duration)) {
      setError(
        "Choose a valid session duration."
      );
      return;
    }

    const updatedProfile = {
      ...profile,

      primaryGoal: form.primaryGoal,

      // Keep compatibility with older profile fields.
      trainingGoal: form.primaryGoal,

      secondaryGoal: form.secondaryGoal,

      experienceLevel: form.experienceLevel,
      trainingLocation: form.trainingLocation,

      trainingDaysPerWeek: days,
      sessionDurationMinutes: duration,

      weightUnit: form.weightUnit,
    };

    saveProfile(updatedProfile);

    setError("");
    setSuccess(
      "Training profile saved successfully."
    );
  }

  return (
    <main className="training-profile-page">
      <Link
        to="/settings"
        className="tp-back-link"
      >
        ← Back to Settings
      </Link>

      <header className="tp-page-header">
        <span className="tp-eyebrow">
          PERSONALIZATION
        </span>

        <h1>Training Profile</h1>

        <p>
          Customize your goals and training
          preferences to prepare your
          personalized workout planning.
        </p>
      </header>

      <form
        className="tp-form"
        onSubmit={handleSubmit}
      >
        {/* ==================================
            TRAINING GOALS
        ================================== */}

        <section className="tp-section">
          <div className="tp-section-header">
            <span className="tp-section-number">
              01
            </span>

            <div>
              <h2>Training Goals</h2>

              <p>
                Choose your main training
                priority and an optional
                secondary goal.
              </p>
            </div>
          </div>

          <fieldset className="tp-fieldset">
            <legend>Primary Goal</legend>

            <div className="tp-options-grid">
              {trainingGoals.map((goal) => (
                <label
                  key={goal.value}
                  className={
                    `tp-option-card ${
                      form.primaryGoal === goal.value
                        ? "is-selected"
                        : ""
                    }`
                  }
                >
                  <input
                    type="radio"
                    name="primaryGoal"
                    value={goal.value}
                    checked={
                      form.primaryGoal === goal.value
                    }
                    onChange={() =>
                      updateField(
                        "primaryGoal",
                        goal.value
                      )
                    }
                  />

                  <span
                    className="tp-radio-circle"
                    aria-hidden="true"
                  />

                  <span className="tp-option-content">
                    <strong>{goal.label}</strong>

                    <small>
                      {goal.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="tp-field">
            <label htmlFor="secondaryGoal">
              Secondary Goal
              <span className="tp-optional">
                Optional
              </span>
            </label>

            <select
              id="secondaryGoal"
              value={form.secondaryGoal}
              onChange={(event) =>
                updateField(
                  "secondaryGoal",
                  event.target.value
                )
              }
            >
              <option value="">
                No secondary goal
              </option>

              {trainingGoals
                .filter(
                  (goal) =>
                    goal.value !== form.primaryGoal
                )
                .map((goal) => (
                  <option
                    key={goal.value}
                    value={goal.value}
                  >
                    {goal.label}
                  </option>
                ))}
            </select>

            <p className="tp-field-hint">
              Your primary goal guides your
              training focus. The secondary
              goal provides another priority
              for recommendations.
            </p>
          </div>
        </section>

        {/* ==================================
            TRAINING BACKGROUND
        ================================== */}

        <section className="tp-section">
          <div className="tp-section-header">
            <span className="tp-section-number">
              02
            </span>

            <div>
              <h2>Training Background</h2>

              <p>
                Tell us about your experience
                and where you prefer to train.
              </p>
            </div>
          </div>

          <fieldset className="tp-fieldset">
            <legend>Experience Level</legend>

            <div className="tp-options-grid">
              {experienceLevels.map((level) => (
                <label
                  key={level.value}
                  className={
                    `tp-option-card ${
                      form.experienceLevel === level.value
                        ? "is-selected"
                        : ""
                    }`
                  }
                >
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level.value}
                    checked={
                      form.experienceLevel === level.value
                    }
                    onChange={() =>
                      updateField(
                        "experienceLevel",
                        level.value
                      )
                    }
                  />

                  <span
                    className="tp-radio-circle"
                    aria-hidden="true"
                  />

                  <span className="tp-option-content">
                    <strong>{level.label}</strong>

                    <small>
                      {level.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="tp-fieldset">
            <legend>Training Location</legend>

            <div className="tp-options-grid">
              {trainingLocations.map((location) => (
                <label
                  key={location.value}
                  className={
                    `tp-option-card ${
                      form.trainingLocation ===
                      location.value
                        ? "is-selected"
                        : ""
                    }`
                  }
                >
                  <input
                    type="radio"
                    name="trainingLocation"
                    value={location.value}
                    checked={
                      form.trainingLocation ===
                      location.value
                    }
                    onChange={() =>
                      updateField(
                        "trainingLocation",
                        location.value
                      )
                    }
                  />

                  <span
                    className="tp-radio-circle"
                    aria-hidden="true"
                  />

                  <span className="tp-option-content">
                    <strong>
                      {location.label}
                    </strong>

                    <small>
                      {location.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        {/* ==================================
            TRAINING PREFERENCES
        ================================== */}

        <section className="tp-section">
          <div className="tp-section-header">
            <span className="tp-section-number">
              03
            </span>

            <div>
              <h2>Training Preferences</h2>

              <p>
                Configure your weekly availability
                and preferred training units.
              </p>
            </div>
          </div>

          <div className="tp-fields-grid">
            <div className="tp-field">
              <label htmlFor="trainingDays">
                Training Days per Week
              </label>

              <select
                id="trainingDays"
                value={
                  form.trainingDaysPerWeek
                }
                onChange={(event) =>
                  updateField(
                    "trainingDaysPerWeek",
                    event.target.value
                  )
                }
              >
                {Array.from(
                  { length: 7 },
                  (_, index) => index + 1
                ).map((days) => (
                  <option
                    key={days}
                    value={days}
                  >
                    {days}{" "}
                    {days === 1
                      ? "day"
                      : "days"} per week
                  </option>
                ))}
              </select>
            </div>

            <div className="tp-field">
              <label htmlFor="sessionDuration">
                Session Duration
              </label>

              <select
                id="sessionDuration"
                value={
                  form.sessionDurationMinutes
                }
                onChange={(event) =>
                  updateField(
                    "sessionDurationMinutes",
                    event.target.value
                  )
                }
              >
                {sessionDurations.map(
                  (minutes) => (
                    <option
                      key={minutes}
                      value={minutes}
                    >
                      {minutes} minutes
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <fieldset className="tp-fieldset tp-unit-fieldset">
            <legend>Weight Unit</legend>

            <div className="tp-unit-grid">
              <label
                className={
                  `tp-unit-option ${
                    form.weightUnit === "kg"
                      ? "is-selected"
                      : ""
                  }`
                }
              >
                <input
                  type="radio"
                  name="weightUnit"
                  value="kg"
                  checked={form.weightUnit === "kg"}
                  onChange={() =>
                    updateField("weightUnit", "kg")
                  }
                />

                <span
                  className="tp-radio-circle"
                  aria-hidden="true"
                />

                <strong>Kilograms (kg)</strong>
              </label>

              <label
                className={
                  `tp-unit-option ${
                    form.weightUnit === "lb"
                      ? "is-selected"
                      : ""
                  }`
                }
              >
                <input
                  type="radio"
                  name="weightUnit"
                  value="lb"
                  checked={form.weightUnit === "lb"}
                  onChange={() =>
                    updateField("weightUnit", "lb")
                  }
                />

                <span
                  className="tp-radio-circle"
                  aria-hidden="true"
                />

                <strong>Pounds (lb)</strong>
              </label>
            </div>
          </fieldset>

          <div className="tp-info-note">
            <strong>About your preferences</strong>

            <p>
              These settings help the Gym Tracker
              recommend workout plans that fit your
              goals, training experience, and schedule.
            </p>
          </div>
        </section>

        {/* ==================================
            SAVE PROFILE
        ================================== */}

        <div className="tp-save-section">
          <div className="tp-save-messages">
            {error && (
              <p
                className="tp-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                className="tp-success"
                role="status"
              >
                ✓ {success}
              </p>
            )}

            <p className="tp-storage-note">
              Your profile is currently saved
              for this application session.
              Permanent storage will be added
              in a later stage.
            </p>
          </div>

          <button
            type="submit"
            className="tp-save-button"
          >
            Save Training Profile
          </button>
        </div>
      </form>
    </main>
  );
}

export default TrainingProfilePage;
