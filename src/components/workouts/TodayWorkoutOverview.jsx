
import {
  Link,
  useNavigate,
} from "react-router";

import { exercises } from "../../data/exercises";
import { daysOfWeek } from "../../data/workoutSplits";

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

function getTodayId() {
  const index =
    (new Date().getDay() + 6) % 7;

  return daysOfWeek[index].id;
}

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

  const completedToday =
    Boolean(lastWorkout?.finishedAt) &&
    new Date(
      lastWorkout.finishedAt
    ).toDateString() ===
      new Date().toDateString();

  const completedSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total + exercise.completedSets.length,
      0
    ) ?? 0;

  const plannedSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total + Number(exercise.target.sets),
      0
    ) ?? 0;

  function getExerciseName(exerciseId) {
    return (
      exercises.find(
        (exercise) => exercise.id === exerciseId
      )?.name ?? "Exercise"
    );
  }

  // One click starts the scheduled session.
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

  return (
    <section className="today-home-overview">
      <div className="today-home-card">
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

        {/* Active workout */}
        {activeWorkout ? (
          <>
            <div className="today-home-status">
              <span className="today-home-pulse" />
              Workout in Progress
            </div>

            <h2>
              {activeWorkout.sessionName}
            </h2>

            <p>
              {completedSets} of {plannedSets}
              {" "}sets completed.
            </p>

            <Link
              className="today-home-action"
              to="/workouts/today"
            >
              Continue Workout →
            </Link>
          </>
        ) : completedToday ? (
          <>
            {/* Completed today */}
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
          <>
            {/* No plan */}
            <h2>
              Ready to Build Your Training?
            </h2>

            <p>
              Choose a recommended workout
              plan to get started.
            </p>

            <Link
              className="today-home-action"
              to="/workouts/plans"
            >
              Find My Workout Plan →
            </Link>
          </>
        ) : todaySession ? (
          <>
            {/* Scheduled workout */}
            <h2>
              {todaySession.name}
            </h2>

            <p>
              {appliedPlan.name}
            </p>

            <div className="today-home-exercises">
              {todaySession.exerciseIds
                .slice(0, 5)
                .map((exerciseId) => (
                  <span key={exerciseId}>
                    {getExerciseName(exerciseId)}
                  </span>
                ))}

              {todaySession.exerciseIds.length > 5 && (
                <span>
                  +{todaySession.exerciseIds.length - 5}
                  {" "}more
                </span>
              )}
            </div>

            <button
              type="button"
              className="today-home-action"
              style={{
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onClick={handleStartTodaysWorkout}
              disabled={!todaySession.exerciseIds.length}
            >
              Start Today's Workout →
            </button>
          </>
        ) : (
          <>
            {/* Rest day or schedule mismatch */}
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
