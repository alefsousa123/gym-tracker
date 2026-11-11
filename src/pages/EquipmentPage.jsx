
import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import { exercises } from "../data/exercises";

import ExerciseMotionPreview from
  "../components/exercises/ExerciseMotionPreview";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import "./EquipmentPage.css";

// ==========================================
// HOME EXERCISE CATALOG
// ==========================================

// Only exercises that support home training.
const homeExerciseCatalog = exercises.filter(
  (exercise) => exercise.locations.includes("home")
);

// Automatically discover equipment from the catalog.
const equipmentOptions = [
  ...new Set(
    homeExerciseCatalog.flatMap(
      (exercise) => exercise.equipment
    )
  ),
].sort((first, second) =>
  first.localeCompare(second)
);

// Readable labels for training locations.
const locationLabels = {
  home: "At Home",
  gym: "At the Gym",
  both: "Home and Gym",
};

// ==========================================
// COMPATIBLE EXERCISE CARD
// ==========================================

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
      {/* Exercise category and difficulty */}
      <div className="equipment-exercise-card-top">
        <span className="equipment-exercise-category">
          {exercise.muscleGroup}
        </span>

        <span className="equipment-exercise-difficulty">
          {exercise.difficulty}
        </span>
      </div>

      {/* Animated thumbnail and exercise information */}
      <div className="equipment-exercise-main">
        <ExerciseMotionPreview
          exerciseId={exercise.id}
          exerciseName={exercise.name}
          variant="thumbnail"
        />

        <div className="equipment-exercise-text">
          <h3>{exercise.name}</h3>

          <p>
            Equipment: {equipmentLabel}
          </p>
        </div>
      </div>

      <span className="equipment-exercise-link">
        View Exercise →
      </span>
    </Link>
  );
}

// ==========================================
// EQUIPMENT PAGE
// ==========================================

function EquipmentPage() {
  // Shared equipment state.
  const {
    homeEquipment,
    toggleHomeEquipment,
    clearHomeEquipment,
  } = useEquipment();

  // Training preferences.
  const { profile } = useTrainingProfile();

  // ========================================
  // COMPATIBLE EXERCISES
  // ========================================

  const compatibleExercises =
    homeExerciseCatalog.filter(
      (exercise) =>
        exercise.equipment.every(
          (requiredEquipment) =>
            homeEquipment.includes(requiredEquipment)
        )
    );

  // Bodyweight exercises require no equipment.
  const bodyweightExercises =
    compatibleExercises.filter(
      (exercise) => exercise.equipment.length === 0
    );

  // Exercises that require selected equipment.
  const equipmentExercises =
    compatibleExercises.filter(
      (exercise) => exercise.equipment.length > 0
    );

  const isBodyweightOnly =
    homeEquipment.length === 0;

  const trainingLocation =
    locationLabels[profile?.trainingLocation] ??
    "Not configured";

  return (
    <div className="equipment-page">

      {/* ==================================
          CONTEXTUAL BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/settings"
        fallbackLabel="Settings"
        className="equipment-return-link"
      />

      {/* ==================================
          PAGE HEADING
      ================================== */}

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

      {/* ==================================
          MAIN GRID
      ================================== */}

      <div className="equipment-page-grid">

        {/* ==================================
            EQUIPMENT SELECTION
        ================================== */}

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

          {/* Bodyweight information */}
          <div className="equipment-bodyweight-notice">
            <strong>
              Bodyweight is always available
            </strong>

            <p>
              You do not need equipment to access
              bodyweight exercises. Leave everything
              unchecked to use Bodyweight Only.
            </p>
          </div>

          {/* Equipment selection */}
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

          {/* Equipment actions */}
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

        {/* ==================================
            SUMMARY SIDEBAR
        ================================== */}

        <aside className="equipment-sidebar">

          {/* Home setup summary */}
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
                <strong>{compatibleExercises.length}</strong>
              </div>

              <div>
                <span>Bodyweight Exercises</span>
                <strong>{bodyweightExercises.length}</strong>
              </div>
            </div>
          </div>

          {/* Training profile */}
          <div className="equipment-profile-card">
            <h3>Training Profile</h3>

            <p>Preferred Training Location</p>

            <strong>{trainingLocation}</strong>

            {!profile ? (
              <Link to="/settings/profile">
                Configure Training Profile →
              </Link>
            ) : (
              <Link to="/settings/profile">
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

      {/* ==================================
          COMPATIBLE HOME EXERCISES
      ================================== */}

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

        {/* ==================================
            EMPTY RESULTS
        ================================== */}

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

            {/* ==================================
                BODYWEIGHT EXERCISES
            ================================== */}

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

            {/* ==================================
                EQUIPMENT-BASED EXERCISES
            ================================== */}

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

        {/* ==================================
            EXERCISE LIBRARY LINK
        ================================== */}

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
