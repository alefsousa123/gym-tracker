
import { Link } from "react-router";

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

import "./ProgressOverview.css";

// ==========================================
// HELPERS
// ==========================================

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

function formatWeek(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function countSets(workout) {
  return (workout.exercises ?? []).reduce(
    (total, exercise) =>
      total +
      (exercise.completedSets?.length ?? 0),
    0
  );
}

// ==========================================
// PROGRESS PAGE
// ==========================================

function ProgressPage() {
  const { profile } =
    useTrainingProfile();

  const { weeklySchedule } =
    useWeeklySchedule();

  const { workoutHistory } =
    useWorkoutSession();

  const weeklyGoal = getWeeklyTrainingGoal(
    profile,
    weeklySchedule
  );

  const stats = getConsistencyStats(
    workoutHistory,
    weeklyGoal
  );

  const totalSets = workoutHistory.reduce(
    (total, workout) =>
      total + countSets(workout),
    0
  );

  const recentWorkouts =
    workoutHistory.slice(0, 5);

  return (
    <main className="gp-page">
      {/* ==================================
          PAGE HEADER
      ================================== */}

      <header className="gp-heading">
        <span className="gp-eyebrow">
          YOUR TRAINING PROGRESS
        </span>

        <h1>My Progress</h1>

        <p>
          Review your training history,
          consistency, and performance
          over time.
        </p>
      </header>

      {/* ==================================
          TRAINING STATISTICS
      ================================== */}

      <section
        className="gp-stats-grid"
        aria-label="Training statistics"
      >
        <article className="gp-stat-card">
          <span>Workouts Logged</span>

          <strong>
            {stats.totalSessions}
          </strong>

          <small>
            Finished training sessions
          </small>
        </article>

        <article className="gp-stat-card">
          <span>Completed Sets</span>

          <strong>
            {totalSets}
          </strong>

          <small>
            Sets recorded across all workouts
          </small>
        </article>

        <article className="gp-stat-card">
          <span>Training Days</span>

          <strong>
            {stats.totalTrainingDays}
          </strong>

          <small>
            Unique days with training
          </small>
        </article>

        <article className="gp-stat-card">
          <span>Best Weekly Streak</span>

          <strong>
            {weeklyGoal !== null
              ? stats.bestStreak
              : "—"}
          </strong>

          <small>
            Consecutive goal weeks
          </small>
        </article>
      </section>

      {/* ==================================
          WEEKLY TRAINING ACTIVITY
      ================================== */}

      <section className="gp-panel">
        <div className="gp-section-heading">
          <div>
            <h2>Weekly Training Activity</h2>

            <p>
              Training days during the
              last eight weeks.
            </p>
          </div>

          <Link to="/progress/consistency">
            Full Analysis
          </Link>
        </div>

        <div className="gp-chart-scroll">
          <div
            className="gp-weekly-chart"
            role="list"
            aria-label="Weekly training activity"
          >
            {stats.weeks.map((week) => {
              const barHeight = weeklyGoal
                ? Math.min(
                    100,
                    (week.days / weeklyGoal) * 100
                  )
                : Math.min(
                    100,
                    (week.days / 7) * 100
                  );

              return (
                <div
                  key={week.key}
                  className="gp-week-column"
                  role="listitem"
                  aria-label={
                    `${formatWeek(week.start)}: ` +
                    `${week.days} training days`
                  }
                >
                  <strong>
                    {week.days}
                  </strong>

                  <div className="gp-week-track">
                    <div
                      className={
                        `gp-week-fill ${
                          week.goalMet
                            ? "is-goal-met"
                            : ""
                        }`
                      }
                      style={{
                        height: `${barHeight}%`,
                      }}
                    />
                  </div>

                  <span>
                    {formatWeek(week.start)}
                  </span>

                  {week.isCurrent && (
                    <small>Now</small>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="gp-chart-note">
          {weeklyGoal !== null
            ? `Weekly target: ${weeklyGoal} training days. The chart measures unique training days, not the number of sessions.`
            : "Configure your weekly training goal to track goal achievement."}
        </p>
      </section>

      {/* ==================================
          PERFORMANCE & PROGRESSION
      ================================== */}

      <section className="gp-panel">
        <div className="gp-section-heading">
          <div>
            <h2>Performance & Progression</h2>

            <p>
              Compare recorded repetitions,
              sets, and weights. Review
              possible progressions without
              automatic load changes.
            </p>
          </div>

          <Link to="/progress/performance">
            View Analysis
          </Link>
        </div>
      </section>

      {/* ==================================
          ANALYSIS TOOLS
      ================================== */}

      <section className="gp-analysis-grid">
        <Link
          to="/progress/charts"
          className="gp-analysis-card"
        >
          <span className="gp-analysis-icon">
            <span aria-hidden="true">
              ↗
            </span>
          </span>

          <strong>Training Charts</strong>

          <p>
            Visualize recorded loads,
            repetitions, and load-volume
            for individual exercises.
          </p>

          <span className="gp-analysis-action">
            Explore Training Charts →
          </span>
        </Link>

        <Link
          to="/progress/history"
          className="gp-analysis-card"
        >
          <span className="gp-analysis-icon">
            <span aria-hidden="true">
              ▤
            </span>
          </span>

          <strong>Workout History</strong>

          <p>
            Review completed sessions,
            exercises, repetitions,
            durations, and actual weights.
          </p>

          <span className="gp-analysis-action">
            Explore History →
          </span>
        </Link>

        <Link
          to="/progress/consistency"
          className="gp-analysis-card"
        >
          <span className="gp-analysis-icon">
            <span aria-hidden="true">
              ✓
            </span>
          </span>

          <strong>
            Consistency & Streaks
          </strong>

          <p>
            Review training frequency,
            weekly goals, and your longest
            streak of consistent weeks.
          </p>

          <span className="gp-analysis-action">
            Explore Consistency →
          </span>
        </Link>

        <Link
          to="/progress/measurements"
          className="gp-analysis-card"
        >
          <span className="gp-analysis-icon">
            <span aria-hidden="true">
              ◫
            </span>
          </span>

          <strong>
            Body Measurements
          </strong>

          <p>
            Save voluntary body measurements
            and compare their changes
            using dated records and charts.
          </p>

          <span className="gp-analysis-action">
            Track Measurements →
          </span>
        </Link>

        <Link
          to="/progress/body-fat"
          className="gp-analysis-card"
        >
          <span className="gp-analysis-icon">
            <span aria-hidden="true">
              %
            </span>
          </span>

          <strong>
            Body Fat Estimator
          </strong>

          <p>
            Calculate an optional,
            approximate body fat percentage
            using tape measurements.
            The estimate is not saved.
          </p>

          <span className="gp-analysis-action">
            Open Estimator →
          </span>
        </Link>
      </section>

      {/* ==================================
          RECENT WORKOUTS
      ================================== */}

      <section className="gp-panel">
        <div className="gp-section-heading">
          <div>
            <h2>Recent Workouts</h2>

            <p>
              Your five most recent
              recorded sessions.
            </p>
          </div>

          <Link to="/progress/history">
            View All
          </Link>
        </div>

        {recentWorkouts.length === 0 ? (
          <div className="gp-empty">
            <strong>
              No training records yet.
            </strong>

            <p>
              Complete your first workout
              to see your activity here.
            </p>

            <Link to="/workouts/today">
              Open Today's Workout
            </Link>
          </div>
        ) : (
          <div className="gp-history-list">
            {recentWorkouts.map(
              (workout) => (
                <Link
                  key={workout.id}
                  to={`/progress/history/${encodeURIComponent(
                    workout.id
                  )}`}
                  className="gp-history-row"
                >
                  <div className="gp-history-info">
                    <strong>
                      {workout.sessionName}
                    </strong>

                    <span>
                      {formatDate(
                        workout.finishedAt
                      )}
                      {" · "}
                      {countSets(workout)}
                      {" "}sets
                    </span>
                  </div>

                  <span
                    className={
                      `gp-history-status ${
                        workout.status === "completed"
                          ? "is-complete"
                          : ""
                      }`
                    }
                  >
                    {workout.status === "completed"
                      ? "Completed"
                      : "Partial"}
                  </span>

                  <span
                    className="gp-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
              )
            )}
          </div>
        )}
      </section>

      <p className="gp-storage-note">
        Training progress is based on
        your locally saved workout records.
        Body measurements are optional
        and stored separately in
        this browser.
      </p>
    </main>
  );
}

export default ProgressPage;
