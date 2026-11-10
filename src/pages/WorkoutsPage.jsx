
import { Link } from "react-router";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import {
  getSplitById,
} from "../data/workoutSplits";

import "./WeeklySchedulePage.css";

function WorkoutsPage() {
  const { weeklySchedule } = useWeeklySchedule();

  const { appliedPlan } = useWorkoutPlan();

  const {
    activeWorkout,
    lastWorkout,
  } = useWorkoutSession();

  const hasSchedule = weeklySchedule !== null;

  const splitName = hasSchedule
    ? getSplitById(
        weeklySchedule.splitId
      ).name
    : null;

  const workoutCount = hasSchedule
    ? weeklySchedule.days.filter(
        (day) => day.activity === "workout"
      ).length
    : 0;

  const planExerciseCount = appliedPlan
    ? appliedPlan.sessions.reduce(
        (total, session) =>
          total + session.exerciseIds.length,
        0
      )
    : 0;

  const planType = appliedPlan
    ? appliedPlan.source === "custom"
      ? "Custom Plan"
      : appliedPlan.source === "customized"
        ? "Customized Plan"
        : "Recommended Plan"
    : null;

  const completedSessionSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total + exercise.completedSets.length,
      0
    ) ?? 0;

  return (
    <div className="workouts-hub-page">
      <header className="schedule-page-heading">
        <span className="schedule-eyebrow">
          TRAINING
        </span>

        <h1>Workouts</h1>

        <p>
          Start today's training, follow recommended
          programs, customize exercises, and
          organize your weekly schedule.
        </p>
      </header>

      <div className="workouts-hub-grid">
        {/* Today's training */}
        <section className="workouts-hub-card">
          <span className="workouts-hub-tag">
            {activeWorkout
              ? "WORKOUT IN PROGRESS"
              : "AVAILABLE NOW"}
          </span>

          <h2>Today's Workout</h2>

          <p>
            {activeWorkout
              ? `Continue ${activeWorkout.sessionName}. You have recorded ${completedSessionSets} sets.`
              : "Follow your scheduled session, record every set, track your weights, and use the rest timer."}
          </p>

          <Link to="/workouts/today">
            {activeWorkout
              ? "Continue Workout →"
              : "Open Today's Workout →"}
          </Link>
        </section>

        {/* Recommended workout programs */}
        <section className="workouts-hub-card">
          <span className="workouts-hub-tag">
            AVAILABLE NOW
          </span>

          <h2>Recommended Plans</h2>

          <p>
            Discover workout plans based on your
            goals, experience, available equipment,
            and weekly training frequency.
          </p>

          <Link to="/workouts/plans">
            Explore Recommended Plans →
          </Link>
        </section>

        {/* Workout Builder */}
        <section className="workouts-hub-card">
          <span className="workouts-hub-tag">
            AVAILABLE NOW
          </span>

          <h2>Workout Builder</h2>

          <p>
            Create a custom training program,
            choose exercises, and configure
            sets, repetitions, rest, and loads.
          </p>

          <Link to="/workouts/builder">
            Open Workout Builder →
          </Link>
        </section>

        {/* Weekly calendar */}
        <section className="workouts-hub-card">
          <span className="workouts-hub-tag">
            AVAILABLE NOW
          </span>

          <h2>Weekly Schedule</h2>

          <p>
            Organize training sessions, rest days,
            and active recovery throughout
            the week.
          </p>

          <Link to="/workouts/schedule">
            {hasSchedule
              ? "Edit Weekly Schedule →"
              : "Create Weekly Schedule →"}
          </Link>
        </section>
      </div>

      {/* Current program */}
      {appliedPlan && (
        <section className="workouts-hub-summary">
          <h2>My Selected Workout Plan</h2>

          <p>
            {appliedPlan.name}
            {" · "}
            {planType}
            {" · "}
            {planExerciseCount} exercise entries
            {" · "}
            {appliedPlan.location === "home"
              ? "At Home"
              : "At the Gym"}
          </p>

          <Link
            to="/workouts/builder"
            className="schedule-back-link"
            style={{
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
            Customize My Plan →
          </Link>
        </section>
      )}

      {/* Weekly schedule */}
      <section className="workouts-hub-summary">
        <h2>My Weekly Schedule</h2>

        {hasSchedule ? (
          <p>
            Current Split: {splitName}
            {" · "}
            {workoutCount} workout days per week.
          </p>
        ) : (
          <p>
            You have not saved a weekly schedule yet.
            Create one manually or apply a
            recommended workout plan.
          </p>
        )}
      </section>

      {/* Last finished session */}
      {lastWorkout && (
        <section className="workouts-hub-summary">
          <h2>Last Workout</h2>

          <p>
            {lastWorkout.sessionName}
            {" · "}
            {lastWorkout.totalCompletedSets} sets
            recorded
            {" · "}
            {lastWorkout.status === "completed"
              ? "Completed"
              : "Partially Completed"}
          </p>

          <Link
            to="/workouts/today"
            className="schedule-back-link"
            style={{
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
            View Session Summary →
          </Link>
        </section>
      )}
    </div>
  );
}

export default WorkoutsPage;
