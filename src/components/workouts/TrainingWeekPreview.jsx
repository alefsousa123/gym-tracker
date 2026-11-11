
import { Link } from "react-router";

import { exercises } from "../../data/exercises";

import {
  daysOfWeek,
  getSplitById,
} from "../../data/workoutSplits";

import {
  useTrainingProfile,
} from "../../context/TrainingProfileContext";

import {
  useWeeklySchedule,
} from "../../context/WeeklyScheduleContext";

import {
  useWorkoutPlan,
} from "../../context/WorkoutPlanContext";

import ExerciseMotionPreview from
  "../exercises/ExerciseMotionPreview";

import "./TrainingWeekPreview.css";

// ==========================================
// EXERCISE LOOKUP
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
  const dayIndex =
    (new Date().getDay() + 6) % 7;

  return daysOfWeek[dayIndex].id;
}

function getActivityLabel(activity) {
  if (activity === "workout") {
    return "Workout";
  }

  if (activity === "active-recovery") {
    return "Active Recovery";
  }

  return "Rest Day";
}

// ==========================================
// EXERCISE ROW
// ==========================================

function TrainingWeekExercise({ exerciseId }) {
  const exercise = exerciseCatalog.get(exerciseId);

  const name = exercise?.name ?? "Unknown Exercise";

  return (
    <li className="twp-exercise-item">
      <Link
        to={`/exercises/${exerciseId}`}
        className="twp-exercise-link"
      >
        <ExerciseMotionPreview
          exerciseId={exerciseId}
          exerciseName={name}
          variant="thumbnail"
        />

        <span className="twp-exercise-information">
          <strong>{name}</strong>

          <small>
            {exercise?.muscleGroup ?? "Exercise"}
          </small>
        </span>
      </Link>
    </li>
  );
}

// ==========================================
// TRAINING WEEK PREVIEW
// ==========================================

function TrainingWeekPreview() {
  const { profile } = useTrainingProfile();

  const { weeklySchedule } = useWeeklySchedule();

  const { appliedPlan } = useWorkoutPlan();

  const todayId = getTodayId();

  // ========================================
  // SAVED SCHEDULE INFORMATION
  // ========================================

  const workoutCount =
    weeklySchedule?.days.filter(
      (day) => day.activity === "workout"
    ).length ?? 0;

  const profileDays =
    Number(profile?.trainingDaysPerWeek);

  const frequencyMismatch =
    Boolean(profile) &&
    Number.isFinite(profileDays) &&
    profileDays !== workoutCount;

  // ========================================
  // PLAN COMPATIBILITY
  // ========================================

  const planMatchesSplit =
    Boolean(appliedPlan && weeklySchedule) &&
    appliedPlan.splitId === weeklySchedule.splitId;

  const split = weeklySchedule
    ? getSplitById(weeklySchedule.splitId)
    : null;

  // ========================================
  // PAGE SECTION
  // ========================================

  return (
    <section
      className="training-week-preview"
      aria-labelledby="trainingWeekHeading"
    >
      <header className="twp-header">
        <div>
          <span className="twp-eyebrow">
            YOUR TRAINING WEEK
          </span>

          <h2 id="trainingWeekHeading">
            Weekly Schedule
          </h2>

          <p>
            A quick overview of your saved
            training days, sessions, and exercises.
          </p>
        </div>

        <Link
          to="/workouts/schedule"
          className="twp-edit-link"
        >
          {weeklySchedule
            ? "Edit Weekly Schedule →"
            : "Create Weekly Schedule →"}
        </Link>
      </header>

      {/* ==================================
          NO SAVED SCHEDULE
      ================================== */}

      {!weeklySchedule ? (
        <div className="twp-empty-state">
          <strong>
            No weekly schedule saved yet.
          </strong>

          <p>
            Create your training week to organize
            workout days, rest, and recovery.
          </p>

          <Link to="/workouts/schedule">
            Create Your Schedule →
          </Link>
        </div>
      ) : (
        <>
          {/* ==================================
              SCHEDULE SUMMARY
          ================================== */}

          <div className="twp-summary">
            <span>
              {split?.name ?? "Training Split"}
            </span>

            <strong>
              {workoutCount}
              {" "}
              {workoutCount === 1
                ? "workout day"
                : "workout days"}
              {" "}per week
            </strong>
          </div>

          {/* ==================================
              INFORMATION MESSAGES
          ================================== */}

          {frequencyMismatch && (
            <p className="twp-notice">
              Your saved schedule contains
              {" "}{workoutCount} workout days,
              while your saved Training Profile
              specifies {profileDays}.
              Review your weekly schedule if
              you want these to match.
            </p>
          )}

          {appliedPlan && !planMatchesSplit && (
            <p className="twp-notice">
              Your current workout plan uses a
              different split. Exercise previews
              are hidden until the plan and
              schedule use the same split.
            </p>
          )}

          {!appliedPlan && (
            <p className="twp-note">
              You can choose a workout program
              to display exercises inside
              your training days.
            </p>
          )}

          {/* ==================================
              DAYS OF THE WEEK
          ================================== */}

          <div className="twp-days">
            {daysOfWeek.map((weekDay) => {
              const day = weeklySchedule.days.find(
                (item) =>
                  item.dayId === weekDay.id
              );

              if (!day) {
                return null;
              }

              const isToday =
                weekDay.id === todayId;

              const isWorkout =
                day.activity === "workout";

              // Find the matching applied session.
              const planSession =
                isWorkout && planMatchesSplit
                  ? appliedPlan.sessions.find(
                      (session) =>
                        session.id === day.sessionId
                    )
                  : null;

              // Find the session label in the split.
              const splitSession =
                split?.sessions.find(
                  (session) =>
                    session.id === day.sessionId
                );

              const sessionName =
                planSession?.name ??
                splitSession?.label ??
                "Unassigned Session";

              const exerciseIds =
                planSession?.exerciseIds ?? [];

              const firstExercises =
                exerciseIds.slice(0, 2);

              const otherExercises =
                exerciseIds.slice(2);

              return (
                <article
                  key={weekDay.id}
                  className={
                    `twp-day is-${day.activity} ${
                      isToday ? "is-today" : ""
                    }`
                  }
                >
                  {/* Day heading */}

                  <div className="twp-day-heading">
                    <h3>{weekDay.label}</h3>

                    {isToday && (
                      <span className="twp-today">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Day activity */}

                  <span className="twp-activity">
                    {getActivityLabel(day.activity)}
                  </span>

                  {/* Workout details */}

                  {isWorkout ? (
                    <div className="twp-day-content">
                      <strong className="twp-session-name">
                        {sessionName}
                      </strong>

                      {exerciseIds.length > 0 && (
                        <div className="twp-exercises">
                          <ul className="twp-exercise-list">
                            {firstExercises.map(
                              (exerciseId) => (
                                <TrainingWeekExercise
                                  key={exerciseId}
                                  exerciseId={exerciseId}
                                />
                              )
                            )}
                          </ul>

                          {otherExercises.length > 0 && (
                            <details className="twp-more">
                              <summary>
                                Show{" "}
                                {otherExercises.length}
                                {" "}more exercises
                              </summary>

                              <ul className="twp-exercise-list">
                                {otherExercises.map(
                                  (exerciseId) => (
                                    <TrainingWeekExercise
                                      key={exerciseId}
                                      exerciseId={exerciseId}
                                    />
                                  )
                                )}
                              </ul>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="twp-day-note">
                      {day.activity === "rest"
                        ? "Rest and recover."
                        : "Light movement or mobility."}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {/* ==================================
              FOOTER INFORMATION
          ================================== */}

          <p className="twp-footer-note">
            This is your saved schedule.
            To change the days or sessions,
            select Edit Weekly Schedule.
            Changes to your Training Profile
            do not automatically overwrite
            your calendar.
          </p>
        </>
      )}
    </section>
  );
}

export default TrainingWeekPreview;
