
import { useState } from "react";
import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import { exercises } from "../data/exercises";

import { isExerciseAvailable } from
  "../data/workoutPlans";

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
// CONFIGURATION
// ==========================================

const EQUIPMENT_PAGE_SIZE = 24;

// ==========================================
// REPDB EQUIPMENT IMAGE CATALOG
// ==========================================

const equipmentImageIds = [
  "ab-crunch-machine",
  "ab-wheel",
  "air-bike",
  "assisted-pullup-machine",
  "back-extension-machine",
  "barbell",
  "battle-rope",
  "bicep-curl-machine",
  "bicycle",
  "bosu-ball",
  "cable",
  "chest-fly-machine",
  "chest-press-machine",
  "climbing-rope",
  "dip-machine",
  "dip-station",
  "donkey-calf-raise-machine",
  "dumbbell",
  "elliptical",
  "ez-bar",
  "flat-bench",
  "glute-ham-developer",
  "hack-squat",
  "hip-abduction-machine",
  "hip-adduction-machine",
  "hip-thrust-machine",
  "jump-rope",
  "kettlebell",
  "lat-pulldown-machine",
  "leg-curl",
  "leg-extension",
  "leg-press",
  "loop-band",
  "medicine-ball",
  "pec-deck",
  "plate-loaded-dip-machine",
  "plate-loaded-lateral-raise-machine",
  "plates",
  "plyo-box",
  "preacher-curl-machine",
  "pull-up-bar",
  "resistance-band",
  "reverse-fly-machine",
  "rings",
  "rower",
  "sandbag",
  "seated-calf-raise-machine",
  "seated-row-machine",
  "shoulder-press-machine",
  "shrug-machine",
  "ski-erg",
  "slam-ball",
  "sled",
  "smith-machine",
  "stability-ball",
  "stair-climber",
  "standing-calf-raise-machine",
  "stationary-bike",
  "suspension-trainer",
  "trap-bar",
  "treadmill",
  "tricep-extension-machine",
  "wall-ball",
  "wrist-roller",
];

// ==========================================
// EQUIPMENT NAME MAPPING
// ==========================================

const equipmentNameOverrides = {
  "barbell": "Barbell",
  "cable": "Cable Machine",
  "dip-station": "Dip Bars",
  "dumbbell": "Dumbbells",
  "ez-bar": "EZ Bar",
  "flat-bench": "Bench",
  "kettlebell": "Kettlebells",
  "leg-press": "Leg Press Machine",
  "plates": "Weight Plates",
  "pull-up-bar": "Pull-Up Bar",
  "resistance-band": "Resistance Bands",
  "smith-machine": "Smith Machine",
  "stability-ball": "Stability Ball",
  "suspension-trainer": "Suspension Trainer",
  "trap-bar": "Trap Bar",
  "medicine-ball": "Medicine Ball",
  "jump-rope": "Jump Rope",
  "ski-erg": "Ski Erg",
  "bosu-ball": "BOSU Ball",
  "ab-wheel": "Ab Wheel",
  "ab-crunch-machine": "Ab Crunch Machine",
};

// ==========================================
// EQUIPMENT LABEL HELPERS
// ==========================================

function humanizeEquipmentName(value) {
  return value
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

// ==========================================
// REPDB EQUIPMENT OPTIONS
// ==========================================

const repdbEquipmentOptions = [
  ...equipmentImageIds.map((imageId) => ({
    id: imageId,

    name:
      equipmentNameOverrides[imageId] ??
      humanizeEquipmentName(imageId),

    imageUrl:
      `/repdb-images/equipment-${imageId}.webp`,
  })),

  // Custom adjustable bench.
  // Reuses the original flat bench image.
  {
    id: "adjustable-bench",
    name: "Bench (Adjustable)",
    imageUrl:
      "/repdb-images/equipment-flat-bench.webp",
  },
];

const repdbEquipmentNames = new Set(
  repdbEquipmentOptions.map(
    (equipment) => equipment.name
  )
);

// ==========================================
// HOME EXERCISE CATALOG
// ==========================================

const homeExerciseCatalog = exercises.filter(
  (exercise) =>
    exercise.locations.includes("home")
);

// Keep additional equipment used by exercises
// even when RepDB has no matching photograph.

const additionalCatalogNames = [
  ...new Set(
    homeExerciseCatalog.flatMap(
      (exercise) => exercise.equipment
    )
  ),
].filter(
  (equipmentName) =>
    !repdbEquipmentNames.has(equipmentName)
);

// ==========================================
// LOCATION LABELS
// ==========================================

const locationLabels = {
  home: "At Home",
  gym: "At the Gym",
  both: "Home and Gym",
};

// ==========================================
// EQUIPMENT PHOTO
// ==========================================

function EquipmentPhoto({ imageUrl }) {
  const [failedImage, setFailedImage] =
    useState(null);

  const showImage =
    Boolean(imageUrl) &&
    failedImage !== imageUrl;

  return (
    <span
      className="equipment-option-media"
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() =>
            setFailedImage(imageUrl)
          }
        />
      ) : (
        <span className="equipment-photo-placeholder">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6.5 6.5-3 3 11 11 3-3" />
            <path d="m3.5 9.5-2 2 11 11 2-2" />
            <path d="m17.5 17.5 3-3-11-11-3 3" />
            <path d="m20.5 14.5 2-2-11-11-2 2" />
          </svg>
        </span>
      )}
    </span>
  );
}

// ==========================================
// COMPATIBLE EXERCISE CARD
// ==========================================

function EquipmentExerciseCard({ exercise }) {
  const isBodyweight =
    exercise.equipment.length === 0;

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
  const {
    homeEquipment,
    toggleHomeEquipment,
    clearHomeEquipment,
  } = useEquipment();

  const { profile } = useTrainingProfile();

  // ========================================
  // SEARCH AND PAGINATION
  // ========================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [visibleCount, setVisibleCount] =
    useState(EQUIPMENT_PAGE_SIZE);

  // ========================================
  // BUILD ALL EQUIPMENT OPTIONS
  // ========================================

  // Preserve equipment names from the catalog
  // and previously saved user selections.

  const additionalNames = [
    ...new Set([
      ...additionalCatalogNames,
      ...homeEquipment,
    ]),
  ].filter(
    (name) => !repdbEquipmentNames.has(name)
  );

  const additionalOptions =
    additionalNames.map((name) => ({
      id: `additional:${name}`,
      name,
      imageUrl: null,
    }));

  const allEquipmentOptions = [
    ...repdbEquipmentOptions,
    ...additionalOptions,
  ].sort((first, second) =>
    first.name.localeCompare(
      second.name,
      "en",
      { sensitivity: "base" }
    )
  );

  // ========================================
  // SEARCH EQUIPMENT
  // ========================================

  const normalizedSearch =
    searchTerm.trim().toLowerCase();

  const filteredEquipment =
    allEquipmentOptions.filter(
      (equipment) =>
        equipment.name
          .toLowerCase()
          .includes(normalizedSearch)
    );

  const visibleEquipment =
    filteredEquipment.slice(0, visibleCount);

  const hasMoreEquipment =
    visibleEquipment.length <
    filteredEquipment.length;

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
    setVisibleCount(EQUIPMENT_PAGE_SIZE);
  }

  function handleClearSearch() {
    setSearchTerm("");
    setVisibleCount(EQUIPMENT_PAGE_SIZE);
  }

  function handleLoadMore() {
    setVisibleCount(
      (previous) =>
        previous + EQUIPMENT_PAGE_SIZE
    );
  }

  // ========================================
  // COMPATIBLE EXERCISES
  // ========================================

  // Use the same compatibility function
  // used by workout plans and Workout Builder.

  const compatibleExercises =
    exercises.filter(
      (exercise) =>
        isExerciseAvailable(
          exercise,
          "home",
          homeEquipment
        )
    );

  const bodyweightExercises =
    compatibleExercises.filter(
      (exercise) =>
        exercise.equipment.length === 0
    );

  const equipmentExercises =
    compatibleExercises.filter(
      (exercise) =>
        exercise.equipment.length > 0
    );

  const isBodyweightOnly =
    homeEquipment.length === 0;

  const trainingLocation =
    locationLabels[profile?.trainingLocation] ??
    "Not configured";

  // ========================================
  // PAGE CONTENT
  // ========================================

  return (
    <div className="equipment-page">

      {/* BACK NAVIGATION */}

      <BackToPreviousPage
        fallbackTo="/settings"
        fallbackLabel="Settings"
        className="equipment-return-link"
      />

      {/* PAGE HEADING */}

      <header className="equipment-page-heading">
        <span className="equipment-page-eyebrow">
          HOME TRAINING
        </span>

        <h1>My Equipment</h1>

        <p>
          Select the equipment you have available at home.
          Gym Tracker will show compatible exercises
          based on your setup.
        </p>
      </header>

      {/* MAIN GRID */}

      <div className="equipment-page-grid">

        {/* EQUIPMENT SELECTION */}

        <section className="equipment-selector-card">

          <div className="equipment-section-heading">
            <div>
              <h2>Available Equipment</h2>

              <p>
                Explore all RepDB equipment types and
                select the items you can use.
              </p>
            </div>

            <span className="equipment-selection-count">
              {homeEquipment.length} selected
            </span>
          </div>

          {/* BODYWEIGHT INFORMATION */}

          <div className="equipment-bodyweight-notice">
            <strong>
              Bodyweight is always available
            </strong>

            <p>
              You do not need equipment for bodyweight
              exercises. Leave everything unchecked
              to use Bodyweight Only.
            </p>
          </div>

          {/* EQUIPMENT SEARCH */}

          <div className="equipment-search-section">
            <label htmlFor="equipment-search">
              Search Equipment
            </label>

            <div className="equipment-search-controls">
              <input
                id="equipment-search"
                type="search"
                placeholder="Search by equipment name..."
                value={searchTerm}
                onChange={handleSearchChange}
              />

              {searchTerm && (
                <button
                  type="button"
                  className="equipment-clear-search"
                  onClick={handleClearSearch}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* RESULT COUNTERS */}

          <div className="equipment-list-meta">
            <span>
              {filteredEquipment.length}
              {" "}equipment types found
            </span>

            <span>
              Showing {visibleEquipment.length}
              {" "}of {filteredEquipment.length}
            </span>
          </div>

          {/* EQUIPMENT OPTIONS */}

          {filteredEquipment.length > 0 ? (
            <>
              <div className="equipment-option-grid">
                {visibleEquipment.map((equipment) => {
                  const isSelected =
                    homeEquipment.includes(
                      equipment.name
                    );

                  return (
                    <label
                      key={equipment.id}
                      className={
                        `equipment-option ${
                          isSelected
                            ? "is-selected"
                            : ""
                        }`
                      }
                    >
                      <input
                        type="checkbox"
                        value={equipment.name}
                        checked={isSelected}
                        onChange={() =>
                          toggleHomeEquipment(
                            equipment.name
                          )
                        }
                      />

                      <EquipmentPhoto
                        imageUrl={equipment.imageUrl}
                      />

                      <span className="equipment-option-name">
                        {equipment.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* LOAD MORE */}

              {hasMoreEquipment && (
                <div className="equipment-pagination">
                  <button
                    type="button"
                    className="equipment-reset-button"
                    onClick={handleLoadMore}
                  >
                    Load More Equipment
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="equipment-search-empty">
              <p>No equipment found.</p>

              <button
                type="button"
                className="equipment-reset-button"
                onClick={handleClearSearch}
              >
                Clear Search
              </button>
            </div>
          )}

          {/* EQUIPMENT ACTIONS */}

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

        {/* SUMMARY SIDEBAR */}

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
                <strong>{compatibleExercises.length}</strong>
              </div>

              <div>
                <span>Bodyweight Exercises</span>
                <strong>{bodyweightExercises.length}</strong>
              </div>
            </div>
          </div>

          {/* TRAINING PROFILE */}

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

      {/* COMPATIBLE HOME EXERCISES */}

      <section className="equipment-matches">

        <div className="equipment-matches-heading">
          <div>
            <span className="equipment-page-eyebrow">
              PERSONALIZED EXERCISE LIST
            </span>

            <h2>Compatible Home Exercises</h2>

            <p>
              Exercises that match your selected
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

        {/* EMPTY RESULTS */}

        {compatibleExercises.length === 0 ? (
          <div className="equipment-no-results">
            <h3>No Compatible Exercises Found</h3>

            <p>
              No exercises currently match this setup.
              Try selecting different equipment.
            </p>

            <Link to="/exercises">
              Explore All Exercises →
            </Link>
          </div>
        ) : (
          <>
            {/* BODYWEIGHT EXERCISES */}

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

            {/* EQUIPMENT-BASED EXERCISES */}

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

        {/* FULL LIBRARY LINK */}

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
