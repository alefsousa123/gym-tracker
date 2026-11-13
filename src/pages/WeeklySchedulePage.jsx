
import { useState } from "react";
import { Link } from "react-router";

import BackToPreviousPage from
  "../components/navigation/BackToPreviousPage";

import { exercises } from "../data/exercises";
import { getExerciseEntries } from "../utils/workoutExerciseEntries";

import ExerciseMotionPreview from
  "../components/exercises/ExerciseMotionPreview";

import {
  useTrainingProfile,
} from "../context/TrainingProfileContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  daysOfWeek,
  workoutSplits,
  getSplitById,
  createWeeklyTemplate,
} from "../data/workoutSplits";

import {
  getCompatibleScheduleSessionOptions,
  assignCompatibleWorkoutSessions,
} from "../utils/personalizedScheduleCompatibility";

import { createDefaultRollingCycle, getRollingConfigurationError, getRollingScheduleDay, localDateKey } from '../utils/rollingTrainingCycle';
import { prepareRollingScheduleSave } from '../utils/rollingTrainingIntegration';
import "./WeeklySchedulePage.css";

// ==========================================
// CONSTANTS
// ==========================================

const activityOptions = [
  { value: "workout", label: "Workout" },
  { value: "rest", label: "Rest Day" },
  {
    value: "active-recovery",
    label: "Active Recovery",
  },
];

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
  const todayIndex =
    (new Date().getDay() + 6) % 7;

  return daysOfWeek[todayIndex].id;
}

function getActivityLabel(activity) {
  return (
    activityOptions.find(
      (option) => option.value === activity
    )?.label ?? "Activity"
  );
}

function getDayLabel(dayId) {
  return (
    daysOfWeek.find(
      (day) => day.id === dayId
    )?.label ?? dayId
  );
}

function copySchedule(schedule) {
  return {
    ...schedule,
    days: schedule.days.map(day => ({ ...day })),
    ...(schedule.rolling ? { rolling: {
      ...schedule.rolling,
      sessionIds: [...schedule.rolling.sessionIds],
    }} : {}),
  };
}

// ==========================================
// EXERCISE PREVIEW ROW
// ==========================================

function ScheduleExerciseRow({ exerciseId }) {
  const exercise = exerciseCatalog.get(exerciseId);

  const exerciseName =
    exercise?.name ?? "Unknown Exercise";

  return (
    <li className="schedule-exercise-item">
      <Link
        to={`/exercises/${exerciseId}`}
        className="schedule-exercise-link"
      >
        <ExerciseMotionPreview
          exerciseId={exerciseId}
          exerciseName={exerciseName}
          variant="thumbnail"
        />

        <div className="schedule-exercise-info">
          <strong>{exerciseName}</strong>

          <span>
            {exercise?.muscleGroup ?? "Exercise"}
          </span>
        </div>

        <span
          className="schedule-exercise-arrow"
          aria-hidden="true"
        >
          ↗
        </span>
      </Link>
    </li>
  );
}

// ==========================================
// WEEKLY SCHEDULE PAGE
// ==========================================

function WeeklySchedulePage() {
  const { profile } = useTrainingProfile();

  const {
    weeklySchedule,
    saveWeeklySchedule,
  } = useWeeklySchedule();

  const { appliedPlan } = useWorkoutPlan();

  const profileTrainingDays = Number(
    profile?.trainingDaysPerWeek ?? 3
  );

  // ========================================
  // EDITABLE SCHEDULE STATE
  // ========================================

  const [draft, setDraft] = useState(() => {
    if (weeklySchedule) {
      return copySchedule(weeklySchedule);
    }

    return createWeeklyTemplate(
      profileTrainingDays
    );
  });

  const [selectedFixedDayId, setSelectedFixedDayId] = useState(getTodayId());
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] =
    useState("info");

  // ========================================
  // QUICK MOVE STATE
  // ========================================

  const [selectedSourceId, setSelectedSourceId] =
    useState("");

  const [
    selectedDestinationId,
    setSelectedDestinationId,
  ] = useState("");

  const [
    showRestoreConfirmation,
    setShowRestoreConfirmation,
  ] = useState(false);

  const selectedSplit = getSplitById(
    draft.splitId
  );

  const scheduleSessionOptions =
    getCompatibleScheduleSessionOptions(
      draft.splitId,
      appliedPlan
    );


  // D2.3Q: The original seven-day schedule remains editable.
  const isRolling = draft.mode === 'rolling';
  const rollingConfig = draft.rolling ?? createDefaultRollingCycle(appliedPlan);
  const rollingPreview = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    const start = new Date(rollingConfig.startDate + 'T12:00:00');
    if (!Number.isNaN(start.getTime()) && start > date) {
      date.setTime(start.getTime());
    }
    date.setDate(date.getDate() + index);
    const result = getRollingScheduleDay({ ...draft, mode: 'rolling', rolling: rollingConfig }, date);
    const session = appliedPlan?.sessions.find(item => item.id === result?.sessionId);
    return {
      date: localDateKey(date),
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date),
      activity: result?.activity ?? 'not-started',
      sessionName: session?.name ?? 'Session unavailable',
    };
  });

  function enableFixed() {
    setDraft(previous => ({ ...previous, mode: 'fixed' }));
    setFeedback('');
    setShowRestoreConfirmation(false);
  }

  function enableRolling() {
    if (!appliedPlan) return;
    setDraft(previous => {
      const validIds = new Set(appliedPlan.sessions.map(item => item.id));
      const previousIds = previous.rolling?.sessionIds;
      const rolling = Array.isArray(previousIds) && previousIds.length &&
        previousIds.every(id => validIds.has(id))
          ? previous.rolling
          : createDefaultRollingCycle(appliedPlan);
      return { ...previous, mode: 'rolling', splitId: appliedPlan.splitId, rolling };
    });
    setFeedback('');
    setShowRestoreConfirmation(false);
  }

  function updateRolling(changes) {
    setDraft(previous => ({
      ...previous,
      rolling: { ...(previous.rolling ?? createDefaultRollingCycle(appliedPlan)), ...changes },
    }));
    setFeedback('');
  }

  function updateRollingStep(index, id) {
    const ids = [...rollingConfig.sessionIds];
    ids[index] = id;
    updateRolling({ sessionIds: ids });
  }

  function removeRollingStep(index) {
    updateRolling({ sessionIds: rollingConfig.sessionIds.filter((_, position) => position !== index) });
  }

  function addRollingStep() {
    if (!appliedPlan?.sessions.length || rollingConfig.sessionIds.length >= 14) return;
    const next = appliedPlan.sessions[rollingConfig.sessionIds.length % appliedPlan.sessions.length];
    updateRolling({ sessionIds: [...rollingConfig.sessionIds, next.id] });
  }

  // D2.3Q1: Compact fixed-week preview. Two calendar weeks, one shared weekday editor.
  // Both weeks reflect draft changes immediately; neither advances the workout rotation.
  const fixedTodayKey = localDateKey(new Date());
  const fixedWeekStart = new Date();
  fixedWeekStart.setHours(12, 0, 0, 0);
  fixedWeekStart.setDate(fixedWeekStart.getDate() - (fixedWeekStart.getDay() + 6) % 7);
  const fixedPreview = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(fixedWeekStart);
    date.setDate(fixedWeekStart.getDate() + index);
    const weekDay = daysOfWeek[index % daysOfWeek.length];
    const day = draft.days.find(item => item.dayId === weekDay.id);
    const session = scheduleSessionOptions.find(item => item.id === day?.sessionId);
    return {
      date: localDateKey(date),
      dayId: weekDay.id,
      weekday: weekDay.label,
      label: new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }).format(date),
      activity: day?.activity ?? 'rest',
      title: day?.activity === 'workout'
        ? (session?.label ?? 'Choose Session')
        : day?.activity === 'active-recovery'
          ? 'Active Recovery'
          : 'Rest Day',
    };
  });

  const todayId = getTodayId();

  // ========================================
  // WEEKLY TOTALS
  // ========================================

  const workoutDays = draft.days.filter(
    (day) => day.activity === "workout"
  );

  const availableDestinations = draft.days.filter(
    (day) => day.activity !== "workout"
  );

  const workoutCount = workoutDays.length;

  const restCount = draft.days.filter(
    (day) => day.activity === "rest"
  ).length;

  const recoveryCount = draft.days.filter(
    (day) => day.activity === "active-recovery"
  ).length;

  const frequencyMismatch =
    Boolean(profile) &&
    workoutCount !== profileTrainingDays;

  // ========================================
  // SAVED AND UNSAVED CHANGES
  // ========================================

  const startingSchedule = weeklySchedule
    ? copySchedule(weeklySchedule)
    : createWeeklyTemplate(profileTrainingDays);

  const hasUnsavedChanges =
    JSON.stringify(draft) !==
    JSON.stringify(startingSchedule);

  const isSaved =
    weeklySchedule !== null &&
    !hasUnsavedChanges;

  // ========================================
  // PLAN COMPATIBILITY
  // ========================================

  const planMatchesSplit =
    Boolean(appliedPlan) &&
    appliedPlan.splitId === draft.splitId;

  // ========================================
  // QUICK MOVE SELECTIONS
  // ========================================

  const sourceDayId = workoutDays.some(
    (day) => day.dayId === selectedSourceId
  )
    ? selectedSourceId
    : workoutDays[0]?.dayId ?? "";

  const destinationDayId =
    availableDestinations.some(
      (day) =>
        day.dayId === selectedDestinationId
    )
      ? selectedDestinationId
      : availableDestinations[0]?.dayId ?? "";

  const canMoveWorkout = Boolean(
    sourceDayId && destinationDayId
  );

  // ========================================
  // GENERAL EDITING ACTIONS
  // ========================================

  function handleSplitChange(event) {
    const newSplitId = event.target.value;

    setDraft((previousDraft) => ({
      splitId: newSplitId,

      days: assignCompatibleWorkoutSessions(
        previousDraft.days,
        newSplitId,
        appliedPlan
      ),
    }));

    setFeedback("");
    setShowRestoreConfirmation(false);
  }

  function handleActivityChange(
    dayId,
    newActivity
  ) {
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

        days: assignCompatibleWorkoutSessions(
          updatedDays,
          previousDraft.splitId,
          appliedPlan,
          true
        ),
      };
    });

    setFeedback("");
    setShowRestoreConfirmation(false);
  }

  function handleSessionChange(
    dayId,
    sessionId
  ) {
    setDraft((previousDraft) => ({
      ...previousDraft,

      days: previousDraft.days.map(
        (day) =>
          day.dayId === dayId
            ? { ...day, sessionId }
            : day
      ),
    }));

    setFeedback("");
    setShowRestoreConfirmation(false);
  }

  // ========================================
  // APPLY PROFILE TEMPLATE
  // ========================================

  function handleApplyTemplate() {
    const template = createWeeklyTemplate(
      profileTrainingDays,
      draft.splitId
    );

    setDraft({
      ...template,
      days: assignCompatibleWorkoutSessions(
        template.days,
        template.splitId,
        appliedPlan
      ),
    });

    setFeedback(
      "A new starting template is ready. Save to confirm it."
    );

    setFeedbackType("info");
    setShowRestoreConfirmation(false);
  }

  // ========================================
  // MOVE A WORKOUT TO ANOTHER DAY
  // ========================================

  function handleMoveWorkout() {
    if (!canMoveWorkout) {
      return;
    }

    setDraft((previousDraft) => {
      const source = previousDraft.days.find(
        (day) => day.dayId === sourceDayId
      );

      const destination = previousDraft.days.find(
        (day) => day.dayId === destinationDayId
      );

      if (
        !source ||
        !destination ||
        source.activity !== "workout" ||
        destination.activity === "workout"
      ) {
        return previousDraft;
      }

      const updatedDays = previousDraft.days.map(
        (day) => {
          if (day.dayId === sourceDayId) {
            return {
              ...day,
              activity: destination.activity,
              sessionId: null,
            };
          }

          if (day.dayId === destinationDayId) {
            return {
              ...day,
              activity: "workout",
              sessionId: source.sessionId,
            };
          }

          return day;
        }
      );

      return {
        ...previousDraft,
        days: updatedDays,
      };
    });

    setFeedback(
      `${getDayLabel(sourceDayId)} workout moved to ${getDayLabel(destinationDayId)}. Save to keep this change.`
    );

    setFeedbackType("info");
    setShowRestoreConfirmation(false);
  }

  // ========================================
  // RESTORE SAVED SCHEDULE
  // ========================================

  function handleRestoreSchedule() {
    const restoredSchedule = weeklySchedule
      ? copySchedule(weeklySchedule)
      : createWeeklyTemplate(profileTrainingDays);

    setDraft(restoredSchedule);

    setSelectedSourceId("");
    setSelectedDestinationId("");

    setShowRestoreConfirmation(false);

    setFeedback(
      weeklySchedule
        ? "The last saved schedule has been restored."
        : "The starting template has been restored."
    );

    setFeedbackType("info");
  }

  // ========================================
  // SAVE WEEKLY SCHEDULE
  // ========================================

  function handleSubmit(event) {
    event.preventDefault();

    if (isRolling) {
      const problem = getRollingConfigurationError(draft, appliedPlan);
      if (problem) {
        setFeedback(problem);
        setFeedbackType('error');
        return;
      }
      const nextSchedule = prepareRollingScheduleSave(weeklySchedule, draft);
      saveWeeklySchedule(nextSchedule);
      setDraft(nextSchedule);
      setShowRestoreConfirmation(false);
      setFeedback('Rolling training cycle saved. It continues across weeks.');
      setFeedbackType('success');
      return;
    }

    if (workoutCount === 0) {
      setFeedback(
        "Select at least one workout day before saving."
      );

      setFeedbackType("error");
      return;
    }

    if (frequencyMismatch) {
      setFeedback(
        `Your profile is set to ${profileTrainingDays} training days. Adjust the schedule or update your profile.`
      );

      setFeedbackType("error");
      return;
    }

    const invalidSession = draft.days.some(
      (day) =>
        day.activity === "workout" &&
        !scheduleSessionOptions.some(
          (session) =>
            session.id === day.sessionId
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

    setShowRestoreConfirmation(false);
    setFeedback(
      "Weekly schedule saved on this device."
    );

    setFeedbackType("success");
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="weekly-schedule-page">

      {/* ==================================
          CONTEXTUAL BACK NAVIGATION
      ================================== */}

      <BackToPreviousPage
        fallbackTo="/workouts"
        fallbackLabel="Workouts"
        className="schedule-back-link"
      />

      <header className="schedule-page-heading">
        <span className="schedule-eyebrow">
          WORKOUT PLANNING
        </span>

        <h1>Weekly Schedule</h1>

        <p>
          Organize your training week, review
          exercises, and make time for recovery.
        </p>
      </header>

      <form
        className="schedule-builder"
        data-mode={isRolling ? 'rolling' : 'fixed'}
        onSubmit={handleSubmit}
      >

        
        {/* D2.3Q — Scheduling modes */}
        <section className="schedule-panel schedule-mode-panel">
          <div className="schedule-section-heading">
            <div>
              <h2>Scheduling Mode</h2>
              <p>Use fixed weekdays or a continuous training and rest rotation.</p>
            </div>
          </div>
          <div className="schedule-rolling-mode-buttons">
            <button type="button" className={!isRolling ? 'schedule-save-button' : 'schedule-template-button'} onClick={enableFixed}>Fixed Weekly Schedule</button>
            <button type="button" className={isRolling ? 'schedule-save-button' : 'schedule-template-button'} disabled={!appliedPlan} onClick={enableRolling}>Rolling Training Cycle</button>
          </div>
          {!appliedPlan && <p className="schedule-info-note">Save a workout plan before enabling a rolling cycle.</p>}
          {isRolling && <p className="schedule-info-note">Rolling cycles continue across weeks. The existing weekly streak statistics will be adapted in D2.3R.</p>}
        </section>

        {isRolling && (
          <section className="schedule-panel schedule-rolling-panel">
            <div className="schedule-section-heading">
              <div>
                <span className="schedule-section-eyebrow">ROLLING CYCLE</span>
                <h2>Training and Recovery Rotation</h2>
                <p>Each training day advances to the next session; rest days do not advance the session order.</p>
              </div>
            </div>
            <div className="schedule-rolling-fields">
              <label>Cycle Start Date
                <input type="date" value={rollingConfig.startDate} onChange={event => updateRolling({startDate: event.target.value})}/>
              </label>
              <label>Consecutive Training Days
                <input type="number" min="1" max="7" value={rollingConfig.trainingDays} onChange={event => updateRolling({trainingDays: Number(event.target.value)})}/>
              </label>
              <label>Consecutive Rest Days
                <input type="number" min="1" max="7" value={rollingConfig.restDays} onChange={event => updateRolling({restDays: Number(event.target.value)})}/>
              </label>
            </div>
            <h3>Workout Rotation Order</h3>
            <p className="schedule-split-description">Use A–B–C–D–E in order, or change each step. The order continues after every rest day.</p>
            <div className="schedule-rolling-order">
              {rollingConfig.sessionIds.map((sessionId, index) => (
                <div className="schedule-rolling-order-row" key={index}>
                  <span>Step {index + 1}</span>
                  <select aria-label={'Rotation step ' + (index + 1)} value={sessionId} onChange={event => updateRollingStep(index, event.target.value)}>
                    {(appliedPlan?.sessions ?? []).map(session => <option key={session.id} value={session.id}>{session.name}</option>)}
                  </select>
                  <button type="button" className="schedule-template-button" disabled={rollingConfig.sessionIds.length <= 1} onClick={() => removeRollingStep(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="schedule-template-button" disabled={rollingConfig.sessionIds.length >= 14} onClick={addRollingStep}>+ Add Rotation Step</button>
            <h3>Next 14 Days</h3>
            <div className="schedule-rolling-preview">
              {rollingPreview.map(day => (
                <div className={'schedule-rolling-day is-' + (day.activity === 'workout' ? 'workout' : 'rest')} key={day.date}>
                  <time dateTime={day.date}>{day.label}</time>
                  <strong>{day.activity === 'workout' ? day.sessionName : day.activity === 'rest' ? 'Rest Day' : 'Before Start'}</strong>
                </div>
              ))}
            </div>
            <div className="schedule-save-actions">
              <button type="submit" className="schedule-save-button">Save Rolling Cycle</button>
              <button type="button" className="schedule-template-button" disabled={!hasUnsavedChanges} onClick={() => setShowRestoreConfirmation(true)}>Restore Saved Schedule</button>
            </div>
            {showRestoreConfirmation && (
              <div className="schedule-plan-notice">
                <strong>Discard unsaved changes?</strong>
                <p>This restores the last saved configuration.</p>
                <div className="schedule-save-actions">
                  <button type="button" className="schedule-template-button" onClick={handleRestoreSchedule}>Confirm Restore</button>
                  <button type="button" className="schedule-template-button" onClick={() => setShowRestoreConfirmation(false)}>Keep Editing</button>
                </div>
              </div>
            )}
            {feedback && <p className={'schedule-feedback is-' + feedbackType} role={feedbackType === 'error' ? 'alert' : 'status'}>{feedback}</p>}
            <p className="schedule-save-state">{isSaved ? 'All changes are saved.' : 'Save to apply this cycle.'}</p>
          </section>
        )}

        {/* ==================================
            STEP 01 - WORKOUT SPLIT
        ================================== */}

        <section className="schedule-panel">
          <div className="schedule-section-heading">
            <div>
              <span className="schedule-section-eyebrow">
                STEP 01
              </span>

              <h2>Workout Split</h2>

              <p>
                Choose how your workout sessions
                are organized throughout the week.
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

          {appliedPlan?.isPersonalized &&
            planMatchesSplit && (
              <p className="schedule-info-note">
                This calendar uses your saved
                personalized sessions. Moving a
                workout to another day preserves
                its exercises and training targets.
              </p>
            )}

          {draft.splitId === "abc" && (
            <p className="schedule-info-note">
              Workouts A, B, and C are session
              categories. Their exercises can be
              customized in Workout Builder.
            </p>
          )}

          {draft.splitId === "custom" && (
            <p className="schedule-info-note">
              Customize your exercises and training
              targets in Workout Builder.
            </p>
          )}

          {appliedPlan && !planMatchesSplit && (
            <div className="schedule-plan-notice">
              <strong>
                Your current plan uses a different split.
              </strong>

              <p>
                Exercise previews appear when the
                selected split matches the applied
                workout plan.
              </p>

              <Link to="/workouts/builder">
                Review Current Plan →
              </Link>
            </div>
          )}
        </section>

        {/* ==================================
            STEP 02 - WEEKLY CALENDAR
        ================================== */}

        <section className="schedule-panel">
          <div className="schedule-section-heading schedule-calendar-heading">
            <div>
              <span className="schedule-section-eyebrow">
                STEP 02
              </span>

              <h2>Plan Your Week</h2>

              <p>
                Set your activity for each day
                and preview the exercises in
                your workout sessions.
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

          <div className="schedule-legend">
            <span>
              <i className="schedule-legend-dot is-workout" />
              Workout
            </span>

            <span>
              <i className="schedule-legend-dot is-rest" />
              Rest
            </span>

            <span>
              <i className="schedule-legend-dot is-active-recovery" />
              Active Recovery
            </span>
          </div>

          {/* D2.3Q1: Match the rolling cycle's compact day tiles. */}
          <div className="schedule-fixed-preview-heading">
            <div>
              <h3>Your Fixed Weekly Pattern</h3>
              <p>Preview the current and next week. Tap a day to change its activity or workout session.</p>
            </div>
            <span>Repeats each week</span>
          </div>

          <div className="schedule-rolling-preview schedule-fixed-preview" role="group" aria-label="Fixed weekly schedule for two weeks">
            {fixedPreview.map(day => (
              <button
                key={day.date}
                type="button"
                className={
                  'schedule-rolling-day schedule-fixed-day is-' + day.activity +
                  (day.dayId === selectedFixedDayId ? ' is-selected' : '') +
                  (day.date === fixedTodayKey ? ' is-today' : '')
                }
                onClick={() => setSelectedFixedDayId(day.dayId)}
                aria-pressed={day.dayId === selectedFixedDayId}
                aria-label={'Edit ' + day.weekday + ', ' + day.title}
              >
                <time dateTime={day.date}>{day.label}</time>
                <strong>{day.title}</strong>
                {day.date === fixedTodayKey && <span className="schedule-fixed-today">Today</span>}
              </button>
            ))}
          </div>

          <div className="schedule-fixed-editor-heading">
            <div>
              <span className="schedule-section-eyebrow">EDIT SELECTED DAY</span>
              <h3>{daysOfWeek.find(day => day.id === selectedFixedDayId)?.label ?? 'Select a day'}</h3>
            </div>
            <p>Changes update both weeks above. Save your schedule when finished.</p>
          </div>

          <div className="schedule-week-grid schedule-fixed-editor-grid">
            {daysOfWeek.map((weekDay) => {
              const day = draft.days.find(
                (item) =>
                  item.dayId === weekDay.id
              );

              if (!day) {
                return null;
              }

              const isToday =
                weekDay.id === todayId;

              const planSession =
                planMatchesSplit &&
                day.activity === "workout"
                  ? appliedPlan.sessions.find(
                      (session) =>
                        session.id === day.sessionId
                    )
                  : null;

              const exerciseEntries =
                getExerciseEntries(planSession);

              const previewExercises =
                exerciseEntries.slice(0, 2);

              const remainingExercises =
                exerciseEntries.slice(2);

              return (
                <article
                  key={weekDay.id}
                  data-selected-fixed={weekDay.id === selectedFixedDayId}
                  className={
                    `schedule-day-card is-${day.activity} ${
                      isToday ? "is-today" : ""
                    }`
                  }
                >
                  <div className="schedule-day-heading">
                    <div className="schedule-day-title">
                      <h3>{weekDay.label}</h3>

                      {isToday && (
                        <span className="schedule-today-badge">
                          TODAY
                        </span>
                      )}
                    </div>

                    <span
                      className="schedule-day-indicator"
                      aria-hidden="true"
                    />
                  </div>

                  <span className="schedule-activity-label">
                    {getActivityLabel(day.activity)}
                  </span>

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
                      {activityOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {day.activity === "workout" ? (
                    <>
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
                          {scheduleSessionOptions.map(
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

                      {/* Exercise thumbnails */}

                      {exerciseEntries.length > 0 ? (
                        <div className="schedule-day-exercises">
                          <div className="schedule-exercises-header">
                            <strong>Exercises</strong>

                            <span>
                              {exerciseEntries.length}
                            </span>
                          </div>

                          <ul className="schedule-exercise-list">
                            {previewExercises.map(
                              (entry) => (
                                <ScheduleExerciseRow
                                  key={entry.entryId}
                                  exerciseId={entry.exerciseId}
                                />
                              )
                            )}
                          </ul>

                          {remainingExercises.length > 0 && (
                            <details className="schedule-exercise-expand">
                              <summary>
                                Show{" "}
                                {remainingExercises.length}
                                {" "}more exercises
                              </summary>

                              <ul className="schedule-exercise-list">
                                {remainingExercises.map(
                                  (entry) => (
                                    <ScheduleExerciseRow
                                      key={entry.entryId}
                                      exerciseId={entry.exerciseId}
                                    />
                                  )
                                )}
                              </ul>
                            </details>
                          )}
                        </div>
                      ) : (
                        <p className="schedule-no-exercises">
                          {appliedPlan && planMatchesSplit
                            ? "No exercises are linked to this session yet."
                            : "Apply a matching workout plan to preview exercises."}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="schedule-recovery-content">
                      <span
                        className="schedule-recovery-icon"
                        aria-hidden="true"
                      >
                        {day.activity === "rest"
                          ? "☾"
                          : "✦"}
                      </span>

                      <p className="schedule-day-description">
                        {day.activity === "rest"
                          ? "Take time to rest and recover."
                          : "Consider light activity or mobility."}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <p className="schedule-calendar-note">
            Exercise previews come from your applied
            workout plan. To change the exercises
            in a session, use{" "}
            <Link to="/workouts/builder">
              Workout Builder
            </Link>.
          </p>
        </section>

        {/* ==================================
            STEP 03 - QUICK ADJUSTMENTS
        ================================== */}

        <section className="schedule-panel">
          <div className="schedule-section-heading">
            <div>
              <span className="schedule-section-eyebrow">
                STEP 03
              </span>

              <h2>Quick Schedule Adjustments</h2>

              <p>
                Move a workout to another day
                without changing your weekly
                training frequency.
              </p>
            </div>
          </div>

          <div className="schedule-builder">

            <div className="schedule-split-field">
              <label htmlFor="moveWorkoutFrom">
                Move Workout From
              </label>

              <select
                id="moveWorkoutFrom"
                value={sourceDayId}
                onChange={(event) =>
                  setSelectedSourceId(
                    event.target.value
                  )
                }
                disabled={!canMoveWorkout}
              >
                {workoutDays.length === 0 && (
                  <option value="">
                    No workout days
                  </option>
                )}

                {workoutDays.map((day) => (
                  <option
                    key={day.dayId}
                    value={day.dayId}
                  >
                    {getDayLabel(day.dayId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="schedule-split-field">
              <label htmlFor="moveWorkoutTo">
                Move Workout To
              </label>

              <select
                id="moveWorkoutTo"
                value={destinationDayId}
                onChange={(event) =>
                  setSelectedDestinationId(
                    event.target.value
                  )
                }
                disabled={!canMoveWorkout}
              >
                {availableDestinations.length === 0 && (
                  <option value="">
                    No available days
                  </option>
                )}

                {availableDestinations.map(
                  (day) => (
                    <option
                      key={day.dayId}
                      value={day.dayId}
                    >
                      {getDayLabel(day.dayId)}
                      {" · "}
                      {getActivityLabel(day.activity)}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="schedule-save-actions">
              <button
                type="button"
                className="schedule-template-button"
                disabled={!canMoveWorkout}
                onClick={handleMoveWorkout}
              >
                Move Workout
              </button>
            </div>

            <p className="schedule-info-note">
              The workout keeps its session and
              exercises. The original day receives
              the destination day's previous activity.
              This change only becomes permanent
              when you save the schedule.
            </p>

          </div>
        </section>

        {/* ==================================
            STEP 04 - WEEKLY OVERVIEW
        ================================== */}

        <section className="schedule-panel">
          <div className="schedule-section-heading">
            <div>
              <span className="schedule-section-eyebrow">
                STEP 04
              </span>

              <h2>Weekly Overview</h2>

              <p>
                Check your weekly distribution
                before saving.
              </p>
            </div>
          </div>

          <div className="schedule-summary-grid">
            <div className="schedule-summary-item is-workout">
              <span>Workout Days</span>
              <strong>{workoutCount}</strong>
            </div>

            <div className="schedule-summary-item is-rest">
              <span>Rest Days</span>
              <strong>{restCount}</strong>
            </div>

            <div className="schedule-summary-item is-active-recovery">
              <span>Active Recovery</span>
              <strong>{recoveryCount}</strong>
            </div>
          </div>

          {profile ? (
            <div className="schedule-profile-reference">
              <span>Training Profile</span>

              <strong>
                {profileTrainingDays}
                {" "}workout days per week
              </strong>

              <Link to="/settings/profile">
                Edit Profile
              </Link>
            </div>
          ) : (
            <p className="schedule-info-note">
              No training profile is saved yet.
              The starting template uses three
              workout days. Configure your{" "}
              <Link to="/settings/profile">
                Training Profile
              </Link>{" "}
              to personalize this schedule.
            </p>
          )}

          {frequencyMismatch && (
            <p
              className="schedule-warning"
              role="status"
            >
              Your schedule has {workoutCount}
              {" "}workout days, but your profile
              specifies {profileTrainingDays}.
              Make these match before saving.
            </p>
          )}

          {restCount === 0 && (
            <p className="schedule-warning">
              No full rest days are scheduled.
              Review your recovery needs and
              consider adjusting your training
              frequency.
            </p>
          )}

          {workoutCount === 7 && (
            <p className="schedule-warning">
              Seven workout days are selected.
              Avoid treating every day as a
              high-intensity training session.
            </p>
          )}

          {/* Save and restore actions */}

          <div className="schedule-save-actions">
            <button
              type="submit"
              className="schedule-save-button"
            >
              Save Weekly Schedule
            </button>

            <button
              type="button"
              className="schedule-template-button"
              disabled={!hasUnsavedChanges}
              onClick={() =>
                setShowRestoreConfirmation(true)
              }
            >
              Restore Saved Schedule
            </button>
          </div>

          {/* Restore confirmation */}

          {showRestoreConfirmation && (
            <div className="schedule-plan-notice">
              <strong>
                Discard your unsaved changes?
              </strong>

              <p>
                This restores your last saved
                schedule, or the starting template
                if you have never saved one.
              </p>

              <div className="schedule-save-actions">
                <button
                  type="button"
                  className="schedule-template-button"
                  onClick={handleRestoreSchedule}
                >
                  Confirm Restore
                </button>

                <button
                  type="button"
                  className="schedule-template-button"
                  onClick={() =>
                    setShowRestoreConfirmation(false)
                  }
                >
                  Keep Editing
                </button>
              </div>
            </div>
          )}

          <p
            className="schedule-save-state"
            role="status"
          >
            {isSaved
              ? "All changes are saved."
              : hasUnsavedChanges
                ? "You have unsaved changes."
                : "Starting template: not yet saved."}
          </p>

          {feedback && (
            <p
              className={
                `schedule-feedback is-${feedbackType}`
              }
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
            Your weekly schedule is saved
            locally on this device.
          </p>
        </section>
      </form>
    </div>
  );
}

export default WeeklySchedulePage;
