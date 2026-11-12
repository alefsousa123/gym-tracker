
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { exercises } from "../data/exercises";
import { daysOfWeek } from "../data/workoutSplits";
import {
  getExerciseEntries,
  getWorkoutExerciseKey,
} from "../utils/workoutExerciseEntries";

import ExerciseMotionPreview from "../components/exercises/ExerciseMotionPreview";
import TimedSetTimer from "../components/workouts/TimedSetTimer";

import { useWorkoutPlan } from "../context/WorkoutPlanContext";
import { useWeeklySchedule } from "../context/WeeklyScheduleContext";
import { useWorkoutSession } from "../context/WorkoutSessionContext";

import { getScheduleDayForDate } from '../utils/rollingTrainingCycle';
import { localDateKey } from '../utils/rollingTrainingCycle';
import "./TodaysWorkoutPage.css";

// ==========================================
// HELPERS
// ==========================================

function findExercise(exerciseId) {
  return exercises.find(
    (exercise) => exercise.id === exerciseId
  );
}

function describeTarget(target) {
  return target.targetType === "duration"
    ? `${target.durationSeconds} sec`
    : `${target.minReps}–${target.maxReps} reps`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;

  return (
    `${String(minutes).padStart(2, "0")}:` +
    String(remaining).padStart(2, "0")
  );
}

function getTodayId() {
  return daysOfWeek[
    (new Date().getDay() + 6) % 7
  ].id;
}

// ==========================================
// TODAY'S WORKOUT
// ==========================================

function TodaysWorkoutPage() {
  const { appliedPlan } = useWorkoutPlan();
  const { weeklySchedule } = useWeeklySchedule();

  const {
    activeWorkout,
    todayWorkout,
    restTimer,
    timedSetTimer,
    reviewOpen,

    startWorkout,
    recordSet,
    undoLastSet,
    toggleSkipExercise,

    startRest,
    pauseRest,
    resumeRest,
    addRestTime,
    clearRestTimer,

    finishWorkout,
    discardWorkout,

    submitTrainingReview,
    dismissTrainingReview,
  } = useWorkoutSession();

  // ========================================
  // TODAY'S SCHEDULE
  // ========================================

  // D2.3R — Re-evaluate the rolling day when the app remains open past midnight.
  const [calendarDayKey, setCalendarDayKey] = useState(() => localDateKey());
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(100, tomorrow.getTime() - now.getTime() + 150);
    const timer = window.setTimeout(() => setCalendarDayKey(localDateKey()), delay);
    return () => window.clearTimeout(timer);
  }, [calendarDayKey]);

  const todayId = getTodayId();

  const todaySchedule = getScheduleDayForDate(weeklySchedule, new Date(calendarDayKey + 'T12:00:00'));

  const scheduleMatches =
    Boolean(appliedPlan && weeklySchedule) &&
    appliedPlan.splitId === weeklySchedule.splitId;

  const scheduledSession =
    scheduleMatches &&
    todaySchedule?.activity === "workout"
      ? appliedPlan.sessions.find(
          (session) =>
            session.id === todaySchedule.sessionId
        )
      : null;

  // A manual choice lasts only while the same plan and scheduled day remain current.
  // Deriving this avoids a stale selection after a rolling cycle advances.
  const preferredSessionId = scheduledSession?.id ?? appliedPlan?.sessions[0]?.id ?? '';
  const [selectionOverride, setSelectionOverride] = useState(null);
  const selectedSessionId = selectionOverride?.plan === appliedPlan &&
    selectionOverride?.scheduledId === preferredSessionId &&
    selectionOverride?.dayKey === calendarDayKey &&
    appliedPlan?.sessions.some(session => session.id === selectionOverride.id)
      ? selectionOverride.id
      : preferredSessionId;

  const selectedSession =
    appliedPlan?.sessions.find(
      (session) => session.id === selectedSessionId
    ) ?? appliedPlan?.sessions[0];

  // ========================================
  // ACTIVE EXERCISE
  // ========================================

  const [focusedExerciseId, setFocusedExerciseId] =
    useState(null);

  const currentExercise =
    activeWorkout?.exercises.find(
      (exercise) =>
        getWorkoutExerciseKey(exercise) === focusedExerciseId
    ) ??
    activeWorkout?.exercises.find(
      (exercise) =>
        !exercise.skipped &&
        exercise.completedSets.length <
          Number(exercise.target.sets)
    ) ??
    activeWorkout?.exercises[0];

  const exerciseInfo = currentExercise
    ? findExercise(currentExercise.exerciseId)
    : null;

  const target = currentExercise?.target;

  const completedForExercise =
    currentExercise?.completedSets.length ?? 0;

  const plannedForExercise =
    Number(target?.sets ?? 0);

  const remainingSets = Math.max(
    0,
    plannedForExercise - completedForExercise
  );

  const currentIndex =
    activeWorkout?.exercises.findIndex(
      (exercise) =>
        getWorkoutExerciseKey(exercise) ===
        getWorkoutExerciseKey(currentExercise)
    ) ?? -1;

  // ========================================
  // QUICK SET FORM
  // ========================================

  const [repsInput, setRepsInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [formError, setFormError] = useState("");
  const [saveConflict, setSaveConflict] = useState(false);

  const [showEarlyFinish, setShowEarlyFinish] =
    useState(false);

  const [showDiscard, setShowDiscard] =
    useState(false);

  const [reviewDifficulty, setReviewDifficulty] =
    useState("");

  const [reviewTechnique, setReviewTechnique] =
    useState("");

  // ========================================
  // QUICK SET FORM SYNCHRONIZATION
  // ========================================

  const [initializedFormKey, setInitializedFormKey] =
    useState(null);

  const formKey = currentExercise
    ? [
        activeWorkout?.id,
        getWorkoutExerciseKey(currentExercise),
        completedForExercise,
      ].join(":")
    : null;

  if (
    formKey !== null &&
    initializedFormKey !== formKey
  ) {
    const previousSet =
      currentExercise.completedSets.at(-1);

    const previousWeight =
      previousSet?.weight ??
      currentExercise.target.weight;

    setInitializedFormKey(formKey);

    setRepsInput(
      String(
        previousSet?.reps ??
        currentExercise.target.maxReps ??
        12
      )
    );

    setDurationInput(
      String(
        previousSet?.durationSeconds ??
        currentExercise.target.durationSeconds ??
        30
      )
    );

    setWeightInput(
      previousWeight === "" ||
      previousWeight === null ||
      previousWeight === undefined
        ? ""
        : String(previousWeight)
    );

    setFormError("");
  }

  // ========================================
  // REST TIMER
  // ========================================

  // ========================================
  // REST TIMER CLOCK
  // ========================================

  const [restClock, setRestClock] = useState(null);

  useEffect(() => {
    if (restTimer.status !== "running") {
      return;
    }

    const intervalId = setInterval(() => {
      setRestClock({
        endsAt: restTimer.endsAt,
        now: Date.now(),
      });
    }, 250);

    return () => clearInterval(intervalId);
  }, [
    restTimer.status,
    restTimer.endsAt,
  ]);

  const restClockReady =
    restClock !== null &&
    restClock.endsAt === restTimer.endsAt &&
    Number.isFinite(restTimer.endsAt);

  const restSecondsLeft =
    restTimer.status === "running" &&
    restClockReady
      ? Math.max(
          0,
          Math.ceil(
            (restTimer.endsAt - restClock.now) / 1000
          )
        )
      : restTimer.remainingSeconds;

  // ========================================
  // TIMED SET VALIDATION
  // ========================================

  const currentTimedSet =
    Boolean(
      activeWorkout &&
      currentExercise &&
      target?.targetType === "duration"
    ) &&
    timedSetTimer.workoutId === activeWorkout.id &&
    timedSetTimer.exerciseId ===
      getWorkoutExerciseKey(currentExercise) &&
    timedSetTimer.setNumber ===
      completedForExercise + 1;

  const timedSetBusy =
    currentTimedSet &&
    (
      timedSetTimer.status === "running" ||
      timedSetTimer.status === "paused"
    );

  // ========================================
  // WORKOUT PROGRESS
  // ========================================

  const totalSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total + Number(exercise.target.sets),
      0
    ) ?? 0;

  const completedSets =
    activeWorkout?.exercises.reduce(
      (total, exercise) =>
        total + exercise.completedSets.length,
      0
    ) ?? 0;

  const progress =
    totalSets > 0
      ? Math.round(
          (completedSets / totalSets) * 100
        )
      : 0;

  const allFinished =
    activeWorkout?.exercises.every(
      (exercise) =>
        exercise.skipped ||
        exercise.completedSets.length >=
          Number(exercise.target.sets)
    ) ?? false;

  const finishedToday = Boolean(todayWorkout);

  // ========================================
  // SESSION ACTIONS
  // ========================================

  function findNextExercise(currentId) {
    if (!activeWorkout) {
      return null;
    }

    const currentPosition =
      activeWorkout.exercises.findIndex(
        (exercise) =>
          getWorkoutExerciseKey(exercise) === currentId
      );

    const ordered = [
      ...activeWorkout.exercises.slice(
        currentPosition + 1
      ),
      ...activeWorkout.exercises.slice(
        0,
        currentPosition
      ),
    ];

    return (
      ordered.find(
        (exercise) =>
          !exercise.skipped &&
          exercise.completedSets.length <
            Number(exercise.target.sets)
      ) ?? null
    );
  }

  function handleStart() {
    if (
      !appliedPlan ||
      !selectedSession ||
      finishedToday
    ) {
      return;
    }

    const started = startWorkout({
      plan: appliedPlan,
      session: selectedSession,

      scheduledDayId:
        scheduledSession?.id === selectedSession.id
          ? todayId
          : null,
    });

    if (!started) return;

    setFocusedExerciseId(null);
    setFormError("");
    setSaveConflict(false);
  }

  function handleCompleteSet(event) {
    event.preventDefault();

    if (
      !activeWorkout ||
      !currentExercise ||
      currentExercise.skipped ||
      remainingSets === 0
    ) {
      return;
    }

    if (timedSetBusy) {
      setFormError(
        "Finish or stop the exercise timer first."
      );
      return;
    }

    const isTimed =
      target.targetType === "duration";

    const reps = isTimed
      ? null
      : Number(repsInput);

    const durationSeconds = isTimed
      ? Number(durationInput)
      : null;

    const weightText = weightInput
      .trim()
      .replace(",", ".");

    const weight =
      weightText === ""
        ? null
        : Number(weightText);

    if (
      !isTimed &&
      (
        !Number.isInteger(reps) ||
        reps < 1 ||
        reps > 100
      )
    ) {
      setFormError(
        "Enter a valid repetition count."
      );
      return;
    }

    if (
      isTimed &&
      (
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 1 ||
        durationSeconds > 3600
      )
    ) {
      setFormError(
        "Enter a valid duration in seconds."
      );
      return;
    }

    if (
      weight !== null &&
      (
        !Number.isFinite(weight) ||
        weight < 0
      )
    ) {
      setFormError(
        "Enter a valid weight or leave it blank."
      );
      return;
    }

    recordSet(
      getWorkoutExerciseKey(currentExercise),
      {
        reps,
        durationSeconds,
        weight,
      }
    );

    setFormError("");

    const completedAfter =
      completedForExercise + 1;

    if (completedAfter < plannedForExercise) {
      startRest(target.restSeconds);
      return;
    }

    clearRestTimer();

    const next = findNextExercise(
      getWorkoutExerciseKey(currentExercise)
    );

    if (next) {
      setFocusedExerciseId(getWorkoutExerciseKey(next));
    }
  }

  function handleUndo() {
    if (!currentExercise) {
      return;
    }

    undoLastSet(getWorkoutExerciseKey(currentExercise));
    clearRestTimer();
    setFormError("");
  }

  function handleSkipExercise() {
    if (!currentExercise) {
      return;
    }

    const wasSkipped = currentExercise.skipped;

    const next = wasSkipped
      ? null
      : findNextExercise(
          getWorkoutExerciseKey(currentExercise)
        );

    toggleSkipExercise(
      getWorkoutExerciseKey(currentExercise)
    );

    clearRestTimer();

    if (next) {
      setFocusedExerciseId(getWorkoutExerciseKey(next));
    }
  }

  function handleFinish() {
    if (!finishWorkout()) {
      setSaveConflict(true);
      setShowEarlyFinish(false);
      return;
    }

    setSaveConflict(false);
    setShowEarlyFinish(false);
    setShowDiscard(false);
    setFocusedExerciseId(null);
  }

  function handleDiscard() {
    discardWorkout();

    setShowEarlyFinish(false);
    setShowDiscard(false);
    setFocusedExerciseId(null);
  }

  function handleReviewSubmit(event) {
    event.preventDefault();

    if (!reviewDifficulty || !reviewTechnique) {
      return;
    }

    submitTrainingReview({
      difficulty: reviewDifficulty,
      technique: reviewTechnique,
    });

    setReviewDifficulty("");
    setReviewTechnique("");
  }

  // ========================================
  // PAGE
  // ========================================

  return (
    <div className="today-workout-page">

      {/* ==================================
          BRAND HEADER
      ================================== */}

      <header className="today-simple-heading">
        <Link to="/workouts">
          ← Workouts
        </Link>

        <span>GYM</span>
      </header>

      {/* ==================================
          BEFORE WORKOUT
      ================================== */}

      {!activeWorkout && (
        <>
          {finishedToday && (
            <section className="today-finished-card">
              <div className="today-finished-icon">
                ✓
              </div>

              <h1>
                {todayWorkout.status === "completed"
                  ? "Workout Complete!"
                  : "Session Saved"}
              </h1>

              <p>
                {todayWorkout.sessionName}
                {" · "}
                {todayWorkout.totalCompletedSets}
                {" "}sets recorded
              </p>

              <p className="today-small-note">
                One workout per day. To repeat today's workout,
                delete the saved record from Workout History first.
              </p>

              <Link to={`/progress/history/${encodeURIComponent(todayWorkout.id)}`}>
                View Saved Workout →
              </Link>

              <Link to="/">
                Back to Home →
              </Link>
            </section>
          )}

          {finishedToday ? null : !appliedPlan ? (
            <section className="today-simple-card">
              <h1>No Workout Plan Yet</h1>

              <p>
                Choose a recommended plan or
                create your own workout.
              </p>

              <Link
                className="today-main-link"
                to="/workouts/plans"
              >
                Explore Plans
              </Link>
            </section>
          ) : (
            <section className="today-simple-card">
              <span className="today-simple-eyebrow">
                READY TO TRAIN
              </span>

              <h1>
                {selectedSession?.name ?? "Workout"}
              </h1>

              <p>{appliedPlan.name}</p>

              <div className="today-session-picker">
                <label htmlFor="todaySession">
                  Select Session
                </label>

                <select
                  id="todaySession"
                  value={selectedSession?.id ?? ""}
                  onChange={(event) =>
                    setSelectionOverride({
                      plan: appliedPlan,
                      scheduledId: preferredSessionId,
                      dayKey: calendarDayKey,
                      id: event.target.value,
                    })
                  }
                >
                  {appliedPlan.sessions.map(
                    (session) => (
                      <option
                        key={session.id}
                        value={session.id}
                      >
                        {session.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {weeklySchedule?.mode === 'rolling' && (
                  <p className="today-small-note">
                    Rolling cycle: {weeklySchedule.rolling.trainingDays} training days,
                    {' '}{weeklySchedule.rolling.restDays} rest days.
                    {todaySchedule?.activity === 'workout' ? ' Today follows the selected rotation.' :
                      todaySchedule?.activity === 'not-started' ? ' The cycle has not started yet.' : ' Today is a scheduled rest day.'}
                  </p>
                )}

              {scheduleMatches &&
                todaySchedule?.activity !== "workout" && (
                  <p className="today-small-note">
                    Today is a scheduled rest or
                    recovery day. Starting a
                    workout is optional.
                  </p>
                )}

              {/* Exercises before starting */}

              <div className="today-start-list">
                
{selectedSession &&
                  getExerciseEntries(
                    selectedSession
                  ).map((entry, index) => {
                    const exerciseId =
                      entry.exerciseId;

                    const exercise =
                      findExercise(exerciseId);

                    const exerciseTarget =
                      entry.target;

                    return (
                      <div
                        key={entry.entryId}
                        className="today-start-item"
                      >
                        <span className="today-start-number">
                          {index + 1}
                        </span>

                        <ExerciseMotionPreview
                          exerciseId={exerciseId}
                          exerciseName={
                            exercise?.name ?? "Exercise"
                          }
                          variant="thumbnail"
                        />

                        <div className="today-start-info">
                          <strong>
                            {exercise?.name ?? "Exercise"}
                          </strong>

                          <small>
                            {exerciseTarget.sets}
                            {" "}sets ·{" "}
                            {describeTarget(exerciseTarget)}
                          </small>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="today-main-button"
                disabled={
                  !selectedSession?.exerciseIds.length
                }
                onClick={handleStart}
              >
                Start Workout
              </button>
            </section>
          )}
        </>
      )}

      {/* ==================================
          ACTIVE WORKOUT
      ================================== */}

      {activeWorkout && currentExercise && (
        <>
          {saveConflict && (
            <section
              className="today-simple-card"
              role="alert"
            >
              <p>
                A workout is already saved for this training day.
                Your active workout remains intact.
                To save it, delete the earlier record
                in Workout History first.
              </p>

              <Link to="/progress/history">
                Open Workout History →
              </Link>
            </section>
          )}

          <section className="today-active-top">
            <div className="today-active-meta">
              <span>
                {activeWorkout.sessionName}
              </span>

              <strong>
                {completedSets}/{totalSets}
                {" "}sets
              </strong>
            </div>

            <div className="today-mini-progress">
              <div
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </section>

          {/* ==================================
              FINISHED ALL EXERCISES
          ================================== */}

          {allFinished ? (
            <section className="today-simple-card today-ready-finish">
              <div className="today-finished-icon">
                ✓
              </div>

              <h1>All Exercises Finished</h1>

              <p>
                You recorded {completedSets}
                {" "}of {totalSets} planned sets.
              </p>

              {completedSets > 0 ? (
                <button
                  type="button"
                  className="today-main-button"
                  onClick={handleFinish}
                >
                  Finish Workout
                </button>
              ) : (
                <button
                  type="button"
                  className="today-danger-button"
                  onClick={() =>
                    setShowDiscard(true)
                  }
                >
                  Discard Empty Workout
                </button>
              )}

              {/* Review Exercises */}

              <details className="today-more-options">
                <summary>
                  Review Exercises
                </summary>

                <div className="today-options-content">
                  {activeWorkout.exercises.map(
                    (exercise) => {
                      const name =
                        findExercise(
                          exercise.exerciseId
                        )?.name ??
                        exercise.exerciseId;

                      return (
                        <div
                          key={getWorkoutExerciseKey(exercise)}
                          className="today-option-group"
                        >
                          <div className="today-review-exercise-heading">
                            <ExerciseMotionPreview
                              exerciseId={
                                exercise.exerciseId
                              }
                              exerciseName={name}
                              variant="thumbnail"
                            />

                            <div className="today-review-exercise-info">
                              <strong>{name}</strong>

                              <span>
                                {exercise.completedSets.length}
                                {" "}of{" "}
                                {exercise.target.sets}
                                {" "}sets recorded
                              </span>
                            </div>
                          </div>

                          {exercise.skipped ? (
                            <button
                              type="button"
                              className="today-secondary-button"
                              onClick={() => {
                                toggleSkipExercise(
                                  getWorkoutExerciseKey(exercise)
                                );

                                setFocusedExerciseId(getWorkoutExerciseKey(exercise));
                              }}
                            >
                              Restore Exercise
                            </button>
                          ) : (
                            exercise.completedSets.length >
                              0 && (
                              <button
                                type="button"
                                className="today-secondary-button"
                                onClick={() => {
                                  undoLastSet(
                                    getWorkoutExerciseKey(exercise)
                                  );

                                  setFocusedExerciseId(getWorkoutExerciseKey(exercise));
                                }}
                              >
                                Undo Last Set
                              </button>
                            )
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </details>
            </section>
          ) : (

            /* ==================================
                CURRENT EXERCISE
            ================================== */

            <section className="today-simple-card today-exercise-card">
              <div className="today-exercise-count">
                Exercise {currentIndex + 1}
                {" "}of{" "}
                {activeWorkout.exercises.length}
              </div>

              <div className="today-active-exercise-heading">
                <ExerciseMotionPreview
                  exerciseId={
                    currentExercise.exerciseId
                  }
                  exerciseName={
                    exerciseInfo?.name ?? "Exercise"
                  }
                  variant="thumbnail"
                />

                <div>
                  <h1>
                    {exerciseInfo?.name ?? "Exercise"}
                  </h1>

                  <p>{describeTarget(target)}</p>

                  <Link
                    to={`/exercises/${currentExercise.exerciseId}`}
                  >
                    View Guide
                  </Link>
                </div>
              </div>

              {/* Remaining Sets */}

              <div className="today-set-count">
                <strong>{remainingSets}</strong>

                <span>
                  {remainingSets === 1
                    ? "set remaining"
                    : "sets remaining"}
                </span>
              </div>

              {/* Set Progress */}

              <div className="today-set-dots">
                {Array.from(
                  { length: plannedForExercise },
                  (_, index) => (
                    <span
                      key={index}
                      className={
                        index < completedForExercise
                          ? "is-complete"
                          : ""
                      }
                    >
                      {index < completedForExercise
                        ? "✓"
                        : index + 1}
                    </span>
                  )
                )}
              </div>

              {/* Timed Exercises */}

              {target.targetType === "duration" &&
                !currentExercise.skipped &&
                remainingSets > 0 && (
                <TimedSetTimer
                  workoutId={activeWorkout.id}
                  exerciseId={
                    getWorkoutExerciseKey(currentExercise)
                  }
                  setNumber={
                    completedForExercise + 1
                  }
                  targetSeconds={
                    Number(target.durationSeconds)
                  }
                  onDurationChange={
                    setDurationInput
                  }
                />
              )}

              {/* Quick Set Form */}

              {!currentExercise.skipped &&
                remainingSets > 0 && (
                <form
                  className="today-quick-form"
                  onSubmit={handleCompleteSet}
                >
                  <div className="today-quick-fields">
                    {target.targetType ===
                    "duration" ? (
                      <label>
                        Actual Seconds

                        <input
                          type="number"
                          min="1"
                          max="3600"
                          step="1"
                          value={durationInput}
                          disabled={timedSetBusy}
                          onChange={(event) =>
                            setDurationInput(
                              event.target.value
                            )
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        Reps

                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={repsInput}
                          onChange={(event) =>
                            setRepsInput(
                              event.target.value
                            )
                          }
                        />
                      </label>
                    )}

                    <label>
                      Weight ({activeWorkout.weightUnit})

                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Optional"
                        value={weightInput}
                        onChange={(event) =>
                          setWeightInput(
                            event.target.value
                          )
                        }
                      />
                    </label>
                  </div>

                  {formError && (
                    <p
                      className="today-error"
                      role="alert"
                    >
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="today-main-button"
                    disabled={timedSetBusy}
                  >
                    {timedSetBusy
                      ? "Finish Timer First"
                      : `✓ Complete Set ${
                          completedForExercise + 1
                        }`}
                  </button>
                </form>
              )}

              {currentExercise.skipped && (
                <p className="today-small-note">
                  This exercise is skipped.
                  Restore it in More Options
                  to continue.
                </p>
              )}

              {remainingSets === 0 &&
                !currentExercise.skipped && (
                <>
                  <p className="today-small-note">
                    All sets recorded for
                    this exercise.
                  </p>

                  <button
                    type="button"
                    className="today-main-button"
                    onClick={() => {
                      const next = findNextExercise(
                        getWorkoutExerciseKey(currentExercise)
                      );

                      if (next) {
                        setFocusedExerciseId(getWorkoutExerciseKey(next));
                      }
                    }}
                  >
                    Next Exercise →
                  </button>
                </>
              )}

              {/* ==================================
                  MORE OPTIONS
              ================================== */}

              <details className="today-more-options">
                <summary>More Options</summary>

                <div className="today-options-content">
                  <div className="today-option-group">
                    <strong>
                      Change Exercise
                    </strong>

                    <div className="today-exercise-picker">
                      {activeWorkout.exercises.map(
                        (exercise) => {
                          const exerciseName =
                            findExercise(
                              exercise.exerciseId
                            )?.name ??
                            exercise.exerciseId;

                          const isSelected =
                            getWorkoutExerciseKey(currentExercise) ===
                             getWorkoutExerciseKey(exercise);

                          return (
                            <button
                              type="button"
                              key={getWorkoutExerciseKey(exercise)}
                              className={
                                isSelected
                                  ? "selected"
                                  : ""
                              }
                              aria-pressed={isSelected}
                              onClick={() => {
                                setFocusedExerciseId(getWorkoutExerciseKey(exercise));

                                clearRestTimer();
                              }}
                            >
                              <ExerciseMotionPreview
                                exerciseId={
                                  exercise.exerciseId
                                }
                                exerciseName={
                                  exerciseName
                                }
                                variant="thumbnail"
                              />

                              <span>{exerciseName}</span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {completedForExercise > 0 && (
                    <button
                      type="button"
                      className="today-secondary-button"
                      onClick={handleUndo}
                    >
                      Undo Last Set
                    </button>
                  )}

                  {remainingSets > 0 && (
                    <button
                      type="button"
                      className="today-secondary-button"
                      onClick={handleSkipExercise}
                    >
                      {currentExercise.skipped
                        ? "Restore Exercise"
                        : "Skip Exercise"}
                    </button>
                  )}

                  {completedSets > 0 && (
                    <button
                      type="button"
                      className="today-secondary-button"
                      onClick={() =>
                        setShowEarlyFinish(true)
                      }
                    >
                      Finish Early
                    </button>
                  )}

                  <button
                    type="button"
                    className="today-danger-button"
                    onClick={() =>
                      setShowDiscard(true)
                    }
                  >
                    Discard Workout
                  </button>
                </div>
              </details>
            </section>
          )}

          {/* ==================================
              FINISH EARLY DIALOG
          ================================== */}

          {showEarlyFinish && (
            <div className="today-dialog-backdrop">
              <section
                className="today-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="earlyFinishTitle"
              >
                <h2 id="earlyFinishTitle">
                  Finish Early?
                </h2>

                <p>
                  Your completed sets will be
                  saved as a partial workout.
                </p>

                <button
                  type="button"
                  className="today-main-button"
                  onClick={handleFinish}
                >
                  Save Partial Workout
                </button>

                <button
                  type="button"
                  className="today-secondary-button"
                  onClick={() =>
                    setShowEarlyFinish(false)
                  }
                >
                  Keep Training
                </button>
              </section>
            </div>
          )}

          {/* ==================================
              DISCARD DIALOG
          ================================== */}

          {showDiscard && (
            <div className="today-dialog-backdrop">
              <section
                className="today-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="discardTitle"
              >
                <h2 id="discardTitle">
                  Discard Workout?
                </h2>

                <p>
                  The sets recorded in this
                  session will be lost.
                </p>

                <button
                  type="button"
                  className="today-danger-button"
                  onClick={handleDiscard}
                >
                  Confirm Discard
                </button>

                <button
                  type="button"
                  className="today-secondary-button"
                  onClick={() =>
                    setShowDiscard(false)
                  }
                >
                  Cancel
                </button>
              </section>
            </div>
          )}
        </>
      )}

      {/* ==================================
          REST TIMER
      ================================== */}

      {activeWorkout &&
        restTimer.status !== "idle" && (
        <div className="today-dialog-backdrop">
          <section
            className="today-dialog today-rest-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restTitle"
          >
            <span className="today-simple-eyebrow">
              RECOVERY
            </span>

            <h2 id="restTitle">
              {restTimer.status === "done"
                ? "Rest Complete"
                : "Rest Between Sets"}
            </h2>

            <div className="today-big-timer">
              {restTimer.status === "done"
                ? "00:00"
                : formatTime(restSecondsLeft)}
            </div>

            <p>
              Take the time you need
              before continuing.
            </p>

            <button
              type="button"
              className="today-main-button"
              onClick={clearRestTimer}
            >
              {restTimer.status === "done"
                ? "Continue Workout"
                : "Skip Rest"}
            </button>

            {restTimer.status !== "done" && (
              <div className="today-timer-actions">
                <button
                  type="button"
                  onClick={
                    restTimer.status === "running"
                      ? pauseRest
                      : resumeRest
                  }
                >
                  {restTimer.status === "running"
                    ? "Pause"
                    : "Resume"}
                </button>

                <button
                  type="button"
                  onClick={() => addRestTime(30)}
                >
                  +30 sec
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================================
          TRAINING REVIEW
      ================================== */}

      {!activeWorkout && reviewOpen && (
        <div className="today-dialog-backdrop">
          <form
            className="today-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reviewTitle"
            onSubmit={handleReviewSubmit}
          >
            <span className="today-simple-eyebrow">
              TRAINING CHECK-IN
            </span>

            <h2 id="reviewTitle">
              How Has Training Been?
            </h2>

            <p>
              A quick review of your recent
              workouts. You can skip it.
            </p>

            <label className="today-review-field">
              Overall Difficulty

              <select
                required
                value={reviewDifficulty}
                onChange={(event) =>
                  setReviewDifficulty(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select an option
                </option>

                <option value="easy">
                  Too Easy
                </option>

                <option value="appropriate">
                  Appropriate
                </option>

                <option value="hard">
                  Too Hard
                </option>
              </select>
            </label>

            <label className="today-review-field">
              Were You Generally Able to
              Maintain Good Technique?

              <select
                required
                value={reviewTechnique}
                onChange={(event) =>
                  setReviewTechnique(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select an option
                </option>

                <option value="yes">
                  Yes
                </option>

                <option value="unsure">
                  Not Sure
                </option>

                <option value="no">
                  No
                </option>
              </select>
            </label>

            <button
              type="submit"
              className="today-main-button"
            >
              Save Feedback
            </button>

            <button
              type="button"
              className="today-secondary-button"
              onClick={dismissTrainingReview}
            >
              Not Now
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

export default TodaysWorkoutPage;
