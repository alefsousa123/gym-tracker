
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";

import ExerciseCard from
  "../components/exercises/ExerciseCard";

import ExerciseFilters from
  "../components/exercises/ExerciseFilters";

import { exercises } from "../data/exercises";

import {
  rankExercisesForUser,
} from "../utils/exerciseRecommendationEngine";

import {
  isExerciseAvailable,
} from "../data/workoutPlans";

import {
  useEquipment,
} from "../context/EquipmentContext";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  exerciseMuscleFilterOptions,
  matchesPrimaryMuscleFilter,
} from "../utils/exerciseMuscleFilters";

import "./ExercisesPage.css";

// ==========================================
// CONFIGURATION
// ==========================================

const DEFAULT_FILTER = "all";
const DEFAULT_SORT = "recommended";
const EXERCISES_PER_PAGE = 24;

// ==========================================
// AVAILABLE MUSCLE GROUPS
// ==========================================

const muscleGroups = exerciseMuscleFilterOptions;

// ==========================================
// AVAILABLE EQUIPMENT
// ==========================================

const equipmentOptions = [
  ...new Set(
    exercises.flatMap(
      (exercise) => exercise.equipment ?? []
    )
  ),
].sort((first, second) =>
  first.localeCompare(second)
);

// ==========================================
// DIFFICULTY OPTIONS
// ==========================================

const difficultyOptions = [
  "beginner",
  "intermediate",
  "advanced",
];

// ==========================================
// VALID FILTER OPTIONS
// ==========================================

const availabilityOptions = [
  "all",
  "home",
  "my-setup",
];

const sortOptions = [
  "recommended",
  "catalog",
  "name-asc",
  "name-desc",
];

// ==========================================
// ADVANCED FILTER PANEL STYLES
// ==========================================

// Reuse the project's CSS variables.
// No additional stylesheet is necessary.

const advancedPanelStyle = {
  marginBottom: 24,
  padding: "16px 20px",
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-card)",
  boxShadow: "var(--shadow-card)",
};

const advancedGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(185px, 1fr))",
  gap: 16,
  marginTop: 18,
};

const advancedSummaryStyle = {
  cursor: "pointer",
  color: "var(--color-text)",
  fontSize: 14,
  fontWeight: 700,
};

const loadMoreContainerStyle = {
  display: "flex",
  justifyContent: "center",
  marginTop: 28,
};

// ==========================================
// CHECK EXERCISE AVAILABILITY
// ==========================================

function matchesAvailability(
  exercise,
  availability,
  trainingLocation,
  homeEquipment
) {
  if (availability === DEFAULT_FILTER) {
    return true;
  }

  // Available at home using selected equipment.
  if (availability === "home") {
    return isExerciseAvailable(
      exercise,
      "home",
      homeEquipment
    );
  }

  // Available for the user's saved training setup.
  if (availability === "my-setup") {
    if (trainingLocation === "gym") {
      return isExerciseAvailable(
        exercise,
        "gym",
        homeEquipment
      );
    }

    if (trainingLocation === "both") {
      return (
        isExerciseAvailable(
          exercise,
          "home",
          homeEquipment
        ) ||
        isExerciseAvailable(
          exercise,
          "gym",
          homeEquipment
        )
      );
    }

    // Default to home equipment when the
    // profile is missing or set to home.
    return isExerciseAvailable(
      exercise,
      "home",
      homeEquipment
    );
  }

  return true;
}

// ==========================================
// EXERCISES PAGE
// ==========================================

function ExercisesPage() {
  // ========================================
  // SHARED TRAINING DATA
  // ========================================

  const { homeEquipment } = useEquipment();

  const { profile } = useTrainingProfile();

  const trainingLocation =
    profile?.trainingLocation ?? null;

  // ========================================
  // URL SEARCH PARAMETERS
  // ========================================

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  // ========================================
  // PAGINATION STATE
  // ========================================

  const [visibleCount, setVisibleCount] =
    useState(EXERCISES_PER_PAGE);

  // ========================================
  // BASIC FILTER VALUES
  // ========================================

  const searchTerm =
    searchParams.get("search") ?? "";

  const muscleParam =
    searchParams.get("muscle") ??
    DEFAULT_FILTER;

  const locationParam =
    searchParams.get("location") ??
    DEFAULT_FILTER;

  const selectedMuscle =
    muscleGroups.includes(muscleParam)
      ? muscleParam
      : DEFAULT_FILTER;

  const selectedLocation =
    ["home", "gym"].includes(locationParam)
      ? locationParam
      : DEFAULT_FILTER;

  // ========================================
  // ADVANCED FILTER VALUES
  // ========================================

  const difficultyParam =
    searchParams.get("difficulty") ??
    DEFAULT_FILTER;

  const equipmentParam =
    searchParams.get("equipment") ??
    DEFAULT_FILTER;

  const availabilityParam =
    searchParams.get("availability") ??
    DEFAULT_FILTER;

  const sortParam =
    searchParams.get("sort") ??
    DEFAULT_SORT;

  const selectedDifficulty =
    difficultyOptions.includes(difficultyParam)
      ? difficultyParam
      : DEFAULT_FILTER;

  const selectedEquipment =
    equipmentOptions.includes(equipmentParam)
      ? equipmentParam
      : DEFAULT_FILTER;

  const selectedAvailability =
    availabilityOptions.includes(availabilityParam)
      ? availabilityParam
      : DEFAULT_FILTER;

  const selectedSort =
    sortOptions.includes(sortParam)
      ? sortParam
      : DEFAULT_SORT;

  // ========================================
  // ACTIVE ADVANCED FILTER COUNT
  // ========================================

  const activeAdvancedFilters = [
    selectedDifficulty !== DEFAULT_FILTER,
    selectedEquipment !== DEFAULT_FILTER,
    selectedAvailability !== DEFAULT_FILTER,
    selectedSort !== DEFAULT_SORT,
  ].filter(Boolean).length;

  // ========================================
  // UPDATE URL FILTER
  // ========================================

  function updateFilter(name, value) {
    // A new filter always starts from page one.
    setVisibleCount(EXERCISES_PER_PAGE);

    setSearchParams(
      (previousParams) => {
        const nextParams = new URLSearchParams(
          previousParams
        );

        const shouldRemove =
          value === "" ||
          value === DEFAULT_FILTER ||
          (
            name === "sort" &&
            value === DEFAULT_SORT
          );

        if (shouldRemove) {
          nextParams.delete(name);
        } else {
          nextParams.set(name, value);
        }

        return nextParams;
      },
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  }

  // ========================================
  // BASIC FILTER HANDLERS
  // ========================================

  function handleSearchChange(value) {
    updateFilter("search", value);
  }

  function handleMuscleChange(value) {
    updateFilter("muscle", value);
  }

  function handleLocationChange(value) {
    updateFilter("location", value);
  }

  // ========================================
  // ADVANCED FILTER HANDLERS
  // ========================================

  function handleDifficultyChange(value) {
    updateFilter("difficulty", value);
  }

  function handleEquipmentChange(value) {
    updateFilter("equipment", value);
  }

  function handleAvailabilityChange(value) {
    updateFilter("availability", value);
  }

  function handleSortChange(value) {
    updateFilter("sort", value);
  }

  // ========================================
  // CLEAR ALL FILTERS
  // ========================================

  function handleClearFilters() {
    setVisibleCount(EXERCISES_PER_PAGE);

    setSearchParams(
      (previousParams) => {
        const nextParams = new URLSearchParams(
          previousParams
        );

        [
          "search",
          "muscle",
          "location",
          "difficulty",
          "equipment",
          "availability",
          "sort",
        ].forEach((name) => {
          nextParams.delete(name);
        });

        return nextParams;
      },
      {
        replace: true,
        preventScrollReset: true,
      }
    );
  }

  // ========================================
  // FILTER AND SORT EXERCISES
  // ========================================

  const filteredExercises = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    const matchingExercises =
      exercises.filter((exercise) => {
        // ----------------------------------
        // SEARCH BY NAME
        // ----------------------------------

        const matchesSearch =
          exercise.name
            .toLowerCase()
            .includes(normalizedSearch);

        // ----------------------------------
        // MUSCLE GROUP
        // ----------------------------------

        const matchesMuscle = matchesPrimaryMuscleFilter(exercise, selectedMuscle);

        // ----------------------------------
        // TRAINING LOCATION
        // ----------------------------------

        const matchesLocation =
          selectedLocation === DEFAULT_FILTER ||
          exercise.locations.includes(selectedLocation) ||
          (
            selectedLocation === "home" &&
            isExerciseAvailable(
              exercise,
              "home",
              homeEquipment
            )
          );

        // ----------------------------------
        // DIFFICULTY
        // ----------------------------------

        const exerciseDifficulty =
          String(
            exercise.difficulty ?? ""
          ).toLowerCase();

        const matchesDifficulty =
          selectedDifficulty === DEFAULT_FILTER ||
          exerciseDifficulty === selectedDifficulty;

        // ----------------------------------
        // EQUIPMENT
        // ----------------------------------

        const matchesEquipment =
          selectedEquipment === DEFAULT_FILTER ||
          exercise.equipment.includes(
            selectedEquipment
          );

        // ----------------------------------
        // EQUIPMENT AVAILABILITY
        // ----------------------------------

        const matchesSetup =
          matchesAvailability(
            exercise,
            selectedAvailability,
            trainingLocation,
            homeEquipment
          );

        return (
          matchesSearch &&
          matchesMuscle &&
          matchesLocation &&
          matchesDifficulty &&
          matchesEquipment &&
          matchesSetup
        );
      });

    // ------------------------------------
    // OPTIONAL SORTING
    // ------------------------------------

    if (selectedSort === "name-asc") {
      return [...matchingExercises].sort(
        (first, second) =>
          first.name.localeCompare(
            second.name,
            "en",
            { sensitivity: "base" }
          )
      );
    }

    if (selectedSort === "name-desc") {
      return [...matchingExercises].sort(
        (first, second) =>
          second.name.localeCompare(
            first.name,
            "en",
            { sensitivity: "base" }
          )
      );
    }

    if (selectedSort === "recommended") {
      return rankExercisesForUser(
        matchingExercises,
        {
          profile,
          isAvailable: (exercise) => {
            if (!profile) return true;

            if (trainingLocation === "both") {
              return (
                isExerciseAvailable(
                  exercise,
                  "gym",
                  homeEquipment
                ) ||
                isExerciseAvailable(
                  exercise,
                  "home",
                  homeEquipment
                )
              );
            }

            return isExerciseAvailable(
              exercise,
              trainingLocation === "gym"
                ? "gym"
                : "home",
              homeEquipment
            );
          },
        }
      ).map((item) => item.exercise);
    }

    return matchingExercises;
  }, [
    searchTerm,
    selectedMuscle,
    selectedLocation,
    selectedDifficulty,
    selectedEquipment,
    selectedAvailability,
    selectedSort,
    trainingLocation,
    homeEquipment,
    profile,
  ]);

  // ========================================
  // PAGINATION
  // ========================================

  const visibleExercises =
    filteredExercises.slice(
      0,
      visibleCount
    );

  const hasMoreExercises =
    visibleExercises.length <
    filteredExercises.length;

  function handleLoadMore() {
    setVisibleCount(
      (previous) =>
        previous + EXERCISES_PER_PAGE
    );
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="exercise-library-page">

      {/* ==================================
          PAGE HEADING
      ================================== */}

      <div className="exercise-page-heading">
        <span className="section-label">
          EXERCISE LIBRARY
        </span>

        <h1>Explore Exercises</h1>

        <p>
          Discover exercises for your goals,
          equipment, and training location.
        </p>
      </div>

      {/* ==================================
          BASIC SEARCH AND FILTERS
      ================================== */}

      <ExerciseFilters
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        selectedMuscle={selectedMuscle}
        onMuscleChange={handleMuscleChange}
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        muscleGroups={muscleGroups}
        onClearFilters={handleClearFilters}
      />

      {/* ==================================
          ADVANCED FILTER PANEL
      ================================== */}

      <details
        style={advancedPanelStyle}
      >
        <summary
          style={advancedSummaryStyle}
        >
          Advanced Filters
          {activeAdvancedFilters > 0 && (
            <span>
              {" "}({activeAdvancedFilters} active)
            </span>
          )}
        </summary>

        {/* ADVANCED FILTER FIELDS */}

        <div style={advancedGridStyle}>

          {/* DIFFICULTY */}

          <div className="filter-field">
            <label htmlFor="difficulty-filter">
              Difficulty
            </label>

            <select
              id="difficulty-filter"
              value={selectedDifficulty}
              onChange={(event) =>
                handleDifficultyChange(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Levels
              </option>

              <option value="beginner">
                Beginner
              </option>

              <option value="intermediate">
                Intermediate
              </option>

              <option value="advanced">
                Advanced
              </option>
            </select>
          </div>

          {/* EQUIPMENT */}

          <div className="filter-field">
            <label htmlFor="equipment-filter">
              Equipment
            </label>

            <select
              id="equipment-filter"
              value={selectedEquipment}
              onChange={(event) =>
                handleEquipmentChange(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Equipment
              </option>

              {equipmentOptions.map(
                (equipment) => (
                  <option
                    key={equipment}
                    value={equipment}
                  >
                    {equipment}
                  </option>
                )
              )}
            </select>
          </div>

          {/* AVAILABILITY */}

          <div className="filter-field">
            <label htmlFor="availability-filter">
              Availability
            </label>

            <select
              id="availability-filter"
              value={selectedAvailability}
              onChange={(event) =>
                handleAvailabilityChange(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Exercises
              </option>

              <option value="home">
                My Home Equipment
              </option>

              <option value="my-setup">
                My Training Setup
              </option>
            </select>
          </div>

          {/* SORT ORDER */}

          <div className="filter-field">
            <label htmlFor="exercise-sort">
              Sort By
            </label>

            <select
              id="exercise-sort"
              value={selectedSort}
              onChange={(event) =>
                handleSortChange(
                  event.target.value
                )
              }
            >
              <option value="recommended">
                Recommended for Me
              </option>

              <option value="catalog">
                Default Catalog Order
              </option>

              <option value="name-asc">
                Name: A to Z
              </option>

              <option value="name-desc">
                Name: Z to A
              </option>
            </select>
          </div>

        </div>

        {/* HELPFUL INFORMATION */}

        <p
          style={{
            margin: "16px 0 0",
            color: "var(--color-text-secondary)",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          My Home Equipment uses the items
          selected in your equipment settings.
          My Training Setup follows your saved
          training location.
          {!profile && (
            <>
              {" "}No training profile is saved,
              so My Training Setup currently
              uses your home equipment.
            </>
          )}
        </p>

        <p
          style={{
            margin: "8px 0 0",
            fontSize: 12,
          }}
        >
          <Link
            to="/settings/equipment"
            style={{
              color: "var(--color-accent)",
              fontWeight: 700,
            }}
          >
            Manage Equipment
          </Link>

          {" · "}

          <Link
            to="/settings/profile"
            style={{
              color: "var(--color-accent)",
              fontWeight: 700,
            }}
          >
            Training Profile
          </Link>
        </p>

        {/* RESET ADVANCED AND BASIC FILTERS */}

        {activeAdvancedFilters > 0 && (
          <button
            type="button"
            className="clear-filters-button"
            onClick={handleClearFilters}
            style={{
              marginTop: 18,
            }}
          >
            Clear All Filters
          </button>
        )}

      </details>

      {/* ==================================
          RESULTS COUNTER
      ================================== */}

      <div
        className="exercise-results"
        aria-live="polite"
        aria-atomic="true"
      >
        <p>
          {filteredExercises.length}
          {" "}exercises found

          {filteredExercises.length > 0 && (
            <>
              {" · Showing "}
              {visibleExercises.length}
              {" "}of {filteredExercises.length}
            </>
          )}
        </p>
      </div>

      {/* ==================================
          EXERCISE RESULTS
      ================================== */}

      {filteredExercises.length > 0 ? (
        <>
          <div className="exercise-library-grid">
            {visibleExercises.map(
              (exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                />
              )
            )}
          </div>

          {/* LOAD MORE */}

          {hasMoreExercises && (
            <div
              style={loadMoreContainerStyle}
            >
              <button
                type="button"
                className="clear-filters-button"
                onClick={handleLoadMore}
              >
                Load More Exercises
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="exercise-empty-state">

          <h2>No Exercises Found</h2>

          <p>
            No exercises match your current
            search and filter selection.
          </p>

          <button
            type="button"
            onClick={handleClearFilters}
          >
            Clear All Filters
          </button>

        </div>
      )}
    </div>
  );
}

export default ExercisesPage;
