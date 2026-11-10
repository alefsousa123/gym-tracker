
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  normalizeExerciseTarget,
} from "../utils/workoutTargets";

import {
  usePersistentState,
} from "../hooks/usePersistentState";

const WorkoutSessionContext = createContext(null);

const KEYS = {
  active: "gym-tracker:active-workout:v1",
  history: "gym-tracker:workout-history:v1",
  legacyLast: "gym-tracker:last-workout:v1",
  rest: "gym-tracker:rest-timer:v1",
  timed: "gym-tracker:timed-set:v1",
  review: "gym-tracker-training-review-v1",
};

const REVIEW_INTERVAL_MS =
  14 * 24 * 60 * 60 * 1000;

const emptyRestTimer = {
  status: "idle",
  endsAt: null,
  remainingSeconds: 0,
};

const emptyTimedTimer = {
  status: "idle",
  workoutId: null,
  exerciseId: null,
  setNumber: null,
  totalMs: 0,
  remainingMs: 0,
  elapsedMs: 0,
  endsAt: null,
};

const emptyReviewData = {
  firstCompletedAt: null,
  lastPromptedAt: null,
  entries: [],
};

// Validate the basic workout structure
function isWorkout(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.id === "string" &&
    typeof value.startedAt === "string" &&
    Array.isArray(value.exercises)
  );
}

function isOptionalWorkout(value) {
  return value === null || isWorkout(value);
}

function isFinishedWorkout(value) {
  return (
    isWorkout(value) &&
    typeof value.finishedAt === "string"
  );
}

function isValidHistory(value) {
  return (
    Array.isArray(value) &&
    value.every(isFinishedWorkout)
  );
}

function isTimer(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.status === "string"
  );
}

function isReviewData(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Array.isArray(value.entries)
  );
}

// Import the last saved workout from Stage 14
// only when no workout-history key exists.
function loadInitialHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      KEYS.legacyLast
    );

    if (!raw) {
      return [];
    }

    const previousWorkout = JSON.parse(raw);

    if (isFinishedWorkout(previousWorkout)) {
      return [previousWorkout];
    }

    return [];
  } catch {
    return [];
  }
}

export function WorkoutSessionProvider({
  children,
}) {
  // ========================================
  // PERSISTENT WORKOUT DATA
  // ========================================

  const [activeWorkout, setActiveWorkout] =
    usePersistentState(
      KEYS.active,
      null,
      isOptionalWorkout
    );

  const [workoutHistory, setWorkoutHistory] =
    usePersistentState(
      KEYS.history,
      loadInitialHistory,
      isValidHistory
    );

  // Newest workout first
  const sortedWorkoutHistory = [
    ...workoutHistory,
  ].sort(
    (first, second) =>
      Date.parse(second.finishedAt) -
      Date.parse(first.finishedAt)
  );

  // Existing pages can keep using lastWorkout
  const lastWorkout =
    sortedWorkoutHistory[0] ?? null;

  const [restTimer, setRestTimer] =
    usePersistentState(
      KEYS.rest,
      emptyRestTimer,
      isTimer
    );

  const [timedSetTimer, setTimedSetTimer] =
    usePersistentState(
      KEYS.timed,
      emptyTimedTimer,
      isTimer
    );

  const [reviewData, setReviewData] =
    usePersistentState(
      KEYS.review,
      emptyReviewData,
      isReviewData
    );

  const [reviewOpen, setReviewOpen] =
    useState(false);

  // ========================================
  // REST TIMER RECOVERY
  // ========================================

  useEffect(() => {
    if (restTimer.status !== "running") {
      return;
    }

    function checkDeadline() {
      setRestTimer((current) => {
        if (current.status !== "running") {
          return current;
        }

        if (
          Number.isFinite(current.endsAt) &&
          Date.now() < current.endsAt
        ) {
          return current;
        }

        return {
          status: "done",
          endsAt: null,
          remainingSeconds: 0,
        };
      });
    }

    checkDeadline();

    const intervalId = setInterval(
      checkDeadline,
      500
    );

    return () => clearInterval(intervalId);
  }, [restTimer.status, restTimer.endsAt]);

  // ========================================
  // TIMED EXERCISE RECOVERY
  // ========================================

  useEffect(() => {
    if (timedSetTimer.status !== "running") {
      return;
    }

    function checkDeadline() {
      setTimedSetTimer((current) => {
        if (current.status !== "running") {
          return current;
        }

        if (
          Number.isFinite(current.endsAt) &&
          Date.now() < current.endsAt
        ) {
          return current;
        }

        return {
          ...current,
          status: "finished",
          endsAt: null,
          remainingMs: 0,
          elapsedMs: current.totalMs,
        };
      });
    }

    checkDeadline();

    const intervalId = setInterval(
      checkDeadline,
      250
    );

    return () => clearInterval(intervalId);
  }, [
    timedSetTimer.status,
    timedSetTimer.endsAt,
  ]);

  // ========================================
  // START A WORKOUT
  // ========================================

  function startWorkout({
    plan,
    session,
    scheduledDayId = null,
  }) {
    if (
      activeWorkout ||
      !plan ||
      !session?.exerciseIds?.length
    ) {
      return;
    }

    const workoutExercises =
      session.exerciseIds.map((exerciseId) => ({
        exerciseId,

        target: normalizeExerciseTarget(
          exerciseId,
          session.exerciseTargets?.[exerciseId]
        ),

        completedSets: [],
        skipped: false,
      }));

    setActiveWorkout({
      id: `workout-${Date.now()}`,
      startedAt: new Date().toISOString(),

      planName: plan.name,
      sessionId: session.id,
      sessionName: session.name,
      splitId: plan.splitId,
      location: plan.location,
      weightUnit: plan.weightUnit ?? "kg",

      scheduledDayId,
      exercises: workoutExercises,
    });

    setRestTimer(emptyRestTimer);
    setTimedSetTimer(emptyTimedTimer);
  }

  // ========================================
  // RECORD A SET
  // ========================================

  function recordSet(exerciseId, setData) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) => {
            if (
              exercise.exerciseId !== exerciseId ||
              exercise.skipped ||
              exercise.completedSets.length >=
                Number(exercise.target.sets)
            ) {
              return exercise;
            }

            const newSet = {
              setNumber:
                exercise.completedSets.length + 1,

              completedAt:
                new Date().toISOString(),

              targetType:
                exercise.target.targetType,

              reps: setData.reps ?? null,
              durationSeconds:
                setData.durationSeconds ?? null,
              weight: setData.weight ?? null,

              effort: setData.effort ?? null,
              technique: setData.technique ?? null,
            };

            return {
              ...exercise,

              completedSets: [
                ...exercise.completedSets,
                newSet,
              ],
            };
          }
        ),
      };
    });

    setTimedSetTimer((current) =>
      current.exerciseId === exerciseId
        ? emptyTimedTimer
        : current
    );
  }

  function undoLastSet(exerciseId) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) =>
            exercise.exerciseId === exerciseId
              ? {
                  ...exercise,

                  completedSets:
                    exercise.completedSets.slice(
                      0,
                      -1
                    ),

                  skipped: false,
                }
              : exercise
        ),
      };
    });
  }

  function toggleSkipExercise(exerciseId) {
    setActiveWorkout((previousWorkout) => {
      if (!previousWorkout) {
        return previousWorkout;
      }

      return {
        ...previousWorkout,

        exercises: previousWorkout.exercises.map(
          (exercise) =>
            exercise.exerciseId === exerciseId
              ? {
                  ...exercise,
                  skipped: !exercise.skipped,
                }
              : exercise
        ),
      };
    });

    setTimedSetTimer((current) =>
      current.exerciseId === exerciseId
        ? emptyTimedTimer
        : current
    );
  }

  // ========================================
  // REST TIMER
  // ========================================

  function startRest(seconds) {
    const duration = Number(seconds);

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      setRestTimer(emptyRestTimer);
      return;
    }

    setRestTimer({
      status: "running",
      endsAt:
        Date.now() + duration * 1000,
      remainingSeconds: Math.ceil(duration),
    });
  }

  function pauseRest() {
    setRestTimer((current) => {
      if (current.status !== "running") {
        return current;
      }

      const remainingSeconds = Math.max(
        0,
        Math.ceil(
          (current.endsAt - Date.now()) / 1000
        )
      );

      return {
        status:
          remainingSeconds > 0
            ? "paused"
            : "done",
        endsAt: null,
        remainingSeconds,
      };
    });
  }

  function resumeRest() {
    setRestTimer((current) => {
      if (
        current.status !== "paused" ||
        current.remainingSeconds <= 0
      ) {
        return current;
      }

      return {
        ...current,
        status: "running",

        endsAt:
          Date.now() +
          current.remainingSeconds * 1000,
      };
    });
  }

  function addRestTime(seconds = 30) {
    const extra = Math.max(
      0,
      Math.floor(Number(seconds) || 0)
    );

    setRestTimer((current) => {
      if (current.status === "running") {
        return {
          ...current,

          endsAt:
            Math.max(
              Date.now(),
              current.endsAt
            ) +
            extra * 1000,
        };
      }

      if (current.status === "paused") {
        return {
          ...current,

          remainingSeconds:
            current.remainingSeconds + extra,
        };
      }

      return current;
    });
  }

  function clearRestTimer() {
    setRestTimer(emptyRestTimer);
  }

  // ========================================
  // TIMED EXERCISES
  // ========================================

  function startTimedSet({
    workoutId,
    exerciseId,
    setNumber,
    targetSeconds,
  }) {
    if (
      !activeWorkout ||
      activeWorkout.id !== workoutId
    ) {
      return;
    }

    const seconds = Math.max(
      1,
      Math.min(
        3600,
        Math.round(Number(targetSeconds) || 30)
      )
    );

    const totalMs = seconds * 1000;

    setTimedSetTimer({
      status: "running",
      workoutId,
      exerciseId,
      setNumber,

      totalMs,
      remainingMs: totalMs,
      elapsedMs: 0,
      endsAt: Date.now() + totalMs,
    });
  }

  function pauseTimedSet() {
    setTimedSetTimer((current) => {
      if (current.status !== "running") {
        return current;
      }

      const remainingMs = Math.max(
        0,
        current.endsAt - Date.now()
      );

      return {
        ...current,

        status:
          remainingMs > 0
            ? "paused"
            : "finished",

        endsAt: null,
        remainingMs,

        elapsedMs:
          current.totalMs - remainingMs,
      };
    });
  }

  function resumeTimedSet() {
    setTimedSetTimer((current) => {
      if (
        current.status !== "paused" ||
        current.remainingMs <= 0
      ) {
        return current;
      }

      return {
        ...current,
        status: "running",

        endsAt:
          Date.now() + current.remainingMs,
      };
    });
  }

  function stopTimedSet() {
    setTimedSetTimer((current) => {
      if (
        current.status !== "running" &&
        current.status !== "paused"
      ) {
        return current;
      }

      const remainingMs =
        current.status === "running"
          ? Math.max(
              0,
              current.endsAt - Date.now()
            )
          : current.remainingMs;

      return {
        ...current,
        status: "stopped",
        endsAt: null,
        remainingMs,

        elapsedMs:
          current.totalMs - remainingMs,
      };
    });
  }

  function clearTimedSet() {
    setTimedSetTimer(emptyTimedTimer);
  }

  // ========================================
  // FINISH WORKOUT AND SAVE HISTORY
  // ========================================

  function checkForTrainingReview(finishedAt) {
    const firstCompletedAt =
      reviewData.firstCompletedAt ??
      finishedAt;

    const referenceDate =
      reviewData.lastPromptedAt ??
      firstCompletedAt;

    const elapsed =
      Date.parse(finishedAt) -
      Date.parse(referenceDate);

    setReviewData((previous) => ({
      ...previous,

      firstCompletedAt:
        previous.firstCompletedAt ??
        finishedAt,
    }));

    if (
      Number.isFinite(elapsed) &&
      elapsed >= REVIEW_INTERVAL_MS
    ) {
      setReviewOpen(true);
    }
  }

  function finishWorkout() {
    if (!activeWorkout) {
      return;
    }

    const totalCompletedSets =
      activeWorkout.exercises.reduce(
        (total, exercise) =>
          total + exercise.completedSets.length,
        0
      );

    if (totalCompletedSets === 0) {
      return;
    }

    const fullyCompleted =
      activeWorkout.exercises.every(
        (exercise) =>
          !exercise.skipped &&
          exercise.completedSets.length ===
            Number(exercise.target.sets)
      );

    const finishedAt =
      new Date().toISOString();

    const completedWorkout = {
      ...activeWorkout,
      finishedAt,

      status: fullyCompleted
        ? "completed"
        : "partial",

      totalCompletedSets,
    };

    // Keep every finished workout, not only the last.
    setWorkoutHistory((previousHistory) => {
      const alreadySaved = previousHistory.some(
        (workout) =>
          workout.id === completedWorkout.id
      );

      if (alreadySaved) {
        return previousHistory;
      }

      return [
        completedWorkout,
        ...previousHistory,
      ];
    });

    setActiveWorkout(null);
    setRestTimer(emptyRestTimer);
    setTimedSetTimer(emptyTimedTimer);

    checkForTrainingReview(finishedAt);
  }

  function discardWorkout() {
    setActiveWorkout(null);
    setRestTimer(emptyRestTimer);
    setTimedSetTimer(emptyTimedTimer);
  }

  // ========================================
  // DELETE A HISTORY RECORD
  // ========================================

  function deleteWorkout(workoutId) {
    setWorkoutHistory((previousHistory) =>
      previousHistory.filter(
        (workout) => workout.id !== workoutId
      )
    );
  }

  // ========================================
  // OPTIONAL TRAINING REVIEW
  // ========================================

  function submitTrainingReview({
    difficulty,
    technique,
  }) {
    const now = new Date().toISOString();

    setReviewData((previous) => ({
      ...previous,
      lastPromptedAt: now,

      entries: [
        ...previous.entries,

        {
          id: `review-${Date.now()}`,
          date: now,
          difficulty,
          technique,
        },
      ],
    }));

    setReviewOpen(false);
  }

  function dismissTrainingReview() {
    setReviewData((previous) => ({
      ...previous,

      lastPromptedAt:
        new Date().toISOString(),
    }));

    setReviewOpen(false);
  }

  return (
    <WorkoutSessionContext.Provider
      value={{
        activeWorkout,

        workoutHistory:
          sortedWorkoutHistory,

        lastWorkout,

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

        startTimedSet,
        pauseTimedSet,
        resumeTimedSet,
        stopTimedSet,
        clearTimedSet,

        finishWorkout,
        discardWorkout,
        deleteWorkout,

        submitTrainingReview,
        dismissTrainingReview,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const context = useContext(
    WorkoutSessionContext
  );

  if (!context) {
    throw new Error(
      "useWorkoutSession must be used within a WorkoutSessionProvider."
    );
  }

  return context;
}
