

import { Link } from "react-router";

import { exercises } from "../data/exercises";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import "./EquipmentPage.css";

// Only exercises that support home training
const homeExerciseCatalog = exercises.filter(
  (exercise) => exercise.locations.includes("home")
);

// Automatically discover equipment from the catalog
const equipmentOptions = [
  ...new Set(
    homeExerciseCatalog.flatMap(
      (exercise) => exercise.equipment
    )
  ),
].sort((first, second) => first.localeCompare(second));

// Readable training location labels
const locationLabels = {
  home: "At Home",
  gym: "At the Gym",
  both: "Home and Gym",
};

// Reusable card for a compatible exercise
function EquipmentExerciseCard({ exercise }) {
  const isBodyweight = exercise.equipment.length === 0;

  const equipmentLabel = isBodyweight
    ? "Bodyweight"
    : exercise.equipment.join(", ");

  return (
    <Link
      to={`/exercises/${exercise.id}`}
      className="equipment-exercise-card"
    >
      <div className="equipment-exercise-card-top">
        <span className="equipment-exercise-category">
          {exercise.muscleGroup}
        </span>

        <span className="equipment-exercise-difficulty">
          {exercise.difficulty}
        </span>
      </div>

      <h3>{exercise.name}</h3>

      <p>Equipment: {equipmentLabel}</p>

      <span className="equipment-exercise-link">
        View Exercise →
      </span>
    </Link>
  );
}

function EquipmentPage() {
  // Shared equipment state
  const {
    homeEquipment,
    toggleHomeEquipment,
    clearHomeEquipment,
  } = useEquipment();

  // Preferences saved in the training profile
  const { profile } = useTrainingProfile();

  // Only show exercises that require available equipment
  const compatibleExercises = homeExerciseCatalog.filter(
    (exercise) =>
      exercise.equipment.every(
        (requiredEquipment) =>
          homeEquipment.includes(requiredEquipment)
      )
  );

  // Separate bodyweight and equipment-based exercises
  const bodyweightExercises = compatibleExercises.filter(
    (exercise) => exercise.equipment.length === 0
  );

  const equipmentExercises = compatibleExercises.filter(
    (exercise) => exercise.equipment.length > 0
  );

  const isBodyweightOnly = homeEquipment.length === 0;

  const trainingLocation =
    locationLabels[profile?.trainingLocation] ??
    "Not configured";

  return (
    <div className="equipment-page">
      {/* Page heading */}
      <header className="equipment-page-heading">
        <span className="equipment-page-eyebrow">
          HOME TRAINING
        </span>

        <h1>My Equipment</h1>

        <p>
          Select the equipment you have available at home.
          Gym Tracker will show exercises compatible with
          your setup.
        </p>
      </header>

      {/* Equipment selection and summary */}
      <div className="equipment-page-grid">
        <section className="equipment-selector-card">
          <div className="equipment-section-heading">
            <div>
              <h2>Available Equipment</h2>

              <p>
                Choose all items you can use for home
                workouts.
              </p>
            </div>

            <span className="equipment-selection-count">
              {homeEquipment.length} selected
            </span>
          </div>

          <div className="equipment-bodyweight-notice">
            <strong>Bodyweight is always available</strong>

            <p>
              You do not need equipment to access
              bodyweight exercises. Leave everything
              unchecked to use Bodyweight Only.
            </p>
          </div>

          {/* Equipment options from exercises.js */}
          {equipmentOptions.length > 0 ? (
            <div className="equipment-option-grid">
              {equipmentOptions.map((equipmentName) => {
                const isSelected =
                  homeEquipment.includes(equipmentName);

                return (
                  <label
                    key={equipmentName}
                    className={
                      `equipment-option ${
                        isSelected ? "is-selected" : ""
                      }`
                    }
                  >
                    <input
                      type="checkbox"
                      value={equipmentName}
                      checked={isSelected}
                      onChange={() =>
                        toggleHomeEquipment(equipmentName)
                      }
                    />

                    <span>{equipmentName}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="equipment-empty-message">
              No home equipment has been added to
              the exercise library yet.
            </p>
          )}

          <div className="equipment-selector-actions">
            <button
              type="button"
              className="equipment-reset-button"
              onClick={clearHomeEquipment}
              disabled={isBodyweightOnly}
            >
              Bodyweight Only
            </button>

            <span className="equipment-live-note">
              Changes update your available exercises
              automatically.
            </span>
          </div>
        </section>

        {/* Summary sidebar */}
        <aside className="equipment-sidebar">
          <div className="equipment-summary-card">
            <span className="equipment-summary-eyebrow">
              YOUR HOME SETUP
            </span>

            <h2>
              {isBodyweightOnly
                ? "Bodyweight Only"
                : "Custom Equipment"}
            </h2>

            <p>
              {isBodyweightOnly
                ? "Your setup uses no additional equipment."
                : "Your selected items are ready for workout planning."}
            </p>

            <div className="equipment-summary-stats">
              <div>
                <span>Equipment Items</span>

                <strong>{homeEquipment.length}</strong>
              </div>

              <div>
                <span>Compatible Exercises</span>

                <strong>
                  {compatibleExercises.length}
                </strong>
              </div>

              <div>
                <span>Bodyweight Exercises</span>

                <strong>
                  {bodyweightExercises.length}
                </strong>
              </div>
            </div>
          </div>

          <div className="equipment-profile-card">
            <h3>Training Profile</h3>

            <p>
              Preferred Training Location
            </p>

            <strong>{trainingLocation}</strong>

            {!profile ? (
              <Link to="/profile">
                Configure Training Profile →
              </Link>
            ) : (
              <Link to="/profile">
                Edit Training Profile →
              </Link>
            )}

            {profile?.trainingLocation === "gym" && (
              <p className="equipment-profile-hint">
                Your profile currently prioritizes
                gym training. You can still configure
                a home setup for future use.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Compatible exercise results */}
      <section className="equipment-matches">
        <div className="equipment-matches-heading">
          <div>
            <span className="equipment-page-eyebrow">
              PERSONALIZED EXERCISE LIST
            </span>

            <h2>Compatible Home Exercises</h2>

            <p>
              Exercises that match your available
              equipment and support home training.
            </p>
          </div>

          <span
            className="equipment-matches-count"
            aria-live="polite"
            aria-atomic="true"
          >
            {compatibleExercises.length} exercises
          </span>
        </div>

        {compatibleExercises.length === 0 ? (
          <div className="equipment-no-results">
            <h3>No Compatible Exercises Found</h3>

            <p>
              No exercises currently match this setup.
              The available list will grow as we expand
              the exercise library.
            </p>

            <Link to="/exercises">
              Explore All Exercises →
            </Link>
          </div>
        ) : (
          <>
            {/* Bodyweight results */}
            {bodyweightExercises.length > 0 && (
              <div className="equipment-result-section">
                <div className="equipment-result-heading">
                  <h3>Bodyweight Exercises</h3>

                  <span>
                    {bodyweightExercises.length} available
                  </span>
                </div>

                <div className="equipment-exercise-grid">
                  {bodyweightExercises.map((exercise) => (
                    <EquipmentExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Results requiring selected equipment */}
            {equipmentExercises.length > 0 && (
              <div className="equipment-result-section">
                <div className="equipment-result-heading">
                  <h3>Exercises with Your Equipment</h3>

                  <span>
                    {equipmentExercises.length} available
                  </span>
                </div>

                <div className="equipment-exercise-grid">
                  {equipmentExercises.map((exercise) => (
                    <EquipmentExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="equipment-library-link">
          <Link to="/exercises">
            Browse Full Exercise Library →
          </Link>
        </div>
      </section>
    </div>
  );
}

export default EquipmentPage;
