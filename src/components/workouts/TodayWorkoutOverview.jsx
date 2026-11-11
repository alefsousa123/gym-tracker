
import { Link, useNavigate } from "react-router";

import { exercises } from "../../data/exercises";
import { daysOfWeek } from "../../data/workoutSplits";

import ExerciseMotionPreview from
  "../exercises/ExerciseMotionPreview";

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
// EXERCISE CATALOG
// ==========================================

const exerciseCatalog = new Map(
  exercises.map((exercise) => [
    exercise.id,
    exercise,
  ])
);

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
      total + exercise.completedSets.length,
    0
  ) ?? 0;
}

function countPlannedSets(workout) {
  return workout?.exercises.reduce(
    (total, exercise) =>
      total + Number(exercise.target.sets),
    0
  ) ?? 0;
}

// ==========================================
// REUSABLE EXERCISE PREVIEW
// ==========================================

function TodayExercisePreview({ exerciseId }) {
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
        <ExerciseMotionPreview
          exerciseId={exerciseId}
          exerciseName={exerciseName}
          variant="thumbnail"
        />

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
// REUSABLE EXERCISE LIST
// ==========================================

function TodayExerciseList({ exerciseIds }) {
  const previewExercises =
    exerciseIds.slice(0, 5);

  const remainingExercises = Math.max(
    0,
    exerciseIds.length - previewExercises.length
  );

  if (exerciseIds.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="today-home-exercises">
        {previewExercises.map((exerciseId) => (
          <TodayExercisePreview
            key={exerciseId}
            exerciseId={exerciseId}
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

  const { appliedPlan } = useWorkoutPlan();

  const { weeklySchedule } =
    useWeeklySchedule();

  const {
    activeWorkout,
    lastWorkout,
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
    appliedPlan.splitId === weeklySchedule.splitId;

  const todaySession =
    matchingSplit &&
    todaySchedule?.activity === "workout"
      ? appliedPlan.sessions.find(
          (session) =>
            session.id === todaySchedule.sessionId
        )
      : null;

  // ========================================
  // COMPLETED WORKOUT
  // ========================================

  const completedToday =
    Boolean(lastWorkout?.finishedAt) &&
    new Date(
      lastWorkout.finishedAt
    ).toDateString() ===
      new Date().toDateString();

  // ========================================
  // ACTIVE WORKOUT PROGRESS
  // ========================================

  const completedSets =
    countCompletedSets(activeWorkout);

  const plannedSets =
    countPlannedSets(activeWorkout);

  // The active workout is the source of truth
  // when a training session is in progress.
  const activeExerciseIds =
    activeWorkout?.exercises.map(
      (exercise) => exercise.exerciseId
    ) ?? [];

  // When no workout is active, show the
  // exercises scheduled for today.
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

    startWorkout({
      plan: appliedPlan,
      session: todaySession,
      scheduledDayId: todayId,
    });

    navigate("/workouts/today");
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <section className="today-home-overview">
      <div className="today-home-card">

        {/* ==================================
            HEADER
        ================================== */}

        <div className="today-home-header">
          <span>YOUR TRAINING TODAY</span>

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

            {/* NEW: exercises during training */}

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

          /* ==================================
              WORKOUT ALREADY COMPLETED
          ================================== */

          <>
            <div className="today-home-status is-complete">
              ✓{" "}

              {lastWorkout.status === "completed"
                ? "Workout Completed"
                : "Session Saved"}
            </div>

            <h2>
              {lastWorkout.sessionName}
            </h2>

            <p>
              {lastWorkout.totalCompletedSets}
              {" "}sets recorded today.

              {lastWorkout.status === "partial"
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

          /* ==================================
              NO APPLIED PLAN
          ================================== */

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

          /* ==================================
              SCHEDULED WORKOUT
          ================================== */

          <>
            <h2>
              {todaySession.name}
            </h2>

            <p>
              {appliedPlan.name}
            </p>

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

          /* ==================================
              REST / ACTIVE RECOVERY
          ================================== */

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
