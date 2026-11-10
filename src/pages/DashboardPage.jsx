
import { Link } from "react-router";

import TodayWorkoutOverview from "../components/workouts/TodayWorkoutOverview";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import {
  getWeeklyTrainingGoal,
  getConsistencyStats,
} from "../utils/consistencyMetrics";

import "./DashboardOverview.css";

// Format the date of a completed workout.
function formatWorkoutDate(dateString) {
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

// Count sets actually recorded.
function countCompletedSets(workout) {
  return (workout.exercises ?? []).reduce(
    (total, exercise) =>
      total +
      (exercise.completedSets?.length ?? 0),
    0
  );
}

function DashboardPage() {
  const { profile } = useTrainingProfile();

  const { weeklySchedule } =
    useWeeklySchedule();

  const {
    activeWorkout,
    workoutHistory,
  } = useWorkoutSession();

  const weeklyGoal = getWeeklyTrainingGoal(
    profile,
    weeklySchedule
  );

  const consistency = getConsistencyStats(
    workoutHistory,
    weeklyGoal
  );

  const recentWorkouts =
    workoutHistory.slice(0, 3);

  const activeSets =
    activeWorkout
      ? countCompletedSets(activeWorkout)
      : 0;

  return (
    <main className="gd-page">
      {/* ==================================
          DASHBOARD HEADING
      ================================== */}

      <header className="gd-heading">
        <span className="gd-eyebrow">
          YOUR FITNESS OVERVIEW
        </span>

        <h1>Dashboard</h1>

        <p>
          Your workout for today,
          weekly activity, and recent
          training progress in one place.
        </p>
      </header>

      {/* ==================================
          TODAY'S WORKOUT
      ================================== */}

      <TodayWorkoutOverview />

      {/* ==================================
          QUICK STATISTICS
      ================================== */}

      <section
        className="gd-stats-grid"
        aria-label="Training overview"
      >
        <article className="gd-stat-card">
          <span>Weekly Goal</span>

          <strong>
            {weeklyGoal !== null
              ? `${consistency.currentWeek.days}/${weeklyGoal}`
              : "—"}
          </strong>

          <small>
            {weeklyGoal !== null
              ? "Training days this week"
              : "Set a weekly goal"}
          </small>

          {weeklyGoal !== null && (
            <div
              className="gd-progress-track"
              role="progressbar"
              aria-label="Weekly training goal"
              aria-valuemin={0}
              aria-valuemax={weeklyGoal}
              aria-valuenow={Math.min(
                consistency.currentWeek.days,
                weeklyGoal
              )}
            >
              <div
                style={{
                  width:
                    `${consistency.currentWeek.progressPercent}%`,
                }}
              />
            </div>
          )}
        </article>

        <article className="gd-stat-card">
          <span>Weekly Streak</span>

          <strong>
            {weeklyGoal !== null
              ? consistency.currentStreak
              : "—"}
          </strong>

          <small>
            {weeklyGoal !== null
              ? "Consecutive weeks on target"
              : "Goal not configured"}
          </small>
        </article>

        <article className="gd-stat-card">
          <span>Completed Sessions</span>

          <strong>
            {consistency.totalSessions}
          </strong>

          <small>
            Workouts saved in your history
          </small>
        </article>
      </section>

      {/* ==================================
          RECENT ACTIVITY
      ================================== */}

      <section className="gd-panel">
        <div className="gd-section-heading">
          <div>
            <h2>Recent Activity</h2>

            <p>
              Your latest recorded training
              sessions.
            </p>
          </div>

          <Link to="/workouts/history">
            View All
          </Link>
        </div>

        {recentWorkouts.length === 0 ? (
          <div className="gd-empty">
            <p>
              No completed workouts yet.
            </p>

            <span>
              Finish a workout to start
              building your training history.
            </span>

            <Link to="/workouts/today">
              Start Training
            </Link>
          </div>
        ) : (
          <div className="gd-recent-list">
            {recentWorkouts.map((workout) => (
              <Link
                key={workout.id}
                to={`/workouts/history/${encodeURIComponent(workout.id)}`}
                className="gd-recent-item"
              >
                <div className="gd-recent-icon">
                  <span>
                    {workout.status === "completed"
                      ? "✓"
                      : "·"}
                  </span>
                </div>

                <div className="gd-recent-details">
                  <strong>
                    {workout.sessionName}
                  </strong>

                  <span>
                    {formatWorkoutDate(
                      workout.finishedAt
                    )}
                    {" · "}
                    {countCompletedSets(workout)}
                    {" "}sets
                  </span>
                </div>

                <span className="gd-recent-status">
                  {workout.status === "completed"
                    ? "Completed"
                    : "Partial"}
                </span>

                <span
                  className="gd-chevron"
                  aria-hidden="true"
                >
                  ›
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ==================================
          QUICK ACCESS
      ================================== */}

      <section className="gd-panel">
        <div className="gd-section-heading">
          <div>
            <h2>Quick Access</h2>

            <p>
              Continue where you need to go.
            </p>
          </div>
        </div>

        <div className="gd-shortcuts">
          <Link
            to={
              activeWorkout
                ? "/workouts/today"
                : "/workouts"
            }
            className="gd-shortcut"
          >
            <strong>
              {activeWorkout
                ? "Continue Workout"
                : "Manage Workouts"}
            </strong>

            <span>
              {activeWorkout
                ? `${activeSets} sets recorded so far`
                : "Your plans and weekly schedule"}
            </span>
          </Link>

          <Link
            to="/progress"
            className="gd-shortcut"
          >
            <strong>
              View My Progress
            </strong>

            <span>
              History, consistency,
              and training activity
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
