
import { useState } from "react";
import { Link } from "react-router";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  daysOfWeek,
  workoutSplits,
  getSplitById,
  assignWorkoutSessions,
  createWeeklyTemplate,
} from "../data/workoutSplits";

import "./WeeklySchedulePage.css";

const activityOptions = [
  { value: "workout", label: "Workout" },
  { value: "rest", label: "Rest Day" },
  { value: "active-recovery", label: "Active Recovery" },
];

function WeeklySchedulePage() {
  const { profile } = useTrainingProfile();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const profileTrainingDays = Number(
    profile?.trainingDaysPerWeek ?? 3
  );

  // Start with the saved calendar or a suggested template
  const [draft, setDraft] = useState(() => {
    if (weeklySchedule) {
      return {
        splitId: weeklySchedule.splitId,
        days: weeklySchedule.days.map((day) => ({
          ...day,
        })),
      };
    }

    return createWeeklyTemplate(profileTrainingDays);
  });

  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const selectedSplit = getSplitById(draft.splitId);

  // Calculate the weekly activity totals
  const workoutCount = draft.days.filter(
    (day) => day.activity === "workout"
  ).length;

  const restCount = draft.days.filter(
    (day) => day.activity === "rest"
  ).length;

  const recoveryCount = draft.days.filter(
    (day) => day.activity === "active-recovery"
  ).length;

  const frequencyMismatch =
    Boolean(profile) &&
    workoutCount !== profileTrainingDays;

  const isSaved =
    weeklySchedule !== null &&
    weeklySchedule.splitId === draft.splitId &&
    JSON.stringify(weeklySchedule.days) ===
      JSON.stringify(draft.days);

  // Change the workout split
  function handleSplitChange(event) {
    const newSplitId = event.target.value;

    setDraft((previousDraft) => ({
      splitId: newSplitId,
      days: assignWorkoutSessions(
        previousDraft.days,
        newSplitId
      ),
    }));

    setFeedback("");
  }

  // Change the activity assigned to a day
  function handleActivityChange(dayId, newActivity) {
    setDraft((previousDraft) => {
      const updatedDays = previousDraft.days.map(
        (day) =>
          day.dayId === dayId
            ? {
                ...day,
                activity: newActivity,
                sessionId: null,
              }
            : day
      );

      return {
        ...previousDraft,
        days: assignWorkoutSessions(
          updatedDays,
          previousDraft.splitId,
          true
        ),
      };
    });

    setFeedback("");
  }

  // Change the session type for a workout day
  function handleSessionChange(dayId, sessionId) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      days: previousDraft.days.map((day) =>
        day.dayId === dayId
          ? { ...day, sessionId }
          : day
      ),
    }));

    setFeedback("");
  }

  // Apply a fresh template matching the profile
  function handleApplyTemplate() {
    setDraft(
      createWeeklyTemplate(
        profileTrainingDays,
        draft.splitId
      )
    );

    setFeedback(
      "A new starting template has been applied. Save to confirm it."
    );
    setFeedbackType("info");
  }

  // Validate and save the weekly schedule
  function handleSubmit(event) {
    event.preventDefault();

    if (workoutCount === 0) {
      setFeedback(
        "Select at least one workout day before saving."
      );
      setFeedbackType("error");
      return;
    }

    if (frequencyMismatch) {
      setFeedback(
        `Your profile is set to ${profileTrainingDays} training days. Adjust your schedule or update your profile.`
      );
      setFeedbackType("error");
      return;
    }

    const invalidSession = draft.days.some(
      (day) =>
        day.activity === "workout" &&
        !selectedSplit.sessions.some(
          (session) => session.id === day.sessionId
        )
    );

    if (invalidSession) {
      setFeedback(
        "Please select a valid session for each workout day."
      );
      setFeedbackType("error");
      return;
    }

    saveWeeklySchedule(draft);

    setFeedback(
      "Weekly schedule saved for this session."
    );
    setFeedbackType("success");
  }

  return (
    <div className="weekly-schedule-page">
      {/* Page navigation */}
      <Link
        to="/workouts"
        className="schedule-back-link"
      >
        ← Back to Workouts
      </Link>

      <header className="schedule-page-heading">
        <span className="schedule-eyebrow">
          WORKOUT PLANNING
        </span>

        <h1>Weekly Schedule</h1>

        <p>
          Choose your workout split, schedule training
          sessions, and make room for rest and recovery.
        </p>
      </header>

      <form
        className="schedule-builder"
        onSubmit={handleSubmit}
      >
        {/* Workout split selection */}
        <section className="schedule-panel">
          <div className="schedule-section-heading">
            <div>
              <h2>Workout Split</h2>

              <p>
                Choose how you want to organize your
                training sessions.
              </p>
            </div>
          </div>

          <div className="schedule-split-field">
            <label htmlFor="workoutSplit">
              Training Split
            </label>

            <select
              id="workoutSplit"
              value={draft.splitId}
              onChange={handleSplitChange}
            >
              {workoutSplits.map((split) => (
                <option
                  key={split.id}
                  value={split.id}
                >
                  {split.name}
                </option>
              ))}
            </select>
          </div>

          <p className="schedule-split-description">
            {selectedSplit.description}
          </p>

          {draft.splitId === "abc" && (
            <p className="schedule-info-note">
              Workouts A, B, and C are placeholders.
              You will be able to define their exercises
              in the workout-building stages.
            </p>
          )}

          {draft.splitId === "custom" && (
            <p className="schedule-info-note">
              Custom workout names and exercise lists
              will be added in the Workout Builder.
            </p>
          )}
        </section>

        {/* Weekly calendar */}
        <section className="schedule-panel">
          <div className="schedule-section-heading schedule-calendar-heading">
            <div>
              <h2>Plan Your Week</h2>

              <p>
                Assign an activity to each day.
                Workout sessions can be customized.
              </p>
            </div>

            <button
              type="button"
              className="schedule-template-button"
              onClick={handleApplyTemplate}
            >
              Apply Profile Template
            </button>
          </div>

          <div className="schedule-week-grid">
            {daysOfWeek.map((weekDay) => {
              const day = draft.days.find(
                (item) => item.dayId === weekDay.id
              );

              if (!day) {
                return null;
              }

              return (
                <div
                  key={weekDay.id}
                  className={
                    `schedule-day-card is-${day.activity}`
                  }
                >
                  <div className="schedule-day-heading">
                    <h3>{weekDay.label}</h3>

                    <span className="schedule-day-indicator" />
                  </div>

                  <div className="schedule-day-field">
                    <label
                      htmlFor={`activity-${weekDay.id}`}
                    >
                      Activity
                    </label>

                    <select
                      id={`activity-${weekDay.id}`}
                      value={day.activity}
                      onChange={(event) =>
                        handleActivityChange(
                          weekDay.id,
                          event.target.value
                        )
                      }
                    >
                      {activityOptions.map((option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {day.activity === "workout" ? (
                    <div className="schedule-day-field">
                      <label
                        htmlFor={`session-${weekDay.id}`}
                      >
                        Session
                      </label>

                      <select
                        id={`session-${weekDay.id}`}
                        value={day.sessionId ?? ""}
                        onChange={(event) =>
                          handleSessionChange(
                            weekDay.id,
                            event.target.value
                          )
                        }
                      >
                        {selectedSplit.sessions.map(
                          (session) => (
                            <option
                              key={session.id}
                              value={session.id}
                            >
                              {session.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  ) : (
                    <p className="schedule-day-description">
                      {day.activity === "rest"
                        ? "Rest and recover."
                        : "Optional light movement or mobility."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Weekly summary */}
        <section className="schedule-panel">
          <div className="schedule-section-heading">
            <div>
              <h2>Weekly Overview</h2>

              <p>
                Review your plan before saving.
              </p>
            </div>
          </div>

          <div className="schedule-summary-grid">
            <div className="schedule-summary-item">
              <span>Workout Days</span>
              <strong>{workoutCount}</strong>
            </div>

            <div className="schedule-summary-item">
              <span>Rest Days</span>
              <strong>{restCount}</strong>
            </div>

            <div className="schedule-summary-item">
              <span>Active Recovery</span>
              <strong>{recoveryCount}</strong>
            </div>
          </div>

          {profile ? (
            <div className="schedule-profile-reference">
              <span>Training Profile</span>

              <strong>
                {profileTrainingDays} workout days per week
              </strong>

              <Link to="/settings/profile">
                Edit Profile
              </Link>
            </div>
          ) : (
            <p className="schedule-info-note">
              No training profile is saved yet.
              The starting template uses 3 workout days.
              You can configure your preferences in{" "}
              <Link to="/settings/profile">
                Training Profile
              </Link>.
            </p>
          )}

          {frequencyMismatch && (
            <p
              className="schedule-warning"
              role="status"
            >
              Your schedule has {workoutCount} workout
              days, but your profile specifies{" "}
              {profileTrainingDays}. Make these match
              before saving.
            </p>
          )}

          {restCount === 0 && (
            <p className="schedule-warning">
              No full rest days are scheduled. Review
              your recovery needs and consider adjusting
              your weekly training frequency.
            </p>
          )}

          {workoutCount === 7 && (
            <p className="schedule-warning">
              Seven workout days are selected. Avoid
              treating every day as a high-intensity
              training session.
            </p>
          )}

          {/* Save actions */}
          <div className="schedule-save-actions">
            <button
              type="submit"
              className="schedule-save-button"
            >
              Save Weekly Schedule
            </button>

            <span className="schedule-save-state">
              {isSaved
                ? "Current plan is saved."
                : "Changes have not been saved."}
            </span>
          </div>

          {feedback && (
            <p
              className={`schedule-feedback is-${feedbackType}`}
              role={
                feedbackType === "error"
                  ? "alert"
                  : "status"
              }
            >
              {feedback}
            </p>
          )}

          <p className="schedule-storage-note">
            Your schedule is currently saved in React
            memory. Permanent storage will be added
            in a future development stage.
          </p>
        </section>
      </form>
    </div>
  );
}

export default WeeklySchedulePage;
