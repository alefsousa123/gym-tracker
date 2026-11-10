
import { useMemo, useState } from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router";

import { exercises } from "../data/exercises";

import {
  loadMeasurementOptions,
} from "../utils/workoutTargets";

import ExerciseMotionPreview from "../components/exercises/ExerciseMotionPreview";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import "./WorkoutHistoryPage.css";

// ==========================================
// FORMATTING HELPERS
// ==========================================

function getExercise(exerciseId) {
  return exercises.find(
    (exercise) => exercise.id === exerciseId
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(workout) {
  const start = Date.parse(workout.startedAt);
  const finish = Date.parse(workout.finishedAt);

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(finish) ||
    finish < start
  ) {
    return "Not available";
  }

  const totalMinutes = Math.floor(
    (finish - start) / 60000
  );

  if (totalMinutes < 1) {
    return "Less than 1 min";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? `${hours}h`
    : `${hours}h ${minutes}m`;
}

function getCompletedSets(workout) {
  return workout.exercises.reduce(
    (total, exercise) =>
      total + (exercise.completedSets?.length ?? 0),
    0
  );
}

function getPlannedSets(workout) {
  return workout.exercises.reduce(
    (total, exercise) =>
      total + Number(exercise.target?.sets ?? 0),
    0
  );
}

function getLoggedExercises(workout) {
  return workout.exercises.filter(
    (exercise) =>
      (exercise.completedSets?.length ?? 0) > 0
  ).length;
}

function formatWeight(weight, unit) {
  if (
    weight === null ||
    weight === undefined ||
    weight === ""
  ) {
    return "Not recorded";
  }

  return `${weight} ${unit ?? "kg"}`;
}

function formatSetResult(set) {
  if (set.targetType === "duration") {
    return set.durationSeconds == null
      ? "Not recorded"
      : `${set.durationSeconds} sec`;
  }

  return set.reps == null
    ? "Not recorded"
    : `${set.reps} reps`;
}

function getLoadMeasurement(value) {
  return loadMeasurementOptions.find(
    (option) => option.value === value
  )?.label ?? "External Load";
}

// ==========================================
// WORKOUT HISTORY PAGE
// ==========================================

function WorkoutHistoryPage() {
  const navigate = useNavigate();
  const { workoutId } = useParams();

  const {
    workoutHistory,
    deleteWorkout,
  } = useWorkoutSession();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("all");

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const selectedWorkout = workoutId
    ? workoutHistory.find(
        (workout) => workout.id === workoutId
      )
    : null;

  // ========================================
  // HISTORY STATISTICS
  // ========================================

  const statistics = useMemo(() => {
    return workoutHistory.reduce(
      (totals, workout) => ({
        workouts: totals.workouts + 1,

        completed: totals.completed +
          (workout.status === "completed" ? 1 : 0),

        sets:
          totals.sets + getCompletedSets(workout),

        exercises:
          totals.exercises +
          getLoggedExercises(workout),
      }),
      {
        workouts: 0,
        completed: 0,
        sets: 0,
        exercises: 0,
      }
    );
  }, [workoutHistory]);

  // ========================================
  // FILTERS
  // ========================================

  const filteredWorkouts = useMemo(() => {
    const now = Date.now();

    const searchTerm =
      search.trim().toLowerCase();

    return workoutHistory.filter((workout) => {
      const exerciseNames = workout.exercises
        .map(
          (exercise) =>
            getExercise(exercise.exerciseId)?.name ??
            exercise.exerciseId
        )
        .join(" ");

      const searchableText = [
        workout.sessionName,
        workout.planName,
        exerciseNames,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchTerm === "" ||
        searchableText.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        workout.status === statusFilter;

      let matchesDate = true;

      if (dateFilter !== "all") {
        const days = Number(dateFilter);

        const completedAt =
          Date.parse(workout.finishedAt);

        const age =
          now - completedAt;

        matchesDate =
          Number.isFinite(completedAt) &&
          age >= 0 &&
          age <= days * 24 * 60 * 60 * 1000;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDate
      );
    });
  }, [
    workoutHistory,
    search,
    statusFilter,
    dateFilter,
  ]);

  // ========================================
  // DELETE WITH CONFIRMATION
  // ========================================

  function handleDeleteWorkout() {
    if (!selectedWorkout) {
      return;
    }

    deleteWorkout(selectedWorkout.id);

    setConfirmDelete(false);

    navigate("/workouts/history", {
      replace: true,
    });
  }

  // ========================================
  // DETAIL NOT FOUND
  // ========================================

  if (workoutId && !selectedWorkout) {
    return (
      <main className="workout-history-page">
        <Link
          to="/workouts/history"
          className="wh-back-link"
        >
          ← Back to History
        </Link>

        <section className="wh-panel wh-empty-state">
          <h1>Workout Not Found</h1>

          <p>
            This workout may have been deleted
            or is no longer available.
          </p>

          <Link
            className="wh-primary-link"
            to="/workouts/history"
          >
            View Workout History
          </Link>
        </section>
      </main>
    );
  }

  // ========================================
  // WORKOUT DETAILS
  // ========================================

  if (selectedWorkout) {
    const completedSets =
      getCompletedSets(selectedWorkout);

    const plannedSets =
      getPlannedSets(selectedWorkout);

    return (
      <main className="workout-history-page">
        <Link
          to="/workouts/history"
          className="wh-back-link"
        >
          ← Back to History
        </Link>

        <header className="wh-page-header">
          <span className="wh-eyebrow">
            WORKOUT RECORD
          </span>

          <h1>{selectedWorkout.sessionName}</h1>

          <p>
            {selectedWorkout.planName}
            {" · "}
            {formatDateTime(
              selectedWorkout.finishedAt
            )}
          </p>
        </header>

        {/* Workout summary */}
        <section className="wh-panel">
          <div className="wh-detail-heading">
            <h2>Session Summary</h2>

            <span
              className={
                `wh-status ${
                  selectedWorkout.status === "completed"
                    ? "is-complete"
                    : "is-partial"
                }`
              }
            >
              {selectedWorkout.status === "completed"
                ? "Completed"
                : "Partially Completed"}
            </span>
          </div>

          <div className="wh-stats-grid">
            <div className="wh-stat">
              <span>Completed Sets</span>
              <strong>
                {completedSets}/{plannedSets}
              </strong>
            </div>

            <div className="wh-stat">
              <span>Exercises Logged</span>
              <strong>
                {getLoggedExercises(
                  selectedWorkout
                )}
              </strong>
            </div>

            <div className="wh-stat">
              <span>Session Duration</span>
              <strong>
                {formatDuration(selectedWorkout)}
              </strong>
            </div>
          </div>

          <p className="wh-detail-note">
            Duration measures the time from
            starting to finishing the session,
            including breaks.
          </p>
        </section>

        {/* All recorded exercises */}
        <section className="wh-panel">
          <div className="wh-section-heading">
            <h2>Exercises & Sets</h2>

            <p>
              Actual results recorded during
              this workout.
            </p>
          </div>

          <div className="wh-exercise-list">
            {selectedWorkout.exercises.map(
              (exercise, index) => {
                const exerciseInfo = getExercise(
                  exercise.exerciseId
                );

                const completed =
                  exercise.completedSets?.length ?? 0;

                const planned =
                  Number(exercise.target?.sets ?? 0);

                const loadMeasurement =
                  getLoadMeasurement(
                    exercise.target?.loadMeasurement
                  );

                return (
                  <article
                    key={`${exercise.exerciseId}-${index}`}
                    className="wh-exercise-card"
                  >
                    <div className="wh-exercise-heading">
                      <ExerciseMotionPreview
                        exerciseId={exercise.exerciseId}
                        exerciseName={
                          exerciseInfo?.name ??
                          "Exercise"
                        }
                        variant="thumbnail"
                      />

                      <div className="wh-exercise-title">
                        <strong>
                          {exerciseInfo?.name ??
                            exercise.exerciseId}
                        </strong>

                        <span>
                          {completed} of {planned}
                          {" "}sets recorded
                        </span>

                        {exercise.skipped && (
                          <span className="wh-skipped">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>

                    {completed === 0 ? (
                      <p className="wh-no-sets">
                        No sets recorded.
                      </p>
                    ) : (
                      <>
                        <div className="wh-sets-table">
                          <div className="wh-sets-header">
                            <span>Set</span>
                            <span>Result</span>
                            <span>Weight</span>
                          </div>

                          {exercise.completedSets.map(
                            (set, setIndex) => (
                              <div
                                className="wh-sets-row"
                                key={setIndex}
                              >
                                <span>
                                  {set.setNumber ??
                                    setIndex + 1}
                                </span>

                                <strong>
                                  {formatSetResult(set)}
                                </strong>

                                <span>
                                  {formatWeight(
                                    set.weight,
                                    selectedWorkout.weightUnit
                                  )}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        <p className="wh-load-note">
                          Load recorded as:{" "}
                          {loadMeasurement}
                        </p>
                      </>
                    )}
                  </article>
                );
              }
            )}
          </div>
        </section>

        {/* Delete record */}
        <section className="wh-panel">
          <div className="wh-section-heading">
            <h2>Manage This Record</h2>

            <p>
              Remove an incorrectly recorded
              session from your history.
            </p>
          </div>

          {!confirmDelete ? (
            <button
              type="button"
              className="wh-danger-button"
              onClick={() =>
                setConfirmDelete(true)
              }
            >
              Delete Workout Record
            </button>
          ) : (
            <div className="wh-delete-confirmation">
              <h3>Delete This Workout?</h3>

              <p>
                This removes the session from
                your local history. The action
                cannot be undone.
              </p>

              <div className="wh-button-row">
                <button
                  type="button"
                  className="wh-danger-button"
                  onClick={handleDeleteWorkout}
                >
                  Confirm Delete
                </button>

                <button
                  type="button"
                  className="wh-secondary-button"
                  onClick={() =>
                    setConfirmDelete(false)
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  // ========================================
  // HISTORY LIST
  // ========================================

  return (
    <main className="workout-history-page">
      <Link
        to="/workouts"
        className="wh-back-link"
      >
        ← Back to Workouts
      </Link>

      <header className="wh-page-header">
        <span className="wh-eyebrow">
          YOUR TRAINING
        </span>

        <h1>Workout History</h1>

        <p>
          Review previous sessions, track
          completed sets, and revisit the
          weights you actually used.
        </p>
      </header>

      {/* Overall statistics */}
      <section className="wh-stats-grid wh-overview-stats">
        <div className="wh-stat">
          <span>Total Workouts</span>
          <strong>
            {statistics.workouts}
          </strong>
        </div>

        <div className="wh-stat">
          <span>Sets Logged</span>
          <strong>
            {statistics.sets}
          </strong>
        </div>

        <div className="wh-stat">
          <span>Exercise Entries Logged</span>
          <strong>
            {statistics.exercises}
          </strong>
        </div>
      </section>

      {/* Search and filters */}
      <section className="wh-panel">
        <div className="wh-section-heading">
          <h2>Find a Workout</h2>

          <p>
            Search by workout, program,
            or exercise name.
          </p>
        </div>

        <div className="wh-filters">
          <div className="wh-field">
            <label htmlFor="whSearch">
              Search
            </label>

            <input
              id="whSearch"
              type="search"
              placeholder="Search workouts..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="wh-field">
            <label htmlFor="whStatus">
              Status
            </label>

            <select
              id="whStatus"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="partial">
                Partially Completed
              </option>
            </select>
          </div>

          <div className="wh-field">
            <label htmlFor="whDate">
              Date Range
            </label>

            <select
              id="whDate"
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value)
              }
            >
              <option value="all">
                All Time
              </option>

              <option value="7">
                Last 7 Days
              </option>

              <option value="30">
                Last 30 Days
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* Session list */}
      <section className="wh-panel">
        <div className="wh-list-heading">
          <h2>Previous Workouts</h2>

          <span>
            {filteredWorkouts.length}
            {" "}results
          </span>
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="wh-empty-state">
            <h3>
              {workoutHistory.length === 0
                ? "No Workouts Recorded Yet"
                : "No Matching Workouts"}
            </h3>

            <p>
              {workoutHistory.length === 0
                ? "Finish your first workout to start building your history."
                : "Try changing your search or filters."}
            </p>

            {workoutHistory.length === 0 && (
              <Link
                to="/workouts/today"
                className="wh-primary-link"
              >
                Open Today's Workout
              </Link>
            )}
          </div>
        ) : (
          <div className="wh-workout-list">
            {filteredWorkouts.map((workout) => (
              <Link
                key={workout.id}
                to={`/workouts/history/${encodeURIComponent(workout.id)}`}
                className="wh-workout-item"
              >
                <div className="wh-workout-icon">
                  <span>✓</span>
                </div>

                <div className="wh-workout-info">
                  <strong>
                    {workout.sessionName}
                  </strong>

                  <span>
                    {formatDate(workout.finishedAt)}
                    {" · "}
                    {getCompletedSets(workout)}
                    {" "}sets
                  </span>

                  <small>
                    {workout.planName}
                  </small>
                </div>

                <div className="wh-workout-side">
                  <span
                    className={
                      `wh-status ${
                        workout.status === "completed"
                          ? "is-complete"
                          : "is-partial"
                      }`
                    }
                  >
                    {workout.status === "completed"
                      ? "Completed"
                      : "Partial"}
                  </span>

                  <span className="wh-chevron">
                    ›
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="wh-storage-note">
        Workout history is stored locally
        in this browser. Cloud synchronization
        will be added in a later stage.
      </p>
    </main>
  );
}

export default WorkoutHistoryPage;
