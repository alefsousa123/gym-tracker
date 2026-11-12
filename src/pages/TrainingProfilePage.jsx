
import { useState } from "react";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import TrainingWeekPreview from
  "../components/workouts/TrainingWeekPreview";

import {
  trainingFocusAreas,
  sexOptions,
  MAX_MUSCLE_PRIORITIES,
} from "../data/trainingFocusOptions";

import "./TrainingProfilePage.css";
import "./TrainingProfileFocus.css";

// ==========================================
// TRAINING GOALS
// ==========================================

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

// ==========================================
// EXPERIENCE LEVELS
// ==========================================

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

// ==========================================
// TRAINING LOCATIONS
// ==========================================

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

// ==========================================
// FORM INITIAL VALUES
// ==========================================

function createFormState(profile) {
  return {
    sex: sexOptions.some(
      (option) => option.value === profile?.sex
    )
      ? profile.sex
      : "",

    musclePriorities: Array.isArray(
      profile?.musclePriorities
    )
      ? [...new Set(
          profile.musclePriorities.filter(
            (value) =>
              trainingFocusAreas.some(
                (area) => area.id === value
              )
          )
        )].slice(0, MAX_MUSCLE_PRIORITIES)
      : [],
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

// ==========================================
// TRAINING PROFILE PAGE
// ==========================================

function TrainingProfilePage() {
  const {
    profile,
    saveProfile,
  } = useTrainingProfile();

  const [form, setForm] = useState(() =>
    createFormState(profile)
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // UPDATE FORM FIELDS
  // ========================================

  function updateField(field, value) {
    setForm((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      // The same goal cannot be selected twice.
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

  // ========================================
  // MUSCLE FOCUS SELECTION
  // ========================================

  function toggleMusclePriority(areaId) {
    setForm((previous) => {
      const selected = previous.musclePriorities;

      if (selected.includes(areaId)) {
        return {
          ...previous,
          musclePriorities: selected.filter(
            (id) => id !== areaId
          ),
        };
      }

      if (selected.length >= MAX_MUSCLE_PRIORITIES) {
        return previous;
      }

      return {
        ...previous,
        musclePriorities: [...selected, areaId],
      };
    });

    setError("");
    setSuccess("");
  }

  // ========================================
  // SAVE TRAINING PROFILE
  // ========================================

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.primaryGoal) {
      setError(
        "Please select your primary training goal."
      );
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

    const days = Number(
      form.trainingDaysPerWeek
    );

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

      // Compatibility with older profile fields.
      trainingGoal: form.primaryGoal,

      secondaryGoal: form.secondaryGoal,

      sex: form.sex,

      musclePriorities: [
        ...form.musclePriorities,
      ],

      experienceLevel:
        form.experienceLevel,

      trainingLocation:
        form.trainingLocation,

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

  // ========================================
  // PAGE
  // ========================================

  return (
    <main className="training-profile-page">

      {/* ==================================
          CONTEXTUAL BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/settings"
        fallbackLabel="Settings"
        className="tp-back-link"
      />

      {/* ==================================
          PAGE HEADER
      ================================== */}

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

      {/* ==================================
          PROFILE FORM
      ================================== */}

      <form
        className="tp-form"
        onSubmit={handleSubmit}
      >

        {/* ==================================
            01 - TRAINING GOALS
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

          {/* Primary Goal */}

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
                    <strong>
                      {goal.label}
                    </strong>

                    <small>
                      {goal.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Secondary Goal */}

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
            02 - TRAINING BACKGROUND
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

          {/* Experience Level */}

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
                    <strong>
                      {level.label}
                    </strong>

                    <small>
                      {level.description}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Training Location */}

          <fieldset className="tp-fieldset">
            <legend>Training Location</legend>

            <div className="tp-options-grid">
              {trainingLocations.map(
                (location) => (
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
                )
              )}
            </div>
          </fieldset>
        </section>

        {/* ==================================
            03 - TRAINING PREFERENCES
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

          {/* Days and Session Duration */}

          <div className="tp-fields-grid">
            <div className="tp-field">
              <label htmlFor="trainingDays">
                Training Days per Week
              </label>

              <select
                id="trainingDays"
                value={form.trainingDaysPerWeek}
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
                value={form.sessionDurationMinutes}
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

          {/* Weight Unit */}

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

          {/* MUSCLE FOCUS AND SEX */}

          <div className="tp-focus-section">
            <h3>Muscle Areas to Prioritize</h3>

            <p className="tp-focus-description">
              Choose up to three muscle areas to
              prioritize, in order of importance.

              These priorities will guide future
              personalized recommendations, giving
              your selected areas extra attention
              without excluding other muscle groups.

              You can change or remove your priorities
              anytime. Leave all areas unselected
              for a balanced training approach.

              Changing your priorities does not
              automatically modify your current
              workout plan.
            </p>

            <div className="tp-focus-grid">
              {trainingFocusAreas.map((area) => {
                const index =
                  form.musclePriorities.indexOf(
                    area.id
                  );

                const selected = index !== -1;

                const limitReached =
                  form.musclePriorities.length >=
                  MAX_MUSCLE_PRIORITIES;

                return (
                  <button
                    key={area.id}
                    type="button"
                    className={
                      selected
                        ? "tp-focus-button is-selected"
                        : "tp-focus-button"
                    }
                    aria-pressed={selected}
                    disabled={
                      !selected && limitReached
                    }
                    onClick={() =>
                      toggleMusclePriority(area.id)
                    }
                  >
                    <span
                      className="tp-focus-index"
                      aria-hidden="true"
                    >
                      {selected ? index + 1 : "+"}
                    </span>

                    <span>{area.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="tp-field tp-focus-sex-field">
              <label htmlFor="profileSex">
                Sex

                <span className="tp-optional">
                  Optional
                </span>
              </label>

              <select
                id="profileSex"
                value={form.sex}
                onChange={(event) =>
                  updateField(
                    "sex",
                    event.target.value
                  )
                }
              >
                {sexOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <p className="tp-field-hint">
                This information does not change
                your exercise recommendations.
                Demonstration model preferences
                may be added separately in the future.
              </p>
            </div>
          </div>

          {/* Training Preference Information */}

          <div className="tp-info-note">
            <strong>About your preferences</strong>

            <p>
              These settings help Gym Tracker
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
              Your profile is saved locally
              on this device.
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

      {/* ==================================
          04 - WEEKLY SCHEDULE PREVIEW

          Outside the profile form:
          this section does not submit
          or modify the training profile.
      ================================== */}

      <TrainingWeekPreview />

    </main>
  );
}

export default TrainingProfilePage;
