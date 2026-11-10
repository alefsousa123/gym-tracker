
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { exercises } from "../data/exercises";
import { daysOfWeek } from "../data/workoutSplits";

import {
  normalizeExerciseTarget,
} from "../utils/workoutTargets";

import ExerciseMotionPreview from "../components/exercises/ExerciseMotionPreview";
import TimedSetTimer from "../components/workouts/TimedSetTimer";

import {
  useWorkoutPlan,
} from "../context/WorkoutPlanContext";

import {
  useWeeklySchedule,
} from "../context/WeeklyScheduleContext";

import {
  useWorkoutSession,
} from "../context/WorkoutSessionContext";

import "./TodaysWorkoutPage.css";

function findExercise(id) {
  return exercises.find(
    (exercise) => exercise.id === id
  );
}

function formatTime(seconds) {
  const safe = Math.max(
    0,
    Math.ceil(seconds)
  );

  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;

  return (
    `${String(minutes).padStart(2, "0")}:` +
    String(remainder).padStart(2, "0")
  );
}

function describeTarget(target) {
  return target.targetType === "duration"
    ? `${target.durationSeconds} sec`
    : `${target.minReps}–${target.maxReps} reps`;
}

function getDayId() {
  const index =
    (new Date().getDay() + 6) % 7;

  return daysOfWeek[index].id;
}

function TodaysWorkoutPage() {
  const { appliedPlan } = useWorkoutPlan();

  const { weeklySchedule } =
    useWeeklySchedule();

  const {
    activeWorkout,
    lastWorkout,
    restTimer,
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

  const todayId = getDayId();

  const todaySchedule =
    weeklySchedule?.days.find(
      (day) => day.dayId === todayId
    );

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

  const [selectedSessionId, setSelectedSessionId] =
    useState(
      scheduledSession?.id ??
      appliedPlan?.sessions[0]?.id ??
      ""
    );

  const selectedSession =
    appliedPlan?.sessions.find(
      (session) =>
        session.id === selectedSessionId
    ) ?? appliedPlan?.sessions[0];

  const [focusedExerciseId, setFocusedExerciseId] =
    useState(null);

  const currentExercise =
    activeWorkout?.exercises.find(
      (exercise) =>
        exercise.exerciseId === focusedExerciseId
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

  const currentCompleted =
    currentExercise?.completedSets.length ?? 0;

  const currentPlanned =
    Number(target?.sets ?? 0);

  const remainingSets = Math.max(
    0,
    currentPlanned - currentCompleted
  );

  const [repsInput, setRepsInput] =
    useState("");

  const [durationInput, setDurationInput] =
    useState("");

  const [weightInput, setWeightInput] =
    useState("");

  // Prevent recording a timed set before its timer
  // is finished or explicitly stopped.
  const [holdTimerBusy, setHoldTimerBusy] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [showEarlyFinish, setShowEarlyFinish] =
    useState(false);

  const [showDiscard, setShowDiscard] =
    useState(false);

  const [reviewDifficulty, setReviewDifficulty] =
    useState("");

  const [reviewTechnique, setReviewTechnique] =
    useState("");

  // Initialize the inputs for each exercise and set.
  useEffect(() => {
    if (!currentExercise) {
      return;
    }

    const currentTarget = currentExercise.target;

    const lastSet =
      currentExercise.completedSets.at(-1);

    setRepsInput(
      String(
        lastSet?.reps ??
        currentTarget.maxReps ??
        12
      )
    );

    setDurationInput(
      String(
        lastSet?.durationSeconds ??
        currentTarget.durationSeconds ??
        30
      )
    );

    const initialWeight =
      lastSet?.weight ??
      currentTarget.weight;

    setWeightInput(
      initialWeight === "" ||
      initialWeight === null ||
      initialWeight === undefined
        ? ""
        : String(initialWeight)
    );

    setHoldTimerBusy(false);
    setFormError("");
  }, [
    activeWorkout?.id,
    currentExercise?.exerciseId,
    currentCompleted,
  ]);

  // Update the visible rest clock.
  const [now, setNow] = useState(
    Date.now()
  );

  useEffect(() => {
    if (restTimer.status !== "running") {
      return;
    }

    setNow(Date.now());

    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(intervalId);
  }, [
    restTimer.status,
    restTimer.endsAt,
  ]);

  const secondsLeft =
    restTimer.status === "running"
      ? Math.max(
          0,
          Math.ceil(
            (restTimer.endsAt - now) / 1000
          )
        )
      : restTimer.remainingSeconds;

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

  const currentIndex =
    activeWorkout?.exercises.findIndex(
      (exercise) =>
        exercise.exerciseId ===
        currentExercise?.exerciseId
    ) ?? -1;

  const finishedToday =
    Boolean(lastWorkout?.finishedAt) &&
    new Date(
      lastWorkout.finishedAt
    ).toDateString() ===
      new Date().toDateString();

  // Find the next exercise with unfinished sets.
  function findNextExercise(currentId) {
    if (!activeWorkout) {
      return null;
    }

    const currentPosition =
      activeWorkout.exercises.findIndex(
        (exercise) =>
          exercise.exerciseId === currentId
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
    if (!appliedPlan || !selectedSession) {
      return;
    }

    startWorkout({
      plan: appliedPlan,
      session: selectedSession,

      scheduledDayId:
        scheduledSession?.id === selectedSession.id
          ? todayId
          : null,
    });

    setFocusedExerciseId(null);
    setFormError("");
  }

  // Record a completed set.
  function handleCompleteSet(event) {
    event.preventDefault();

    if (
      !currentExercise ||
      currentExercise.skipped ||
      remainingSets === 0
    ) {
      return;
    }

    if (holdTimerBusy) {
      setFormError(
        "Finish or stop the exercise timer before recording this set."
      );

      return;
    }

    const timed =
      target.targetType === "duration";

    const reps = timed
      ? null
      : Number(repsInput);

    const durationSeconds = timed
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
      !timed &&
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
      timed &&
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
      currentExercise.exerciseId,
      {
        reps,
        durationSeconds,
        weight,
      }
    );

    setFormError("");

    const completedAfter =
      currentCompleted + 1;

    const moreSets =
      completedAfter < currentPlanned;

    if (moreSets) {
      // Rest starts after the exercise is recorded.
      startRest(target.restSeconds);
      return;
    }

    clearRestTimer();

    const next = findNextExercise(
      currentExercise.exerciseId
    );

    if (next) {
      setFocusedExerciseId(
        next.exerciseId
      );
    }
  }

  function handleUndo() {
    if (!currentExercise) {
      return;
    }

    undoLastSet(
      currentExercise.exerciseId
    );

    clearRestTimer();
    setFormError("");
  }

  function handleSkipExercise() {
    if (!currentExercise) {
      return;
    }

    const wasSkipped =
      currentExercise.skipped;

    const next = wasSkipped
      ? null
      : findNextExercise(
          currentExercise.exerciseId
        );

    toggleSkipExercise(
      currentExercise.exerciseId
    );

    clearRestTimer();

    if (next) {
      setFocusedExerciseId(
        next.exerciseId
      );
    }
  }

  function handleFinish() {
    finishWorkout();

    setShowEarlyFinish(false);
    setShowDiscard(false);
    setFocusedExerciseId(null);
    setHoldTimerBusy(false);
  }

  function handleDiscard() {
    discardWorkout();

    setShowDiscard(false);
    setShowEarlyFinish(false);
    setFocusedExerciseId(null);
    setHoldTimerBusy(false);
  }

  function handleReviewSubmit(event) {
    event.preventDefault();

    if (
      !reviewDifficulty ||
      !reviewTechnique
    ) {
      return;
    }

    submitTrainingReview({
      difficulty: reviewDifficulty,
      technique: reviewTechnique,
    });

    setReviewDifficulty("");
    setReviewTechnique("");
  }

  return (
    <div className="today-workout-page">
      <header className="today-simple-heading">
        <Link to="/workouts">
          ← Workouts
        </Link>

        <span>GYM TRACKER</span>
      </header>

      {/* ======================================
          BEFORE STARTING A WORKOUT
      ====================================== */}

      {!activeWorkout && (
        <>
          {finishedToday && (
            <section className="today-finished-card">
              <div className="today-finished-icon">
                ✓
              </div>

              <h1>
                {lastWorkout.status === "completed"
                  ? "Workout Complete!"
                  : "Session Saved"}
              </h1>

              <p>
                {lastWorkout.sessionName}
                {" · "}
                {lastWorkout.totalCompletedSets}
                {" "}sets recorded
              </p>

              <Link to="/">
                Back to Home →
              </Link>
            </section>
          )}

          {!appliedPlan ? (
            <section className="today-simple-card">
              <h1>No Workout Plan Yet</h1>

              <p>
                Choose a recommended plan
                or create your own workout.
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
                {selectedSession?.name ??
                  "Workout"}
              </h1>

              <p>{appliedPlan.name}</p>

              <div className="today-session-picker">
                <label htmlFor="todaySession">
                  Select Session
                </label>

                <select
                  id="todaySession"
                  value={
                    selectedSession?.id ?? ""
                  }
                  onChange={(event) =>
                    setSelectedSessionId(
                      event.target.value
                    )
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

              {scheduleMatches &&
                todaySchedule?.activity !==
                  "workout" && (
                  <p className="today-small-note">
                    Today is a scheduled rest or
                    recovery day. Starting a
                    session is optional.
                  </p>
                )}

              <div className="today-start-list">
                {selectedSession?.exerciseIds.map(
                  (exerciseId, index) => {
                    const exercise =
                      findExercise(exerciseId);

                    const exerciseTarget =
                      normalizeExerciseTarget(
                        exerciseId,
                        selectedSession
                          .exerciseTargets?.[
                            exerciseId
                          ]
                      );

                    return (
                      <div
                        key={exerciseId}
                        className="today-start-item"
                      >
                        <span>
                          {index + 1}
                        </span>

                        <div>
                          <strong>
                            {exercise?.name ??
                              "Exercise"}
                          </strong>

                          <small>
                            {exerciseTarget.sets}
                            {" "}sets ·{" "}
                            {describeTarget(
                              exerciseTarget
                            )}
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

      {/* ======================================
          ACTIVE WORKOUT
      ====================================== */}

      {activeWorkout && currentExercise && (
        <>
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

          {/* All exercises are complete or skipped */}
          {allFinished ? (
            <section className="today-simple-card today-ready-finish">
              <div className="today-finished-icon">
                ✓
              </div>

              <h1>
                All Exercises Finished
              </h1>

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
                          key={exercise.exerciseId}
                          className="today-option-group"
                        >
                          <strong>{name}</strong>

                          <p className="today-small-note">
                            {exercise.completedSets.length}
                            {" "}of{" "}
                            {exercise.target.sets}
                            {" "}sets recorded
                          </p>

                          {exercise.skipped ? (
                            <button
                              type="button"
                              className="today-secondary-button"
                              onClick={() => {
                                toggleSkipExercise(
                                  exercise.exerciseId
                                );

                                setFocusedExerciseId(
                                  exercise.exerciseId
                                );
                              }}
                            >
                              Restore Exercise
                            </button>
                          ) : (
                            exercise.completedSets.length > 0 && (
                              <button
                                type="button"
                                className="today-secondary-button"
                                onClick={() => {
                                  undoLastSet(
                                    exercise.exerciseId
                                  );

                                  setFocusedExerciseId(
                                    exercise.exerciseId
                                  );
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
                    exerciseInfo?.name ??
                    "Exercise"
                  }
                  variant="thumbnail"
                />

                <div>
                  <h1>
                    {exerciseInfo?.name ??
                      "Exercise"}
                  </h1>

                  <p>
                    {describeTarget(target)}
                  </p>

                  <Link
                    to={`/exercises/${currentExercise.exerciseId}`}
                  >
                    View Guide
                  </Link>
                </div>
              </div>

              <div className="today-set-count">
                <strong>
                  {remainingSets}
                </strong>

                <span>
                  {remainingSets === 1
                    ? "set remaining"
                    : "sets remaining"}
                </span>
              </div>

              <div className="today-set-dots">
                {Array.from(
                  { length: currentPlanned },
                  (_, index) => (
                    <span
                      key={index}
                      className={
                        index < currentCompleted
                          ? "is-complete"
                          : ""
                      }
                    >
                      {index < currentCompleted
                        ? "✓"
                        : index + 1}
                    </span>
                  )
                )}
              </div>

              {/* ======================================
                  TIMED EXERCISE
              ====================================== */}

              {target.targetType === "duration" &&
                !currentExercise.skipped &&
                remainingSets > 0 && (
                <TimedSetTimer
                  key={
                    `${currentExercise.exerciseId}-` +
                    currentCompleted
                  }
                  targetSeconds={
                    Number(target.durationSeconds)
                  }
                  onDurationChange={
                    setDurationInput
                  }
                  onBusyChange={
                    setHoldTimerBusy
                  }
                />
              )}

              {/* ======================================
                  QUICK SET FORM
              ====================================== */}

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
                        Weight (
                        {activeWorkout.weightUnit})
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
                      disabled={holdTimerBusy}
                    >
                      {holdTimerBusy
                        ? "Finish Timer First"
                        : `✓ Complete Set ${
                            currentCompleted + 1
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
                <p className="today-small-note">
                  All sets recorded for
                  this exercise.
                </p>
              )}

              {remainingSets === 0 &&
                !currentExercise.skipped && (
                <button
                  type="button"
                  className="today-main-button"
                  onClick={() => {
                    const next = findNextExercise(
                      currentExercise.exerciseId
                    );

                    if (next) {
                      setFocusedExerciseId(
                        next.exerciseId
                      );
                    }
                  }}
                >
                  Next Exercise →
                </button>
              )}

              {/* ======================================
                  MORE OPTIONS
              ====================================== */}

              <details className="today-more-options">
                <summary>
                  More Options
                </summary>

                <div className="today-options-content">
                  <div className="today-option-group">
                    <strong>
                      Change Exercise
                    </strong>

                    <div className="today-exercise-picker">
                      {activeWorkout.exercises.map(
                        (exercise) => (
                          <button
                            type="button"
                            key={exercise.exerciseId}
                            className={
                              currentExercise.exerciseId ===
                              exercise.exerciseId
                                ? "selected"
                                : ""
                            }
                            onClick={() => {
                              setFocusedExerciseId(
                                exercise.exerciseId
                              );

                              clearRestTimer();
                            }}
                          >
                            {findExercise(
                              exercise.exerciseId
                            )?.name ??
                              exercise.exerciseId}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {currentCompleted > 0 && (
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
                      onClick={
                        handleSkipExercise
                      }
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

          {/* ======================================
              EARLY FINISH CONFIRMATION
          ====================================== */}

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

          {/* ======================================
              DISCARD CONFIRMATION
          ====================================== */}

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

      {/* ======================================
          REST TIMER — FOREGROUND OVERLAY
      ====================================== */}

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
                  : formatTime(secondsLeft)}
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
                    onClick={() =>
                      addRestTime(30)
                    }
                  >
                    +30 sec
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

      {/* ======================================
          OPTIONAL BIWEEKLY REVIEW
      ====================================== */}

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
