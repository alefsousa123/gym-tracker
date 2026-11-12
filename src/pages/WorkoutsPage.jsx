
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

// ==========================================
// WORKOUTS HUB PAGE
// ==========================================

function WorkoutsPage() {
  const { weeklySchedule } =
    useWeeklySchedule();

  const { appliedPlan } =
    useWorkoutPlan();

  const { activeWorkout } =
    useWorkoutSession();

  const hasSchedule =
    weeklySchedule !== null;

  const splitName = hasSchedule
    ? getSplitById(
        weeklySchedule.splitId
      )?.name ?? "Custom Split"
    : null;

  const workoutDays = hasSchedule
    ? weeklySchedule.days.filter(
        (day) =>
          day.activity === "workout"
      ).length
    : 0;

  const planExerciseCount = appliedPlan
    ? appliedPlan.sessions.reduce(
        (total, session) =>
          total +
          session.exerciseIds.length,
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

  const activeCompletedSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total +
        (exercise.completedSets?.length ?? 0),
      0
    ) ?? 0;

  return (
    <main className="workouts-hub-page">

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <header className="schedule-page-heading">
        <span className="schedule-eyebrow">
          TRAINING MANAGEMENT
        </span>

        <h1>Workouts</h1>

        <p>
          Plan your weekly training,
          choose your exercises, and
          complete your workout sessions.
        </p>
      </header>

      {/* ==================================
          MAIN NAVIGATION CARDS
      ================================== */}

      <div className="workouts-hub-grid">

        {/* TODAY'S WORKOUT */}

        <Link
          to="/workouts/today"
          className="workouts-hub-card"
        >
          <span className="workouts-hub-tag">
            {activeWorkout
              ? "IN PROGRESS"
              : "TRAINING"}
          </span>

          <h2>Today's Workout</h2>

          <p>
            {activeWorkout
              ? `Continue ${activeWorkout.sessionName}. You have recorded ${activeCompletedSets} sets.`
              : "Follow your scheduled session, confirm sets, record actual weights, and use the exercise and rest timers."}
          </p>

          <span className="workouts-hub-action">
            {activeWorkout
              ? "Continue Workout"
              : "Open Today's Workout"}
            {" →"}
          </span>
        </Link>

        {/* WORKOUT BUILDER */}

        <Link
          to="/workouts/builder"
          className="workouts-hub-card"
        >
          <span className="workouts-hub-tag">
            CUSTOMIZATION
          </span>

          <h2>Workout Builder</h2>

          <p>
            Create your own workout
            program. Choose exercises
            and configure sets,
            repetitions, rest periods,
            and manual weights.
          </p>

          <span className="workouts-hub-action">
            Open Workout Builder →
          </span>
        </Link>

        {/* RECOMMENDED PLANS */}

        <Link
          to="/workouts/plans"
          className="workouts-hub-card"
        >
          <span className="workouts-hub-tag">
            PLANNING
          </span>

          <h2>Recommended Plans</h2>

          <p>
            Explore workout programs
            based on your goals,
            experience level,
            available equipment,
            and schedule.
          </p>

          <span className="workouts-hub-action">
            Explore Recommended Plans →
          </span>
        </Link>

        {/* WEEKLY SCHEDULE */}

        <Link
          to="/workouts/schedule"
          className="workouts-hub-card"
        >
          <span className="workouts-hub-tag">
            SCHEDULE
          </span>

          <h2>Weekly Schedule</h2>

          <p>
            Organize workout days,
            training sessions, rest
            days, and active recovery
            throughout the week.
          </p>

          <span className="workouts-hub-action">
            {hasSchedule
              ? "Edit Weekly Schedule"
              : "Create Weekly Schedule"}
            {" →"}
          </span>
        </Link>

      </div>

      {/* ==================================
          CURRENT TRAINING PROGRAM
      ================================== */}

      {appliedPlan && (
        <section className="workouts-hub-summary">
          <h2>Current Workout Program</h2>

          <p>
            {appliedPlan.name}
            {" · "}
            {planType}
            {" · "}
            {appliedPlan.sessions.length}
            {" "}sessions
            {" · "}
            {planExerciseCount}
            {" "}exercise entries
          </p>

          <Link
            to="/workouts/builder"
            className="schedule-back-link"
            style={{
              marginTop: "12px",
              marginBottom: 0,
            }}
          >
            Customize Current Program →
          </Link>
        </section>
      )}

      {/* ==================================
          WEEKLY SCHEDULE SUMMARY
      ================================== */}

      <section className="workouts-hub-summary">
        <h2>Current Weekly Schedule</h2>

        {hasSchedule ? weeklySchedule.mode === 'rolling' ? (
            <p>
              {splitName}{' · '}
              {weeklySchedule.rolling.trainingDays} training days +{' '}
              {weeklySchedule.rolling.restDays} rest days (continuous rotation)
            </p>
          ) : (
          <p>
            {splitName}
            {" · "}
            {workoutDays}
            {" "}
            {workoutDays === 1
              ? "workout day"
              : "workout days"}
            {" "}per week
          </p>
        ) : (
          <p>
            No weekly schedule saved yet.
            You can create one or apply
            a recommended workout plan.
          </p>
        )}

        <Link
          to="/workouts/schedule"
          className="schedule-back-link"
          style={{
            marginTop: "12px",
            marginBottom: 0,
          }}
        >
          View Weekly Schedule →
        </Link>
      </section>

    </main>
  );
}

export default WorkoutsPage;
