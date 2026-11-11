
import { useSearchParams } from "react-router";

import ExerciseCard from
  "../components/exercises/ExerciseCard";

import ExerciseFilters from
  "../components/exercises/ExerciseFilters";

import { exercises } from "../data/exercises";

// Styles specific to this page
import "./ExercisesPage.css";

// ==========================================
// FILTER CONSTANTS
// ==========================================

const DEFAULT_FILTER = "all";

// ==========================================
// AVAILABLE MUSCLE GROUPS
// ==========================================

const muscleGroups = [
  ...new Set(
    exercises.map(
      (exercise) => exercise.muscleGroup
    )
  ),
].sort();

// ==========================================
// EXERCISES PAGE
// ==========================================

function ExercisesPage() {
  // ========================================
  // URL SEARCH PARAMETERS
  // ========================================

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  // ========================================
  // READ FILTERS FROM URL
  // ========================================

  const searchTerm =
    searchParams.get("search") ?? "";

  const muscleParam =
    searchParams.get("muscle") ??
    DEFAULT_FILTER;

  const locationParam =
    searchParams.get("location") ??
    DEFAULT_FILTER;

  // Validate URL values before using them.
  const selectedMuscle =
    muscleGroups.includes(muscleParam)
      ? muscleParam
      : DEFAULT_FILTER;

  const selectedLocation =
    ["home", "gym"].includes(locationParam)
      ? locationParam
      : DEFAULT_FILTER;

  // ========================================
  // UPDATE A SINGLE URL FILTER
  // ========================================

  function updateFilter(name, value) {
    setSearchParams(
      (previousParams) => {
        const nextParams = new URLSearchParams(
          previousParams
        );

        const shouldRemove =
          value === "" ||
          value === DEFAULT_FILTER;

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
  // SEARCH HANDLER
  // ========================================

  function handleSearchChange(value) {
    updateFilter("search", value);
  }

  // ========================================
  // MUSCLE FILTER HANDLER
  // ========================================

  function handleMuscleChange(value) {
    updateFilter("muscle", value);
  }

  // ========================================
  // LOCATION FILTER HANDLER
  // ========================================

  function handleLocationChange(value) {
    updateFilter("location", value);
  }

  // ========================================
  // FILTER EXERCISES
  // ========================================

  const filteredExercises = exercises.filter(
    (exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(
          searchTerm.trim().toLowerCase()
        );

      const matchesMuscle =
        selectedMuscle === DEFAULT_FILTER ||
        exercise.muscleGroup === selectedMuscle;

      const matchesLocation =
        selectedLocation === DEFAULT_FILTER ||
        exercise.locations.includes(
          selectedLocation
        );

      return (
        matchesSearch &&
        matchesMuscle &&
        matchesLocation
      );
    }
  );

  // ========================================
  // RESET FILTERS
  // ========================================

  function handleClearFilters() {
    setSearchParams(
      (previousParams) => {
        const nextParams = new URLSearchParams(
          previousParams
        );

        nextParams.delete("search");
        nextParams.delete("muscle");
        nextParams.delete("location");

        return nextParams;
      },
      {
        replace: true,
        preventScrollReset: true,
      }
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
          SEARCH AND FILTERS
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
          RESULTS COUNTER
      ================================== */}

      <div className="exercise-results">
        <p>
          {filteredExercises.length}
          {" "}exercises found
        </p>
      </div>

      {/* ==================================
          EXERCISE RESULTS
      ================================== */}

      {filteredExercises.length > 0 ? (
        <div className="exercise-library-grid">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
            />
          ))}
        </div>
      ) : (
        <div className="exercise-empty-state">

          <h2>No Exercises Found</h2>

          <p>
            Try changing your search or filters.
          </p>

          <button
            type="button"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>

        </div>
      )}
    </div>
  );
}

export default ExercisesPage;
