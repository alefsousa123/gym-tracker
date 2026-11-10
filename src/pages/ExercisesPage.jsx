
import { useState } from "react";

import ExerciseCard from "../components/exercises/ExerciseCard";
import ExerciseFilters from "../components/exercises/ExerciseFilters";

import { exercises } from "../data/exercises";

function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const muscleGroups = [
    ...new Set(exercises.map((exercise) => exercise.muscleGroup)),
  ].sort();

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = exercise.name
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase());

    const matchesMuscle =
      selectedMuscle === "all" ||
      exercise.muscleGroup === selectedMuscle;

    const matchesLocation =
      selectedLocation === "all" ||
      exercise.locations.includes(selectedLocation);

    return (
      matchesSearch &&
      matchesMuscle &&
      matchesLocation
    );
  });

  function handleClearFilters() {
    setSearchTerm("");
    setSelectedMuscle("all");
    setSelectedLocation("all");
  }

  return (
    <div className="exercise-library-page">
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

      <ExerciseFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedMuscle={selectedMuscle}
        onMuscleChange={setSelectedMuscle}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        muscleGroups={muscleGroups}
        onClearFilters={handleClearFilters}
      />

      <div className="exercise-results">
        <p>
          {filteredExercises.length} exercises found
        </p>
      </div>

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
