
import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router";

import { daysOfWeek } from
  "../../data/workoutSplits";

import {
  useWorkoutPlan,
} from "../../context/WorkoutPlanContext";

import {
  useWeeklySchedule,
} from "../../context/WeeklyScheduleContext";

import {
  useWorkoutSession,
} from "../../context/WorkoutSessionContext";

import "./TodayWorkoutOverview.css";

// ==========================================
// LAZY EXERCISE PREVIEW
// ==========================================

// Do not load the image preview component
// until an exercise list is displayed.

const ExerciseMotionPreview = lazy(() =>
  import("../exercises/ExerciseMotionPreview")
);

// ==========================================
// LAZY EXERCISE CATALOG
// ==========================================

let exerciseCatalogPromise = null;

function loadExerciseCatalog() {
  if (!exerciseCatalogPromise) {
    exerciseCatalogPromise = import(
      "../../data/exercises"
    )
      .then(({ exercises }) => {
        return new Map(
          exercises.map((exercise) => [
            exercise.id,
            exercise,
          ])
        );
      })
      .catch((error) => {
        exerciseCatalogPromise = null;
        throw error;
      });
  }

  return exerciseCatalogPromise;
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getTodayId() {
  const index =
    (new Date().getDay() + 6) % 7;

  return daysOfWeek[index].id;
}

function countCompletedSets(workout) {
  return workout?.exercises.reduce(
    (total, exercise) =>
      total +
      (exercise.completedSets?.length ?? 0),
    0
  ) ?? 0;
}

function countPlannedSets(workout) {
  return workout?.exercises.reduce(
    (total, exercise) =>
      total +
      Number(exercise.target?.sets ?? 0),
    0
  ) ?? 0;
}

// ==========================================
// EXERCISE PREVIEW
// ==========================================

function TodayExercisePreview({
  exerciseId,
  exerciseCatalog,
}) {
  const exercise =
    exerciseCatalog.get(exerciseId);

  const exerciseName =
    exercise?.name ?? "Unknown Exercise";

  return (
    <li className="today-home-exercise-item">
      <Link
        to={`/exercises/${exerciseId}`}
        className="today-home-exercise-link"
      >
        <Suspense
          fallback={
            <span
              className="today-home-exercise-preview-loading"
              aria-label="Loading exercise preview"
            >
              🏋️
            </span>
          }
        >
          <ExerciseMotionPreview
            exerciseId={exerciseId}
            exerciseName={exerciseName}
            variant="thumbnail"
          />
        </Suspense>

        <span className="today-home-exercise-info">
          <strong>{exerciseName}</strong>

          <small>
            {exercise?.muscleGroup ?? "Exercise"}
          </small>
        </span>
      </Link>
    </li>
  );
}

// ==========================================
// EXERCISE LIST
// ==========================================

function TodayExerciseList({ exerciseIds }) {
  const [exerciseCatalog, setExerciseCatalog] =
    useState(null);

  const [loadError, setLoadError] =
    useState(false);

  const [retryCount, setRetryCount] =
    useState(0);

  // ========================================
  // LOAD CATALOG ONLY WHEN NEEDED
  // ========================================

  useEffect(() => {
    if (exerciseIds.length === 0) {
      return;
    }

    let isActive = true;

    loadExerciseCatalog()
      .then((catalog) => {
        if (isActive) {
          setExerciseCatalog(catalog);
          setLoadError(false);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to load exercise catalog:",
          error
        );

        if (isActive) {
          setLoadError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    exerciseIds.length,
    retryCount,
  ]);

  if (exerciseIds.length === 0) {
    return null;
  }

  const previewExercises =
    exerciseIds.slice(0, 5);

  const remainingExercises = Math.max(
    0,
    exerciseIds.length -
      previewExercises.length
  );

  // ========================================
  // LOADING
  // ========================================

  if (!exerciseCatalog && !loadError) {
    return (
      <p
        className="today-home-more-count"
        role="status"
      >
        Loading exercise previews...
      </p>
    );
  }

  // ========================================
  // ERROR
  // ========================================

  if (!exerciseCatalog && loadError) {
    return (
      <div>
        <p className="today-home-more-count">
          Exercise previews are temporarily
          unavailable.
        </p>

        <button
          type="button"
          className="today-home-secondary-action"
          onClick={() => {
            setLoadError(false);

            setRetryCount(
              (previous) => previous + 1
            );
          }}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // ========================================
  // PREVIEWS
  // ========================================

  return (
    <>
      <ul className="today-home-exercises">
        {previewExercises.map((exerciseId) => (
          <TodayExercisePreview
            key={exerciseId}
            exerciseId={exerciseId}
            exerciseCatalog={exerciseCatalog}
          />
        ))}
      </ul>

      {remainingExercises > 0 && (
        <p className="today-home-more-count">
          +{remainingExercises} more{" "}
          {remainingExercises === 1
            ? "exercise"
            : "exercises"} in this session
        </p>
      )}
    </>
  );
}

// ==========================================
// TODAY WORKOUT OVERVIEW
// ==========================================

function TodayWorkoutOverview() {
  const navigate = useNavigate();

  const { appliedPlan } =
    useWorkoutPlan();

  const { weeklySchedule } =
    useWeeklySchedule();

  const {
    activeWorkout,
    todayWorkout,
    startWorkout,
  } = useWorkoutSession();

  // ========================================
  // TODAY'S SCHEDULE
  // ========================================

  const todayId = getTodayId();

  const todaySchedule =
    weeklySchedule?.days.find(
      (day) => day.dayId === todayId
    );

  const matchingSplit =
    Boolean(appliedPlan && weeklySchedule) &&
    appliedPlan.splitId ===
      weeklySchedule.splitId;

  const todaySession =
    matchingSplit &&
    todaySchedule?.activity === "workout"
      ? appliedPlan.sessions.find(
          (session) =>
            session.id ===
            todaySchedule.sessionId
        )
      : null;

  // ========================================
  // COMPLETED WORKOUT
  // ========================================

  const completedToday = Boolean(todayWorkout);

  // ========================================
  // ACTIVE WORKOUT PROGRESS
  // ========================================

  const completedSets =
    countCompletedSets(activeWorkout);

  const plannedSets =
    countPlannedSets(activeWorkout);

  const activeExerciseIds =
    activeWorkout?.exercises.map(
      (exercise) => exercise.exerciseId
    ) ?? [];

  const scheduledExerciseIds =
    todaySession?.exerciseIds ?? [];

  // ========================================
  // START TODAY'S WORKOUT
  // ========================================

  function handleStartTodaysWorkout() {
    if (
      activeWorkout ||
      !appliedPlan ||
      !todaySession?.exerciseIds?.length
    ) {
      return;
    }

    const started = startWorkout({
      plan: appliedPlan,
      session: todaySession,
      scheduledDayId: todayId,
    });

    if (started) {
      navigate("/workouts/today");
    }
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="today-home-overview">
      <div className="today-home-card">

        {/* HEADER */}

        <div className="today-home-header">
          <span>
            YOUR TRAINING TODAY
          </span>

          <span className="today-home-date">
            {new Intl.DateTimeFormat(
              "en-US",
              {
                weekday: "short",
                month: "short",
                day: "numeric",
              }
            ).format(new Date())}
          </span>
        </div>

        {/* ==================================
            WORKOUT IN PROGRESS
        ================================== */}

        {activeWorkout ? (
          <>
            <div className="today-home-status">
              <span
                className="today-home-pulse"
                aria-hidden="true"
              />

              Workout in Progress
            </div>

            <h2>
              {activeWorkout.sessionName}
            </h2>

            <p>
              {completedSets} of {plannedSets}
              {" "}sets completed.
            </p>

            <TodayExerciseList
              exerciseIds={activeExerciseIds}
            />

            <Link
              className="today-home-action"
              to="/workouts/today"
            >
              Continue Workout →
            </Link>
          </>

        ) : completedToday ? (

          /* COMPLETED WORKOUT */

          <>
            <div className="today-home-status is-complete">
              ✓{" "}

              {todayWorkout.status === "completed"
                ? "Workout Completed"
                : "Session Saved"}
            </div>

            <h2>{todayWorkout.sessionName}</h2>

            <p>
              {todayWorkout.totalCompletedSets}
              {" "}sets recorded today.

              {todayWorkout.status === "partial"
                ? " This session was partially completed."
                : " Great work showing up!"}
            </p>

            <Link
              className="today-home-secondary-action"
              to="/workouts/today"
            >
              View Session Summary →
            </Link>
          </>

        ) : !appliedPlan ? (

          /* NO APPLIED PLAN */

          <>
            <h2>
              Ready to Build Your Training?
            </h2>

            <p>
              Choose a recommended workout plan
              to get started.
            </p>

            <Link
              className="today-home-action"
              to="/workouts/plans"
            >
              Find My Workout Plan →
            </Link>
          </>

        ) : todaySession ? (

          /* SCHEDULED WORKOUT */

          <>
            <h2>{todaySession.name}</h2>

            <p>{appliedPlan.name}</p>

            <TodayExerciseList
              exerciseIds={scheduledExerciseIds}
            />

            <button
              type="button"
              className="today-home-action"
              onClick={handleStartTodaysWorkout}
              disabled={!scheduledExerciseIds.length}
            >
              Start Today's Workout →
            </button>
          </>

        ) : (

          /* REST DAY */

          <>
            <div className="today-home-status">
              Rest & Recovery
            </div>

            <h2>
              {matchingSplit
                ? todaySchedule?.activity ===
                    "active-recovery"
                  ? "Active Recovery Day"
                  : "Rest Day"
                : "Your Workout Plan"}
            </h2>

            <p>
              {matchingSplit
                ? "Recovery is part of a sustainable training routine."
                : "Your plan is ready. Choose a session when you want to train."}
            </p>

            <Link
              className="today-home-secondary-action"
              to="/workouts/today"
            >
              View My Workouts →
            </Link>
          </>
        )}

      </div>
    </section>
  );
}

export default TodayWorkoutOverview;
