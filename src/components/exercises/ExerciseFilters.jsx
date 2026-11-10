
function ExerciseFilters({
  searchTerm,
  onSearchChange,
  selectedMuscle,
  onMuscleChange,
  selectedLocation,
  onLocationChange,
  muscleGroups,
  onClearFilters,
}) {
  return (
    <div className="exercise-filters">
      <div className="filter-field search-field">
        <label htmlFor="exercise-search">
          Search Exercises
        </label>

        <input
          id="exercise-search"
          type="text"
          placeholder="Search by exercise name..."
          value={searchTerm}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
        />
      </div>

      <div className="filter-field">
        <label htmlFor="muscle-filter">
          Muscle Group
        </label>

        <select
          id="muscle-filter"
          value={selectedMuscle}
          onChange={(event) =>
            onMuscleChange(event.target.value)
          }
        >
          <option value="all">All Muscles</option>

          {muscleGroups.map((muscle) => (
            <option key={muscle} value={muscle}>
              {muscle}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="location-filter">
          Training Location
        </label>

        <select
          id="location-filter"
          value={selectedLocation}
          onChange={(event) =>
            onLocationChange(event.target.value)
          }
        >
          <option value="all">All Locations</option>
          <option value="home">At Home</option>
          <option value="gym">At the Gym</option>
        </select>
      </div>

      <button
        className="clear-filters-button"
        type="button"
        onClick={onClearFilters}
      >
        Clear Filters
      </button>
    </div>
  );
}

export default ExerciseFilters;
