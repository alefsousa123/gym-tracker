
import { useMemo } from "react";
import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

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

import { getRollingAdherenceStats } from '../utils/rollingTrainingIntegration';
import "./ConsistencyPage.css";

// ==========================================
// DATE FORMATTING
// ==========================================

// Display dates in the same language as the app.
function formatShortDate(date) {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  ).format(date);
}

function formatWeekRange(startDate) {
  const endDate = new Date(startDate);

  endDate.setDate(
    endDate.getDate() + 6
  );

  return (
    `${formatShortDate(startDate)} – ` +
    formatShortDate(endDate)
  );
}

// ==========================================
// WEEK STATUS
// ==========================================

function getWeekStatus(week, goal) {
  if (week.beforeHistory) {
    return "Not Tracked";
  }

  if (goal === null) {
    return "No Goal Set";
  }

  if (week.goalMet) {
    return "Goal Reached";
  }

  if (week.isCurrent) {
    return "In Progress";
  }

  return "Below Target";
}

// ==========================================
// MAIN PAGE
// ==========================================

function ConsistencyPage() {
  const { profile } =
    useTrainingProfile();

  const { weeklySchedule } =
    useWeeklySchedule();

  const { workoutHistory } =
    useWorkoutSession();

  // Use saved preferences instead of
  // inventing a target for the user.
  const weeklyGoal = getWeeklyTrainingGoal(
    profile,
    weeklySchedule
  );

  // Derive consistency from actual workout history.
  // No separate streak state needs to be stored.
  const stats = useMemo(
    () =>
      getConsistencyStats(
        workoutHistory,
        weeklyGoal
      ),
    [workoutHistory, weeklyGoal]
  );

  const goalIsSet = stats.goal !== null;

  const currentGoalReached =
    goalIsSet &&
    stats.currentWeek.goalMet;

  const recentWeeksLabel =
    stats.recentWeekCount > 0 &&
    goalIsSet
      ? `${stats.recentGoalWeeks}/${stats.recentWeekCount}`
      : "—";


  const rollingStats = useMemo(
    () => getRollingAdherenceStats(workoutHistory, weeklySchedule),
    [workoutHistory, weeklySchedule]
  );

  if (weeklySchedule?.mode === 'rolling') {
    return (
      <main className="consistency-page">
        <BackToPreviousPage fallbackTo="/workouts" fallbackLabel="Workouts" className="cs-back-link" />
        <header className="cs-page-header">
          <span className="cs-eyebrow">TRAINING PROGRESS</span>
          <h1>Consistency &amp; Streaks</h1>
          <p>Your rolling cycle is measured by scheduled workout opportunities, not by fixed calendar weeks.</p>
        </header>
        {!rollingStats ? (
          <section className="cs-panel"><p>The rolling cycle needs a valid configuration.</p><Link to="/workouts/schedule">Review Your Schedule</Link></section>
        ) : (
          <>
            <section className="cs-panel">
              <div className="cs-section-header"><div><span className="cs-eyebrow">ROLLING TRAINING CYCLE</span><h2>Training &amp; Recovery</h2></div></div>
              <p>{rollingStats.trainingDays} training days + {rollingStats.restDays} rest days, continuously repeated.</p>
              <p className="cs-rolling-note">Tracking begins {rollingStats.trackingStartDate}. Rest days never break your rolling streak. A planned workout counts when at least one set is recorded.</p>
            </section>
            <section className="cs-rolling-stats" aria-label="Rolling training statistics">
              <div className="cs-stat-card"><span>Current Rolling Streak</span><strong>{rollingStats.currentStreak}</strong><small>Consecutive completed planned workouts</small></div>
              <div className="cs-stat-card"><span>Best Rolling Streak</span><strong>{rollingStats.bestStreak}</strong><small>Longest sequence of completed planned workouts</small></div>
              <div className="cs-stat-card"><span>Completed Planned Days</span><strong>{rollingStats.completedPlanned}</strong><small>Scheduled dates with a recorded set</small></div>
              <div className="cs-stat-card"><span>Missed Planned Days</span><strong>{rollingStats.missedPlanned}</strong><small>Past planned training dates not completed</small></div>
            </section>
            <section className="cs-panel">
              <div className="cs-section-header"><div><span className="cs-eyebrow">LAST 14 DAYS</span><h2>Your Cycle Timeline</h2></div></div>
              <div className="cs-rolling-calendar">
                {rollingStats.last14.map(day => (
                  <div key={day.date} className={'cs-rolling-day is-' + day.status} title={day.date + ': ' + day.status.replace('-', ' ')}>
                    <time dateTime={day.date}>{day.date.slice(5)}</time>
                    <strong>{day.status === 'completed' ? 'Done' : day.status === 'rest' ? 'Rest' : day.status === 'missed' ? 'Missed' : day.status === 'upcoming' ? 'Today' : '—'}</strong>
                  </div>
                ))}
              </div>
              <p className="cs-rolling-note">Today is not counted as missed until it finishes. Workouts on optional rest days stay in Workout History, but do not advance your planned rotation.</p>
              {rollingStats.nextWorkout && <p className="cs-rolling-next"><strong>Next planned workout:</strong> {rollingStats.nextWorkout.date}</p>}
              <p className="cs-rolling-note">Changing the cycle's structure starts a new tracking window. Older completed workouts remain in your history.</p>
              <Link to="/workouts/schedule">Review Rolling Schedule →</Link>
            </section>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="consistency-page">

      {/* ==================================
          CONTEXTUAL BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/workouts"
        fallbackLabel="Workouts"
        className="cs-back-link"
      />

      {/* ==================================
          PAGE HEADER
      ================================== */}

      <header className="cs-page-header">
        <span className="cs-eyebrow">
          TRAINING PROGRESS
        </span>

        <h1>Consistency & Streaks</h1>

        <p>
          Follow your weekly training routine
          without turning rest days into
          missed workouts.
        </p>
      </header>

      {/* ==================================
          THIS WEEK
      ================================== */}

      <section className="cs-panel cs-current-panel">
        <div className="cs-section-header">
          <div>
            <span className="cs-eyebrow">
              THIS WEEK
            </span>

            <h2>Weekly Training Goal</h2>
          </div>

          {goalIsSet && (
            <span className="cs-goal-status">
              {currentGoalReached
                ? "Goal Reached"
                : "In Progress"}
            </span>
          )}
        </div>

        {goalIsSet ? (
          <>
            <div className="cs-current-count">
              <strong>
                {stats.currentWeek.days}
              </strong>

              <span>
                / {stats.goal} training days
              </span>
            </div>

            <div
              className="cs-progress-track"
              role="progressbar"
              aria-label="Weekly training goal progress"
              aria-valuemin={0}
              aria-valuemax={stats.goal}
              aria-valuenow={Math.min(
                stats.currentWeek.days,
                stats.goal
              )}
            >
              <div
                className="cs-progress-fill"
                style={{
                  width:
                    `${stats.currentWeek.progressPercent}%`,
                }}
              />
            </div>

            <p className="cs-current-message">
              {currentGoalReached
                ? "You've reached your weekly target. Keep following your planned training and recovery routine."
                : stats.currentWeek.days === 0
                  ? "No training days recorded this week yet. Your current streak is not affected until the week ends."
                  : "Your week is still in progress. Rest and recovery days do not break your streak."}
            </p>
          </>
        ) : (
          <>
            <p className="cs-current-message">
              Set your training frequency in your
              profile or weekly schedule to
              start tracking weekly goals.
            </p>

            <Link
              to="/settings/profile"
              className="cs-primary-link"
            >
              Configure Training Goal
            </Link>
          </>
        )}
      </section>

      {/* ==================================
          OVERVIEW STATISTICS
      ================================== */}

      <section className="cs-stats-grid">
        <div className="cs-stat-card">
          <span>Current Weekly Streak</span>

          <strong>
            {goalIsSet
              ? stats.currentStreak
              : "—"}
          </strong>

          <small>
            {stats.currentStreak === 1 &&
            goalIsSet
              ? "week on target"
              : "consecutive weeks on target"}
          </small>
        </div>

        <div className="cs-stat-card">
          <span>Best Weekly Streak</span>

          <strong>
            {goalIsSet
              ? stats.bestStreak
              : "—"}
          </strong>

          <small>
            {stats.bestStreak === 1 &&
            goalIsSet
              ? "week on target"
              : "consecutive weeks on target"}
          </small>
        </div>

        <div className="cs-stat-card">
          <span>Recent Goal Weeks</span>

          <strong>
            {recentWeeksLabel}
          </strong>

          <small>
            Up to 4 completed weeks
          </small>
        </div>

        <div className="cs-stat-card">
          <span>Total Training Days</span>

          <strong>
            {stats.totalTrainingDays}
          </strong>

          <small>
            {stats.totalSessions} logged sessions
          </small>
        </div>
      </section>

      {/* ==================================
          LAST 8 WEEKS
      ================================== */}

      <section className="cs-panel">
        <div className="cs-section-header">
          <div>
            <h2>Weekly Activity</h2>

            <p>
              Training days over the last
              eight calendar weeks.
            </p>
          </div>
        </div>

        <div
          className="cs-chart"
          role="list"
          aria-label="Training activity over eight weeks"
        >
          {stats.weeks.map((week) => {
            const status = getWeekStatus(
              week,
              stats.goal
            );

            return (
              <div
                key={week.key}
                className="cs-chart-column"
                role="listitem"
                title={
                  `${formatWeekRange(week.start)}: ` +
                  `${week.days} training days. ${status}.`
                }
              >
                <strong className="cs-chart-value">
                  {week.days}
                </strong>

                <div className="cs-chart-track">
                  <div
                    className={
                      `cs-chart-fill ${
                        week.goalMet
                          ? "is-achieved"
                          : ""
                      }`
                    }
                    style={{
                      height:
                        `${week.progressPercent}%`,
                    }}
                  />
                </div>

                <span className="cs-chart-label">
                  {formatShortDate(
                    week.start
                  )}
                </span>

                {week.isCurrent && (
                  <span className="cs-chart-current">
                    Now
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="cs-chart-note">
          {goalIsSet
            ? `Each bar shows progress toward your current target of ${stats.goal} training days per week. Extra sessions on the same day do not increase the day count.`
            : "Each bar represents unique training days. Configure your weekly goal to enable streak calculations."}
        </p>
      </section>

      {/* ==================================
          WEEKLY BREAKDOWN
      ================================== */}

      <section className="cs-panel">
        <div className="cs-section-header">
          <div>
            <h2>Weekly Breakdown</h2>

            <p>
              A closer look at your recent
              training frequency.
            </p>
          </div>
        </div>

        <div className="cs-week-list">
          {[...stats.weeks]
            .reverse()
            .map((week) => {
              const status = getWeekStatus(
                week,
                stats.goal
              );

              return (
                <div
                  key={week.key}
                  className="cs-week-row"
                >
                  <div className="cs-week-info">
                    <strong>
                      {formatWeekRange(
                        week.start
                      )}
                    </strong>

                    <span>
                      {week.days}
                      {" "}
                      {week.days === 1
                        ? "training day"
                        : "training days"}
                      {goalIsSet
                        ? ` / ${stats.goal} target`
                        : ""}
                    </span>
                  </div>

                  <span
                    className={
                      `cs-week-status ${
                        week.goalMet
                          ? "is-achieved"
                          : week.isCurrent
                            ? "is-current"
                            : ""
                      }`
                    }
                  >
                    {status}
                  </span>
                </div>
              );
            })}
        </div>
      </section>

      {/* ==================================
          EXPLANATION
      ================================== */}

      <section className="cs-panel">
        <div className="cs-section-header">
          <div>
            <h2>How Consistency Works</h2>

            <p>
              Your routine should support
              training and recovery.
            </p>
          </div>
        </div>

        <div className="cs-explanation-list">
          <p>
            <strong>Weekly goals:</strong>{" "}
            A week is on target when your
            number of unique training days
            reaches the configured frequency.
          </p>

          <p>
            <strong>Weekly streak:</strong>{" "}
            Consecutive weeks that reached
            their target. An unfinished
            current week does not break
            an existing streak.
          </p>

          <p>
            <strong>Rest days:</strong>{" "}
            Rest and active recovery are
            normal parts of your schedule.
            They are not counted as failures.
          </p>

          <p>
            <strong>Partial workouts:</strong>{" "}
            A partially completed session
            counts as a training day when
            at least one set was recorded.
          </p>

          <p>
            <strong>Historical targets:</strong>{" "}
            Past weeks are compared with
            your currently configured weekly
            frequency. This is a frequency
            indicator, not a medical or
            performance assessment.
          </p>
        </div>

        <div className="cs-actions">
          <Link
            to="/workouts/history"
            className="cs-primary-link"
          >
            View Workout History
          </Link>

          <Link
            to="/workouts/schedule"
            className="cs-secondary-link"
          >
            View Weekly Schedule
          </Link>
        </div>
      </section>
    </main>
  );
}

export default ConsistencyPage;
